<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Seeder;

class ItemImportSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first() ?: User::first();
        $adminId = $admin ? $admin->id : 1;

        $items = [
            ['sku' => '1PNL-DOOR-057', 'name' => 'Panel - Door', 'length_m' => 0.57, 'unit' => 'pcs'],
            ['sku' => '1PNL-ROOF-FLAT-298', 'name' => 'Panel - Roof Flat', 'length_m' => 2.98, 'unit' => 'pcs'],
            ['sku' => '1PNL-ROOF-FLAT-448', 'name' => 'Panel - Roof Flat 15\'', 'length_m' => 4.48, 'unit' => 'pcs'],
            ['sku' => '1PNL-WALL-255', 'name' => 'Panel - Wall', 'length_m' => 2.55, 'unit' => 'pcs'],
            ['sku' => '1PNL-WALL-264', 'name' => 'Panel - Wall', 'length_m' => 2.64, 'unit' => 'pcs'],
            ['sku' => '1PNL-WALL-290', 'name' => 'Panel - Wall', 'length_m' => 2.9, 'unit' => 'pcs'],
            ['sku' => '1PNL-WALL-300', 'name' => 'Panel - Wall', 'length_m' => 3, 'unit' => 'pcs'],
            ['sku' => '1PNL-WALL-320', 'name' => 'Panel - Wall', 'length_m' => 3.2, 'unit' => 'pcs'],
            ['sku' => '1PNL-WIN-144', 'name' => 'Panel - Window', 'length_m' => 1.44, 'unit' => 'pcs'],
            ['sku' => '1RT-175', 'name' => 'Roof Tiles', 'length_m' => 1.75, 'unit' => 'pcs'],
            ['sku' => '1RT-243', 'name' => 'Roof Tiles', 'length_m' => 2.43, 'unit' => 'pcs'],
            ['sku' => '1RT-325', 'name' => 'Roof Tiles', 'length_m' => 3.25, 'unit' => 'pcs'],
            ['sku' => '2CON-HOLE', 'name' => 'Connector Basic Hole', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '2CON-NHOLE', 'name' => 'Connector Basic No Hole', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '2CON-TOP-SCD', 'name' => 'Connector Top Scandi', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '2CON-TOP-SME', 'name' => 'Connector Top Swedish', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '2CON-TOP-SWE', 'name' => 'Connector Top Swedish', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '2CON-TOP-SWISS', 'name' => 'Connector Top Swiss', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '2LB-NS-268', 'name' => 'Lower Beam (No Screw) 10\'', 'length_m' => 2.68, 'unit' => 'set'],
            ['sku' => '2LB-NS-428', 'name' => 'Lower Beam (No Screw) 15\'', 'length_m' => 4.28, 'unit' => 'set'],
            ['sku' => '2LB-S-268', 'name' => 'Lower Beam (Screw) 10\'', 'length_m' => 2.68, 'unit' => 'set'],
            ['sku' => '2LB-S-428', 'name' => 'Lower Beam (Screw) 15\'', 'length_m' => 4.28, 'unit' => 'set'],
            ['sku' => '2LB-S-563', 'name' => 'Lower Beam (Screw) 20\'', 'length_m' => 5.63, 'unit' => 'set'],
            ['sku' => '2LB-S-700', 'name' => 'Lower Beam (Screw) 24\'', 'length_m' => 7, 'unit' => 'set'],
            ['sku' => '2LB-S-868', 'name' => 'Lower Beam (Screw) 30\'', 'length_m' => 8.63, 'unit' => 'set'],
            ['sku' => '2PILLAR-248', 'name' => 'Pillar', 'length_m' => 2.48, 'unit' => 'pcs'],
            ['sku' => '2PILLAR-280', 'name' => 'Pillar Swiss', 'length_m' => 2.8, 'unit' => 'pcs'],
            ['sku' => '2UB-268', 'name' => 'Upper Beam 10\'', 'length_m' => 2.68, 'unit' => 'set'],
            ['sku' => '2UB-428', 'name' => 'Upper Beam 15\'', 'length_m' => 4.28, 'unit' => 'set'],
            ['sku' => '2UB-563', 'name' => 'Upper Beam 20\'', 'length_m' => 5.63, 'unit' => 'set'],
            ['sku' => '2UB-700', 'name' => 'Upper Beam 24\'', 'length_m' => 7, 'unit' => 'set'],
            ['sku' => '2UB-SCD-A-268', 'name' => 'Upper Beam Scandi A 10\'', 'length_m' => 2.68, 'unit' => 'set'],
            ['sku' => '2UB-SCD-A-428', 'name' => 'Upper Beam Scandi A 15\'', 'length_m' => 4.28, 'unit' => 'set'],
            ['sku' => '2UB-SCD-B-268', 'name' => 'Upper Beam Scandi B 10\'', 'length_m' => 2.68, 'unit' => 'set'],
            ['sku' => '2UB-SCD-B-563', 'name' => 'Upper Beam Scandi B 20\'', 'length_m' => 5.63, 'unit' => 'set'],
            ['sku' => '2UB-SCD-B-868', 'name' => 'Upper Beam Scandi B 30\'', 'length_m' => 8.63, 'unit' => 'set'],
            ['sku' => '2UB-SWE-A-563', 'name' => 'Upper Beam Swedish A 20\'', 'length_m' => 5.63, 'unit' => 'set'],
            ['sku' => '3FTS-4080-299', 'name' => 'Floor Truss 40x80 10\'', 'length_m' => 2.99, 'unit' => 'pcs'],
            ['sku' => '3FTS-4080-449', 'name' => 'Floor Truss 40x80 15\'', 'length_m' => 4.49, 'unit' => 'pcs'],
            ['sku' => '3FTS-8080-299', 'name' => 'Floor Truss 80x80 10\'', 'length_m' => 2.99, 'unit' => 'pcs'],
            ['sku' => '3FTS-8080-449', 'name' => 'Floor Truss 80x80 15\'', 'length_m' => 4.49, 'unit' => 'pcs'],
            ['sku' => '3PP-CAP-280', 'name' => 'Pressure Plate - Cap Shape 10\'', 'length_m' => 2.8, 'unit' => 'pcs'],
            ['sku' => '3PP-CAP-440', 'name' => 'Pressure Plate - Cap Shape 15\'', 'length_m' => 4.4, 'unit' => 'pcs'],
            ['sku' => '3PP-CAP-890', 'name' => 'Pressure Plate - Cap Shape 30\'', 'length_m' => 8.9, 'unit' => 'pcs'],
            ['sku' => '3PP-L-280', 'name' => 'Pressure Plate L 10\'', 'length_m' => 2.8, 'unit' => 'pcs'],
            ['sku' => '3PP-L-420', 'name' => 'Pressure Plate L 15\'', 'length_m' => 4.2, 'unit' => 'pcs'],
            ['sku' => '3PP-L-570', 'name' => 'Pressure Plate L 20\'', 'length_m' => 5.7, 'unit' => 'pcs'],
            ['sku' => '3PP-L-700', 'name' => 'Pressure Plate L 24\'', 'length_m' => 7, 'unit' => 'pcs'],
            ['sku' => '3RT-2040-300', 'name' => 'Roof Truss - 2040 Ceiling 10\'', 'length_m' => 3, 'unit' => 'pcs'],
            ['sku' => '3RT-2040-600', 'name' => 'Roof Truss - 2040 Ceiling 20\'', 'length_m' => 6, 'unit' => 'pcs'],
            ['sku' => '3RT-2040-889', 'name' => 'Roof Truss - 2040 Ceiling 30\'', 'length_m' => 8.89, 'unit' => 'pcs'],
            ['sku' => '3RT-4060-300', 'name' => 'Roof Truss - 4060 Top 10\'', 'length_m' => 3, 'unit' => 'pcs'],
            ['sku' => '3RT-4060-600', 'name' => 'Roof Truss - 4060 Top 20\'', 'length_m' => 6, 'unit' => 'pcs'],
            ['sku' => '3RT-4060-889', 'name' => 'Roof Truss - 4060 Top 30\'', 'length_m' => 8.89, 'unit' => 'pcs'],
            ['sku' => '3RT-5050-300', 'name' => 'Roof Truss - 5050 Main 10\'', 'length_m' => 3, 'unit' => 'pcs'],
            ['sku' => '3RT-5050-449', 'name' => 'Roof Truss - 5050 Main 15\'', 'length_m' => 4.49, 'unit' => 'pcs'],
            ['sku' => '4DOOR-STD', 'name' => 'Metal Door Standard', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '4MGO-3*1.147', 'name' => 'MGO Board 3*1.147', 'length_m' => 3, 'unit' => 'pcs'],
            ['sku' => '4MGO-STD', 'name' => 'MGO Board Standard', 'length_m' => 2.8, 'unit' => 'pcs'],
            ['sku' => '4WIN-PRE', 'name' => 'Window Premium', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '4WIN-STD', 'name' => 'Window Standard', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '5CL-831-140', 'name' => 'Ceiling 831', 'length_m' => 1.4, 'unit' => 'pcs'],
            ['sku' => '5CL-831-221', 'name' => 'Ceiling 831', 'length_m' => 2.21, 'unit' => 'pcs'],
            ['sku' => '5CL-831-300', 'name' => 'Ceiling 831', 'length_m' => 3, 'unit' => 'pcs'],
            ['sku' => '5PERA-INN-300', 'name' => 'Perabung Inner', 'length_m' => 3, 'unit' => 'pcs'],
            ['sku' => '5PERA-OUT-300', 'name' => 'Perabung Outer', 'length_m' => 3, 'unit' => 'pcs'],
            ['sku' => '9SMC_BLACK', 'name' => 'Toilet SMC Black', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '9ALU-TAPE', 'name' => 'Aluminium Waterproof Tape', 'length_m' => null, 'unit' => 'roll'],
            ['sku' => '9SCW-CAP', 'name' => 'Screw Conner Cap 1inch', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '9SCW-CON', 'name' => 'Screw Connector', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '9SCW-FLR-10', 'name' => 'Screw Floor Truss 10cm', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '9SCW-FLR-3.8', 'name' => 'Screw Floor 3.8cm', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '9SCW-FLR-6', 'name' => 'Screw Floor Truss 6cm', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '9SCW-WALL-7.5', 'name' => 'Screw Wall Panel 7.5cm', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '9SILICONE', 'name' => 'Silicone', 'length_m' => null, 'unit' => 'pcs'],
            ['sku' => '9SKIR', 'name' => 'PVC Skirting', 'length_m' => null, 'unit' => 'set'],
        ];

        foreach ($items as $itemData) {
            $item = Item::updateOrCreate(
                ['sku' => $itemData['sku']],
                [
                    'name' => $itemData['name'],
                    'length_m' => $itemData['length_m'],
                    'unit' => $itemData['unit'],
                    'created_by' => $adminId,
                ]
            );

            // Create default variant if it doesn't exist
            $item->variants()->updateOrCreate(
                ['color' => null],
                [
                    'stock_initial' => 0,
                    'stock_current' => 0,
                ]
            );
        }
    }
}
