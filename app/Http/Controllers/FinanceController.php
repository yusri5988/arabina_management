<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\Item;
use App\Models\Supplier;
use Illuminate\Http\Request;
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
            'Category',
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
        $sheet->getStyle('A1:G1')->applyFromArray($headerStyle);

        $row = 2;
        $totalValue = 0;

        foreach ($items as $item) {
            $currentStock = (float) $item->variants->sum('stock_current');
            $avgCost = (float) $item->variants->avg('average_cost');
            $itemTotalValue = (float) $item->variants->sum('total_stock_value');
            $totalValue += $itemTotalValue;

            $sheet->setCellValue('A' . $row, $item->sku);
            $sheet->setCellValue('B' . $row, $item->name);
            $sheet->setCellValue('C' . $row, ucfirst(str_replace('_', ' ', (string) $item->bom_scope)));
            $sheet->setCellValue('D' . $row, strtoupper($item->unit));
            $sheet->setCellValue('E' . $row, $currentStock);
            $sheet->setCellValue('F' . $row, $avgCost);
            $sheet->setCellValue('G' . $row, $itemTotalValue);
            $row++;
        }

        $sheet->setCellValue('A' . $row, 'TOTAL');
        $sheet->setCellValue('G' . $row, $totalValue);
        $sheet->getStyle('A' . $row . ':G' . $row)->getFont()->setBold(true);

        foreach (range('A', 'G') as $col) {
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
        $sheet->getStyle('A1:G' . $row)->applyFromArray($borderStyle);

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

        $stockData = $items->map(function ($item) {
            return [
                'sku' => $item->sku,
                'name' => $item->name,
                'bom_scope' => $item->bom_scope,
                'unit' => $item->unit,
                'current_stock' => (float) $item->variants->sum('stock_current'),
                'average_cost' => (float) $item->variants->avg('average_cost'),
                'total_value' => (float) $item->variants->sum('total_stock_value'),
            ];
        });

        $totalValueAll = $stockData->sum('total_value');

        $pdf = Pdf::loadView('finance.stock-value-pdf', [
            'stockData' => $stockData,
            'totalValueAll' => $totalValueAll,
            'generatedAt' => now(),
        ]);

        return $pdf->download('stock-value-' . date('Ymd-His') . '.pdf');
    }
}
