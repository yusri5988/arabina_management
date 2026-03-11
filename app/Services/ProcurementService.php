<?php

namespace App\Services;

use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Package;
use App\Models\ProcurementOrderLine;
use App\Models\SalesOrder;
use App\Models\Bom;
use Illuminate\Support\Collection;

class ProcurementService
{
    public function getShortageSuggestions(string $scope): array
    {
        // 1. Get Incoming Stock (Ordered but not yet received)
        $incomingStock = ProcurementOrderLine::query()
            ->whereHas('procurementOrder', function ($q) {
                $q->whereIn('status', ['submitted', 'partial']);
            })
            ->whereHas('item', function ($query) use ($scope) {
                $query->where('bom_scope', $scope);
            })
            ->selectRaw('item_id, SUM(ordered_quantity - received_quantity) as incoming_qty')
            ->groupBy('item_id')
            ->pluck('incoming_qty', 'item_id')
            ->toArray();

        // 2. Calculate Gross SKU Demand from all open Sales Orders
        $openOrders = SalesOrder::query()
            ->whereIn('status', ['open', 'partial'])
            ->with([
                'lines.item:id,sku,name,unit,bom_scope',
                'lines.package.boms' => function ($query) use ($scope) {
                    $query->where('type', $scope)
                        ->with('bomItems.item:id,sku,name,unit,bom_scope');
                },
            ])
            ->get();

        $totalSkuDemandMap = [];
        $requestedPackagesMap = [];
        $sourceOrders = [];

        foreach ($openOrders as $so) {
            $soHasUncoveredDemand = false;
            $soDetail = [
                'id' => $so->id, 
                'code' => $so->code, 
                'customer' => $so->customer_name, 
                'packages' => [], 
                'loose_skus' => []
            ];
            
            foreach ($so->lines as $line) {
                if ($line->package_id) {
                    $qty = max(0, $this->normalize($line->package_quantity - $line->shipped_quantity));
                    $scopeBom = $this->getPackageBomForScope($line->package, $scope);

                    if ($qty > 0 && $scopeBom) {
                        $soDetail['packages'][] = ['code' => $line->package?->code, 'qty' => $qty];
                        $requestedPackagesMap[$line->package_id] = ($requestedPackagesMap[$line->package_id] ?? 0) + $qty;

                        foreach ($scopeBom->bomItems as $bomItem) {
                            $itemId = (int) $bomItem->item_id;
                            $needed = $this->normalize($qty * $bomItem->quantity);
                            $totalSkuDemandMap[$itemId] = $this->normalize(($totalSkuDemandMap[$itemId] ?? 0) + $needed);
                        }
                    }
                } elseif ($line->item_sku) {
                    $item = $line->item;
                    if ($item && (string) $item->bom_scope === $scope) {
                        $qty = max(0, $this->normalize($line->item_quantity - $line->shipped_quantity));
                        if ($qty > 0) {
                            $totalSkuDemandMap[$item->id] = $this->normalize(($totalSkuDemandMap[$item->id] ?? 0) + $qty);
                            $soDetail['loose_skus'][] = ['sku' => $line->item_sku, 'qty' => $qty];
                        }
                    }
                }
            }

            // Check if SO needs replenishment
            if ($this->orderHasUncoveredDemand($so, $totalSkuDemandMap, $incomingStock, $scope)) {
                $sourceOrders[] = $soDetail;
            }
        }

        $suggestion = [
            'package_lines' => [],
            'sku_lines' => [],
            'source_orders' => $sourceOrders,
        ];

        // 3. Fulfill shortages using requested packages
        foreach ($requestedPackagesMap as $pkgId => $qty) {
            $pkg = Package::with([
                'boms' => function ($query) use ($scope) {
                    $query->where('type', $scope)->with('bomItems.item:id,sku,name,unit,bom_scope');
                },
            ])->find($pkgId);

            if ($pkg) {
                $scopeBom = $this->getPackageBomForScope($pkg, $scope);
                if ($scopeBom && $this->packageNeedsOrdering($scopeBom, $totalSkuDemandMap, $incomingStock)) {
                    $suggestion['package_lines'][] = [
                        'package_id' => $pkg->id,
                        'code' => $pkg->code,
                        'name' => $pkg->name,
                        'quantity' => $qty,
                        'boms' => collect([$scopeBom])->map(fn($bom) => [
                            'type' => $bom->type,
                            'items' => $bom->bomItems->map(fn($bi) => [
                                'sku' => $bi->item?->sku,
                                'name' => $bi->item?->name,
                                'quantity' => $bi->quantity,
                            ]),
                        ]),
                    ];
                    
                    // Subtract from loose calculation
                    foreach ($scopeBom->bomItems as $bomItem) {
                        $itemId = (int) $bomItem->item_id;
                        if (isset($totalSkuDemandMap[$itemId])) {
                            $totalSkuDemandMap[$itemId] = $this->normalize($totalSkuDemandMap[$itemId] - ($qty * $bomItem->quantity));
                        }
                    }
                }
            }
        }

        // 4. Residual SKU Demand
        $itemIds = array_keys(array_filter($totalSkuDemandMap, fn($v) => $v > 0));
        if (!empty($itemIds)) {
            $itemsWithVariants = Item::with(['variants' => fn($q) => $q->whereNull('color')->orWhere('color', '')])
                ->whereIn('id', $itemIds)
                ->get();

            foreach ($itemsWithVariants as $item) {
                $residualDemand = $totalSkuDemandMap[$item->id];
                $stock = $item->variants->first()?->stock_current ?? 0;
                $incoming = $incomingStock[$item->id] ?? 0;
                $shortage = $residualDemand - $stock - $incoming;
                
                if ($shortage > 0) {
                    $suggestion['sku_lines'][] = [
                        'item_id' => $item->id,
                        'sku' => $item->sku,
                        'name' => $item->name,
                        'unit' => $item->unit,
                        'demand_qty' => $residualDemand,
                        'stock_qty' => $stock,
                        'incoming_qty' => $incoming,
                        'shortage_qty' => $shortage,
                    ];
                }
            }
        }

        return $suggestion;
    }

    public function calculatePackageAvailability(string $scope): array
    {
        $packages = Package::with(['boms' => function ($query) use ($scope) {
            $query->where('type', $scope)->with('bomItems.item.variants');
        }])->whereHas('boms', function ($query) use ($scope) {
            $query->where('type', $scope);
        })->get();

        $availability = [];

        foreach ($packages as $pkg) {
            $scopeBom = $this->getPackageBomForScope($pkg, $scope);
            if (!$scopeBom || $scopeBom->bomItems->isEmpty()) {
                $availability[$pkg->id] = 0;
                continue;
            }

            $maxPossible = null;

            foreach ($scopeBom->bomItems as $bomItem) {
                $item = $bomItem->item;
                if (!$item) continue;

                $stock = $item->variants->whereNull('color')->first()?->stock_current ?? 0;
                $neededPerPackage = (float) $bomItem->quantity;

                if ($neededPerPackage <= 0) continue;

                $canMake = floor($stock / $neededPerPackage);

                if ($maxPossible === null || $canMake < $maxPossible) {
                    $maxPossible = $canMake;
                }
            }

            $availability[$pkg->id] = $maxPossible ?? 0;
        }

        return $availability;
    }

    private function orderHasUncoveredDemand($so, $demandMap, $incomingMap, $scope): bool
    {
        foreach ($so->lines as $line) {
            $itemId = null;
            if ($line->package_id) {
                $scopeBom = $this->getPackageBomForScope($line->package, $scope);
                if ($scopeBom) {
                    foreach ($scopeBom->bomItems as $bi) {
                        if ($this->isShort((int)$bi->item_id, $demandMap, $incomingMap)) return true;
                    }
                }
            } elseif ($line->item_sku && $line->item && (string)$line->item->bom_scope === $scope) {
                if ($this->isShort((int)$line->item->id, $demandMap, $incomingMap)) return true;
            }
        }
        return false;
    }

    private function isShort(int $itemId, $demandMap, $incomingMap): bool
    {
        $needed = $demandMap[$itemId] ?? 0;
        if ($needed <= 0) return false;

        $stock = ItemVariant::where('item_id', $itemId)->whereNull('color')->first()?->stock_current ?? 0;
        $incoming = $incomingMap[$itemId] ?? 0;
        return ($stock + $incoming) < $needed;
    }

    private function packageNeedsOrdering($bom, $demandMap, $incomingMap): bool
    {
        foreach ($bom->bomItems as $bi) {
            if ($this->isShort((int)$bi->item_id, $demandMap, $incomingMap)) return true;
        }
        return false;
    }

    private function getPackageBomForScope($package, string $scope): ?Bom
    {
        if (!$package) return null;
        return $package->boms->firstWhere('type', $scope);
    }

    private function normalize($qty): float
    {
        return round((float)$qty, 4);
    }
}
