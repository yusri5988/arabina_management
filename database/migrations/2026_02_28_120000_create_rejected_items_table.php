<?php

use App\Models\CrnItem;
use App\Models\ProcurementOrderLine;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rejected_items', function (Blueprint $table) {
            $table->id();
            $table->morphs('rejectable');
            $table->foreignId('procurement_order_id')->nullable()->constrained('procurement_orders')->nullOnDelete();
            $table->foreignId('crn_id')->nullable()->constrained('contena_receiving_notes')->nullOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->foreignId('item_variant_id')->nullable()->constrained('item_variants')->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->string('reason')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['procurement_order_id', 'rejected_at'], 'rejected_items_po_rejected_idx');
            $table->index(['crn_id', 'rejected_at'], 'rejected_items_crn_rejected_idx');
        });

        $this->backfillRejectedItems();
    }

    public function down(): void
    {
        Schema::dropIfExists('rejected_items');
    }

    private function backfillRejectedItems(): void
    {
        $now = now();

        $crnRows = DB::table('crn_items')
            ->join('contena_receiving_notes', 'contena_receiving_notes.id', '=', 'crn_items.crn_id')
            ->join('item_variants', 'item_variants.id', '=', 'crn_items.item_variant_id')
            ->where('crn_items.rejected_qty', '>', 0)
            ->select([
                'crn_items.id as rejectable_id',
                'contena_receiving_notes.id as crn_id',
                'contena_receiving_notes.procurement_order_id',
                'item_variants.item_id',
                'crn_items.item_variant_id',
                'crn_items.rejected_qty as quantity',
                'crn_items.rejection_reason as reason',
                'crn_items.updated_at as rejected_at',
                'contena_receiving_notes.created_by',
            ])
            ->orderBy('crn_items.id')
            ->get();

        foreach ($crnRows as $row) {
            DB::table('rejected_items')->insert([
                'rejectable_type' => CrnItem::class,
                'rejectable_id' => (int) $row->rejectable_id,
                'procurement_order_id' => $row->procurement_order_id,
                'crn_id' => (int) $row->crn_id,
                'item_id' => (int) $row->item_id,
                'item_variant_id' => $row->item_variant_id,
                'quantity' => (int) $row->quantity,
                'reason' => $row->reason,
                'rejected_at' => $row->rejected_at,
                'created_by' => (int) $row->created_by,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $poTrackedQuantities = DB::table('crn_items')
            ->join('contena_receiving_notes', 'contena_receiving_notes.id', '=', 'crn_items.crn_id')
            ->join('item_variants', 'item_variants.id', '=', 'crn_items.item_variant_id')
            ->whereNotNull('contena_receiving_notes.procurement_order_id')
            ->where('crn_items.rejected_qty', '>', 0)
            ->selectRaw('contena_receiving_notes.procurement_order_id, item_variants.item_id, SUM(crn_items.rejected_qty) as total_rejected')
            ->groupBy('contena_receiving_notes.procurement_order_id', 'item_variants.item_id')
            ->get()
            ->keyBy(fn ($row) => $row->procurement_order_id . ':' . $row->item_id);

        $poLineRows = DB::table('procurement_order_lines')
            ->join('procurement_orders', 'procurement_orders.id', '=', 'procurement_order_lines.procurement_order_id')
            ->where('procurement_order_lines.rejected_quantity', '>', 0)
            ->select([
                'procurement_order_lines.id as rejectable_id',
                'procurement_order_lines.procurement_order_id',
                'procurement_order_lines.item_id',
                'procurement_order_lines.rejected_quantity',
                'procurement_order_lines.updated_at as rejected_at',
                'procurement_orders.created_by',
            ])
            ->orderBy('procurement_order_lines.id')
            ->get();

        foreach ($poLineRows as $line) {
            $key = $line->procurement_order_id . ':' . $line->item_id;
            $trackedQuantity = (int) ($poTrackedQuantities->get($key)->total_rejected ?? 0);
            $remainingQuantity = (int) $line->rejected_quantity - $trackedQuantity;

            if ($remainingQuantity <= 0) {
                continue;
            }

            DB::table('rejected_items')->insert([
                'rejectable_type' => ProcurementOrderLine::class,
                'rejectable_id' => (int) $line->rejectable_id,
                'procurement_order_id' => (int) $line->procurement_order_id,
                'crn_id' => null,
                'item_id' => (int) $line->item_id,
                'item_variant_id' => null,
                'quantity' => $remainingQuantity,
                'reason' => null,
                'rejected_at' => $line->rejected_at,
                'created_by' => (int) $line->created_by,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
};
