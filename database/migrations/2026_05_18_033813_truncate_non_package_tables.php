<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Disable FK checks to allow truncating tables with foreign keys
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0');
        }

        // Truncate tables — data removed, table structure preserved
        DB::table('sales_order_lines')->truncate();
        DB::table('sales_orders')->truncate();
        DB::table('procurement_order_package_lines')->truncate();
        DB::table('procurement_order_lines')->truncate();
        DB::table('procurement_orders')->truncate();
        DB::table('crn_items')->truncate();
        DB::table('container_receiving_notes')->truncate();
        DB::table('material_receiving_note_items')->truncate();
        DB::table('material_receiving_notes')->truncate();
        DB::table('site_receiving_note_items')->truncate();
        DB::table('site_receiving_notes')->truncate();
        DB::table('inventory_transaction_lines')->truncate();
        DB::table('inventory_transactions')->truncate();
        DB::table('stock_audit_lines')->truncate();
        DB::table('stock_audits')->truncate();
        DB::table('rejected_items')->truncate();
        DB::table('transaction_logs')->truncate();

        // Re-enable FK checks
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1');
        }
    }

    /**
     * Reverse the migrations.
     *
     * Note: Truncated data cannot be restored.
     * Rollback would only re-enable FK checks (already done in up()).
     * This is intentionally a one-way operation.
     */
    public function down(): void
    {
        // No rollback possible — data is gone
    }
};