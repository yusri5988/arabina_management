<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\Item;
use App\Models\Supplier;
use App\Services\ProcessLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Barryvdh\DomPDF\Facade\Pdf;

class FinanceController extends Controller
{
    public function stockValue(Request $request): Response
    {
        $query = Item::with('variants')
            ->latest();

        if ($request->filled('bom_scope')) {
            $query->where('bom_scope', $request->input('bom_scope'));
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', (int) $request->input('supplier_id'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('sku', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $items = $query->get();

        $stockData = $items->map(function ($item) {
            $currentStock = (float) $item->variants->sum('stock_current');
            $avgCost = (float) $item->variants->avg('average_cost');
            $totalValue = (float) $item->variants->sum('total_stock_value');

            return [
                'id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'bom_scope' => $item->bom_scope,
                'unit' => $item->unit,
                'current_stock' => $currentStock,
                'average_cost' => $avgCost,
                'total_value' => $totalValue,
            ];
        });

        $totalValueAll = $stockData->sum('total_value');

        $suppliers = Supplier::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Finance/StockValue', [
            'stockData' => $stockData,
            'totalValueAll' => $totalValueAll,
            'suppliers' => $suppliers,
            'bomScopes' => [
                Bom::TYPE_CABIN => 'Cabin',
                Bom::TYPE_HARDWARE => 'Hardware',
                Bom::TYPE_HARDWARE_SITE => 'Hardware Site',
            ],
            'filters' => $request->only(['bom_scope', 'supplier_id', 'search']),
        ]);
    }

    public function stockValueExport(Request $request)
    {
        $query = Item::with('variants');

        if ($request->filled('bom_scope')) {
            $query->where('bom_scope', $request->input('bom_scope'));
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', (int) $request->input('supplier_id'));
        }

        $items = $query->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Stock Value');

        $headers = [
            'SKU',
            'Item Name',
            'Unit',
            'Current Stock',
            'Avg Cost (MYR)',
            'Total Value (MYR)',
        ];

        $sheet->fromArray($headers, null, 'A1');

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['argb' => 'FFFFFFFF'],
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF1B580E'],
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
            ],
        ];
        $sheet->getStyle('A1:F1')->applyFromArray($headerStyle);

        $bomGroups = [
            Bom::TYPE_CABIN => 'BOM Cabin',
            Bom::TYPE_HARDWARE => 'BOM Hardware',
            Bom::TYPE_HARDWARE_SITE => 'BOM Hardware Site',
        ];

        $bomColors = [
            Bom::TYPE_CABIN => 'FFFEF3C7',
            Bom::TYPE_HARDWARE => 'FFD1FAE5',
            Bom::TYPE_HARDWARE_SITE => 'FFE0F2FE',
        ];

        $row = 2;
        $grandTotal = 0;
        $lastDataRow = 1;

        foreach ($bomGroups as $key => $label) {
            $groupItems = $items->filter(fn ($item) => ($item->bom_scope ?: 'hardware') === $key);

            if ($groupItems->isEmpty()) {
                continue;
            }

            $sheet->setCellValue('A' . $row, $label);
            $sheet->mergeCells('A' . $row . ':F' . $row);
            $sheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
                'font' => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FF1B580E']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => $bomColors[$key]],
                ],
                'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT],
            ]);
            $row++;

            $subtotal = 0;

            foreach ($groupItems as $item) {
                $currentStock = (float) $item->variants->sum('stock_current');
                $avgCost = (float) $item->variants->avg('average_cost');
                $itemTotalValue = (float) $item->variants->sum('total_stock_value');
                $subtotal += $itemTotalValue;

                $sheet->setCellValue('A' . $row, $item->sku);
                $sheet->setCellValue('B' . $row, $item->name);
                $sheet->setCellValue('C' . $row, strtoupper($item->unit));
                $sheet->setCellValue('D' . $row, $currentStock);
                $sheet->setCellValue('E' . $row, $avgCost);
                $sheet->setCellValue('F' . $row, $itemTotalValue);
                $row++;
            }

            $sheet->setCellValue('A' . $row, $label . ' Subtotal');
            $sheet->mergeCells('A' . $row . ':E' . $row);
            $sheet->setCellValue('F' . $row, $subtotal);
            $sheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
                'font' => ['bold' => true, 'italic' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => $bomColors[$key]],
                ],
            ]);
            $row++;

            $grandTotal += $subtotal;
            $lastDataRow = $row - 1;
        }

        $sheet->setCellValue('A' . $row, 'GRAND TOTAL (ALL BOM)');
        $sheet->mergeCells('A' . $row . ':E' . $row);
        $sheet->setCellValue('F' . $row, $grandTotal);
        $sheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF1B580E'],
            ],
        ]);
        $lastDataRow = $row;

        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $borderStyle = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    'color' => ['argb' => 'FFE0E0E0'],
                ],
            ],
        ];
        $sheet->getStyle('A1:F' . $lastDataRow)->applyFromArray($borderStyle);

        $fileName = 'stock-value-' . date('Ymd-His') . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function stockValuePdf(Request $request)
    {
        $query = Item::with('variants');

        if ($request->filled('bom_scope')) {
            $query->where('bom_scope', $request->input('bom_scope'));
        }

        $items = $query->get();

        $bomGroups = [
            Bom::TYPE_CABIN => 'BOM Cabin',
            Bom::TYPE_HARDWARE => 'BOM Hardware',
            Bom::TYPE_HARDWARE_SITE => 'BOM Hardware Site',
        ];

        $groupedData = [];
        $grandTotal = 0;

        foreach ($bomGroups as $key => $label) {
            $groupItems = $items->filter(fn ($item) => ($item->bom_scope ?: 'hardware') === $key)->map(function ($item) {
                return [
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'unit' => $item->unit,
                    'current_stock' => (float) $item->variants->sum('stock_current'),
                    'average_cost' => (float) $item->variants->avg('average_cost'),
                    'total_value' => (float) $item->variants->sum('total_stock_value'),
                ];
            })->values();

            $subtotal = (float) $groupItems->sum('total_value');
            $grandTotal += $subtotal;

            $groupedData[] = [
                'key' => $key,
                'label' => $label,
                'items' => $groupItems,
                'subtotal' => $subtotal,
            ];
        }

        $pdf = Pdf::loadView('finance.stock-value-pdf', [
            'groupedData' => $groupedData,
            'grandTotal' => $grandTotal,
            'generatedAt' => now(),
        ]);

        return $pdf->download('stock-value-' . date('Ymd-His') . '.pdf');
    }
    public function cabinBomCost(Request $request): Response
    {
        $query = Item::where('bom_scope', Bom::TYPE_CABIN)
            ->orderBy('sku');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('sku', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $items = $query->get(['id', 'sku', 'name', 'cost_cny', 'unit']);

        return Inertia::render('Finance/CabinBomCost', [
            'items' => $items,
            'filters' => $request->only(['search']),
        ]);
    }

    public function updateCabinBomCost(Request $request)
    {
        ProcessLogger::start('Finance', 'Update Cabin BOM Cost', 'validate_input');

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => [
                'required',
                Rule::exists('items', 'id')->where('bom_scope', Bom::TYPE_CABIN),
            ],
            'items.*.cost_cny' => 'required|numeric|min:0|max:999999.99',
        ]);

        ProcessLogger::start('Finance', 'Update Cabin BOM Cost', 'update_items', [
            'items_count' => count($validated['items']),
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['items'] as $item) {
                Item::whereKey($item['id'])->update(['cost_cny' => $item['cost_cny']]);
            }
        });

        ProcessLogger::success('Finance', 'Update Cabin BOM Cost', 'completed', [
            'items_updated' => count($validated['items']),
        ]);

        return redirect()->back()->with('success', 'Cost in CNY updated successfully.');
    }
}
