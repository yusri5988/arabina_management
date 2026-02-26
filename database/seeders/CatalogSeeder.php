<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Package;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $userId = User::query()->orderBy('id')->value('id');

        if (!$userId) {
            $this->command->error('No user found to assign as creator.');
            return;
        }

        // 1. ITEMS CATALOG SEEDING
        $items = [
            ["sku"=>"1PNL-DOOR-057","name"=>"Panel - Door","length_m"=>0.57,"unit"=>"pcs"],
            ["sku"=>"1PNL-ROOF-FLAT-298","name"=>"Panel - Roof Flat","length_m"=>2.98,"unit"=>"pcs"],
            ["sku"=>"1PNL-ROOF-FLAT-448","name"=>"Panel - Roof Flat 15ft","length_m"=>4.48,"unit"=>"pcs"],
            ["sku"=>"1PNL-WALL-255","name"=>"Panel - Wall","length_m"=>2.55,"unit"=>"pcs"],
            ["sku"=>"1PNL-WALL-264","name"=>"Panel - Wall","length_m"=>2.64,"unit"=>"pcs"],
            ["sku"=>"1PNL-WALL-290","name"=>"Panel - Wall","length_m"=>2.90,"unit"=>"pcs"],
            ["sku"=>"1PNL-WALL-300","name"=>"Panel - Wall","length_m"=>3.00,"unit"=>"pcs"],
            ["sku"=>"1PNL-WALL-320","name"=>"Panel - Wall","length_m"=>3.20,"unit"=>"pcs"],
            ["sku"=>"1PNL-WIN-144","name"=>"Panel - Window","length_m"=>1.44,"unit"=>"pcs"],
            ["sku"=>"1RT-175","name"=>"Roof Tiles","length_m"=>1.75,"unit"=>"pcs"],
            ["sku"=>"1RT-243","name"=>"Roof Tiles","length_m"=>2.43,"unit"=>"pcs"],
            ["sku"=>"1RT-325","name"=>"Roof Tiles","length_m"=>3.25,"unit"=>"pcs"],
            ["sku"=>"2CON-HOLE","name"=>"Connector Basic Hole","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"2CON-NHOLE","name"=>"Connector Basic No Hole","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"2CON-TOP-SCD","name"=>"Connector Top Scandi","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"2CON-TOP-SME","name"=>"Connector Top Swedish","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"2CON-TOP-SWE","name"=>"Connector Top Swedish","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"2CON-TOP-SWISS","name"=>"Connector Top Swiss","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"2LB-NS-268","name"=>"Lower Beam (No Screw) 10ft","length_m"=>2.68,"unit"=>"set"],
            ["sku"=>"2LB-NS-428","name"=>"Lower Beam (No Screw) 15ft","length_m"=>4.28,"unit"=>"set"],
            ["sku"=>"2LB-S-268","name"=>"Lower Beam (Screw) 10ft","length_m"=>2.68,"unit"=>"set"],
            ["sku"=>"2LB-S-428","name"=>"Lower Beam (Screw) 15ft","length_m"=>4.28,"unit"=>"set"],
            ["sku"=>"2LB-S-563","name"=>"Lower Beam (Screw) 20ft","length_m"=>5.63,"unit"=>"set"],
            ["sku"=>"2LB-S-700","name"=>"Lower Beam (Screw) 24ft","length_m"=>7.00,"unit"=>"set"],
            ["sku"=>"2LB-S-868","name"=>"Lower Beam (Screw) 30ft","length_m"=>8.63,"unit"=>"set"],
            ["sku"=>"2PILLAR-248","name"=>"Pillar","length_m"=>2.48,"unit"=>"pcs"],
            ["sku"=>"2PILLAR-280","name"=>"Pillar Swiss","length_m"=>2.80,"unit"=>"pcs"],
            ["sku"=>"2UB-268","name"=>"Upper Beam 10ft","length_m"=>2.68,"unit"=>"set"],
            ["sku"=>"2UB-428","name"=>"Upper Beam 15ft","length_m"=>4.28,"unit"=>"set"],
            ["sku"=>"2UB-563","name"=>"Upper Beam 20ft","length_m"=>5.63,"unit"=>"set"],
            ["sku"=>"2UB-700","name"=>"Upper Beam 24ft","length_m"=>7.00,"unit"=>"set"],
            ["sku"=>"2UB-SCD-A-268","name"=>"Upper Beam Scandi A 10ft","length_m"=>2.68,"unit"=>"set"],
            ["sku"=>"2UB-SCD-A-428","name"=>"Upper Beam Scandi A 15ft","length_m"=>4.28,"unit"=>"set"],
            ["sku"=>"2UB-SCD-B-268","name"=>"Upper Beam Scandi B 10ft","length_m"=>2.68,"unit"=>"set"],
            ["sku"=>"2UB-SCD-B-563","name"=>"Upper Beam Scandi B 20ft","length_m"=>5.63,"unit"=>"set"],
            ["sku"=>"2UB-SCD-B-868","name"=>"Upper Beam Scandi B 30ft","length_m"=>8.63,"unit"=>"set"],
            ["sku"=>"2UB-SWE-A-563","name"=>"Upper Beam Swedish A 20ft","length_m"=>5.63,"unit"=>"set"],
            ["sku"=>"3FTS-4080-299","name"=>"Floor Truss 40x80 10ft","length_m"=>2.99,"unit"=>"pcs"],
            ["sku"=>"3FTS-4080-449","name"=>"Floor Truss 40x80 15ft","length_m"=>4.49,"unit"=>"pcs"],
            ["sku"=>"3FTS-8080-299","name"=>"Floor Truss 80x80 10ft","length_m"=>2.99,"unit"=>"pcs"],
            ["sku"=>"3FTS-8080-449","name"=>"Floor Truss 80x80 15ft","length_m"=>4.49,"unit"=>"pcs"],
            ["sku"=>"3PP-CAP-280","name"=>"Pressure Plate - Cap Shape 10ft","length_m"=>2.80,"unit"=>"pcs"],
            ["sku"=>"3PP-CAP-440","name"=>"Pressure Plate - Cap Shape 15ft","length_m"=>4.40,"unit"=>"pcs"],
            ["sku"=>"3PP-CAP-890","name"=>"Pressure Plate - Cap Shape 30ft","length_m"=>8.90,"unit"=>"pcs"],
            ["sku"=>"3PP-L-280","name"=>"Pressure Plate L 10ft","length_m"=>2.80,"unit"=>"pcs"],
            ["sku"=>"3PP-L-420","name"=>"Pressure Plate L 15ft","length_m"=>4.20,"unit"=>"pcs"],
            ["sku"=>"3PP-L-570","name"=>"Pressure Plate L 20ft","length_m"=>5.70,"unit"=>"pcs"],
            ["sku"=>"3PP-L-700","name"=>"Pressure Plate L 24ft","length_m"=>7.00,"unit"=>"pcs"],
            ["sku"=>"3RT-2040-300","name"=>"Roof Truss - 2040 Ceiling 10ft","length_m"=>3.00,"unit"=>"pcs"],
            ["sku"=>"3RT-2040-600","name"=>"Roof Truss - 2040 Ceiling 20ft","length_m"=>6.00,"unit"=>"pcs"],
            ["sku"=>"3RT-2040-889","name"=>"Roof Truss - 2040 Ceiling 30ft","length_m"=>8.89,"unit"=>"pcs"],
            ["sku"=>"3RT-4060-300","name"=>"Roof Truss - 4060 Top 10ft","length_m"=>3.00,"unit"=>"pcs"],
            ["sku"=>"3RT-4060-600","name"=>"Roof Truss - 4060 Top 20ft","length_m"=>6.00,"unit"=>"pcs"],
            ["sku"=>"3RT-4060-889","name"=>"Roof Truss - 4060 Top 30ft","length_m"=>8.89,"unit"=>"pcs"],
            ["sku"=>"3RT-5050-300","name"=>"Roof Truss - 5050 Main 10ft","length_m"=>3.00,"unit"=>"pcs"],
            ["sku"=>"3RT-5050-449","name"=>"Roof Truss - 5050 Main 15ft","length_m"=>4.49,"unit"=>"pcs"],
            ["sku"=>"4DOOR-STD","name"=>"Metal Door Standard","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"4MGO-3*1.147","name"=>"MGO Board 3*1.147","length_m"=>3.00,"unit"=>"pcs"],
            ["sku"=>"4MGO-STD","name"=>"MGO Board Standard","length_m"=>2.80,"unit"=>"pcs"],
            ["sku"=>"4WIN-PRE","name"=>"Window Premium","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"4WIN-STD","name"=>"Window Standard","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"5CL-831-140","name"=>"Ceiling 831","length_m"=>1.40,"unit"=>"pcs"],
            ["sku"=>"5CL-831-221","name"=>"Ceiling 831","length_m"=>2.21,"unit"=>"pcs"],
            ["sku"=>"5CL-831-300","name"=>"Ceiling 831","length_m"=>3.00,"unit"=>"pcs"],
            ["sku"=>"5PERA-INN-300","name"=>"Perabung Inner","length_m"=>3.00,"unit"=>"pcs"],
            ["sku"=>"5PERA-OUT-300","name"=>"Perabung Outer","length_m"=>3.00,"unit"=>"pcs"],
            ["sku"=>"9SMC_BLACK","name"=>"Toilet SMC Black","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"9ALU-TAPE","name"=>"Aluminium Waterproof Tape","length_m"=>null,"unit"=>"roll"],
            ["sku"=>"9SCW-CAP","name"=>"Screw Conner Cap 1inch","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"9SCW-CON","name"=>"Screw Connector","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"9SCW-FLR-10","name"=>"Screw Floor Truss 10cm","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"9SCW-FLR-3.8","name"=>"Screw Floor 3.8cm","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"9SCW-FLR-6","name"=>"Screw Floor Truss 6cm","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"9SCW-WALL-7.5","name"=>"Screw Wall Panel 7.5cm","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"9SILICONE","name"=>"Silicone","length_m"=>null,"unit"=>"pcs"],
            ["sku"=>"9SKIR","name"=>"PVC Skirting","length_m"=>null,"unit"=>"set"]
        ];

        foreach ($items as $row) {
            $item = Item::updateOrCreate(
                ["sku" => $row["sku"]],
                ["name" => $row["name"], "length_m" => $row["length_m"], "unit" => $row["unit"], "created_by" => $userId]
            );

            ItemVariant::firstOrCreate(
                ["item_id" => $item->id, "color" => null],
                ["stock_initial" => 0, "stock_current" => 0]
            );
        }

        // 2. PACKAGES SEEDING
        $packages = [
            [
                "code" => "OSLO-10X10",
                "name" => "Oslo 10x10",
                "lines" => [
                    ["sku"=>"1PNL-DOOR-057","qty"=>1],["sku"=>"1PNL-ROOF-FLAT-298","qty"=>4],["sku"=>"1PNL-WALL-264","qty"=>9],["sku"=>"1PNL-WIN-144","qty"=>2],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-NHOLE","qty"=>4],["sku"=>"2LB-NS-268","qty"=>1],["sku"=>"2LB-S-268","qty"=>1],["sku"=>"2PILLAR-248","qty"=>4],["sku"=>"2UB-268","qty"=>2],["sku"=>"3FTS-4080-299","qty"=>2],["sku"=>"3FTS-8080-299","qty"=>2],["sku"=>"3PP-L-280","qty"=>4],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-STD","qty"=>3],["sku"=>"4WIN-STD","qty"=>2]
                ]
            ],
            [
                "code" => "OSLO-10X15",
                "name" => "Oslo 10x15",
                "lines" => [
                    ["sku"=>"1PNL-DOOR-057","qty"=>1],["sku"=>"1PNL-ROOF-FLAT-298","qty"=>5],["sku"=>"1PNL-WALL-264","qty"=>12],["sku"=>"1PNL-WIN-144","qty"=>2],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-NHOLE","qty"=>4],["sku"=>"2LB-NS-268","qty"=>1],["sku"=>"2LB-S-428","qty"=>1],["sku"=>"2PILLAR-248","qty"=>4],["sku"=>"2UB-268","qty"=>1],["sku"=>"2UB-428","qty"=>1],["sku"=>"3FTS-4080-299","qty"=>4],["sku"=>"3FTS-8080-299","qty"=>3],["sku"=>"3PP-L-280","qty"=>4],["sku"=>"3PP-L-420","qty"=>4],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-STD","qty"=>4],["sku"=>"4WIN-STD","qty"=>2]
                ]
            ],
            [
                "code" => "OSLO-15X20",
                "name" => "Oslo 15x20",
                "lines" => [
                    ["sku"=>"1PNL-DOOR-057","qty"=>1],["sku"=>"1PNL-ROOF-FLAT-448","qty"=>7],["sku"=>"1PNL-WALL-264","qty"=>19],["sku"=>"1PNL-WIN-144","qty"=>2],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-NHOLE","qty"=>4],["sku"=>"2LB-NS-428","qty"=>1],["sku"=>"2LB-S-563","qty"=>1],["sku"=>"2PILLAR-248","qty"=>4],["sku"=>"2UB-428","qty"=>1],["sku"=>"2UB-563","qty"=>1],["sku"=>"3FTS-4080-449","qty"=>5],["sku"=>"3FTS-8080-449","qty"=>4],["sku"=>"3PP-L-420","qty"=>2],["sku"=>"3PP-L-570","qty"=>2],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-3*1.147","qty"=>3],["sku"=>"4MGO-STD","qty"=>5],["sku"=>"4WIN-STD","qty"=>2]
                ]
            ],
            [
                "code" => "OSLO-10X24",
                "name" => "Oslo 10x24",
                "lines" => [
                    ["sku"=>"1PNL-DOOR-057","qty"=>1],["sku"=>"1PNL-ROOF-FLAT-298","qty"=>8],["sku"=>"1PNL-WALL-264","qty"=>18],["sku"=>"1PNL-WIN-144","qty"=>2],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-NHOLE","qty"=>4],["sku"=>"2LB-NS-268","qty"=>1],["sku"=>"2LB-S-700","qty"=>1],["sku"=>"2PILLAR-248","qty"=>4],["sku"=>"2UB-268","qty"=>1],["sku"=>"2UB-700","qty"=>1],["sku"=>"3FTS-4080-299","qty"=>6],["sku"=>"3FTS-8080-299","qty"=>6],["sku"=>"3PP-L-280","qty"=>2],["sku"=>"3PP-L-700","qty"=>2],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-STD","qty"=>7],["sku"=>"4WIN-STD","qty"=>2]
                ]
            ],
            [
                "code" => "ACCESSORIES",
                "name" => "Accessories",
                "lines" => [
                    ["sku" => "9ALU-TAPE", "qty" => 4], ["sku" => "9SCW-CAP", "qty" => 200], ["sku" => "9SCW-CON", "qty" => 64], ["sku" => "9SCW-FLR-10", "qty" => 8], ["sku" => "9SCW-FLR-3.8", "qty" => 70], ["sku" => "9SCW-FLR-6", "qty" => 10], ["sku" => "9SCW-WALL-7.5", "qty" => 20], ["sku" => "9SILICONE", "qty" => 4], ["sku" => "9SKIR", "qty" => 1],
                ]
            ],
            [
                "code" => "PARTITION-S10X10",
                "name" => "Partition S10x10",
                "lines" => [
                    ["sku" => "1PNL-WALL-300", "qty" => 3], ["sku" => "4DOOR-STD", "qty" => 1],
                ]
            ],
            [
                "code" => "SWISS-10X20",
                "name" => "Swiss 10x20",
                "lines" => [
                    ["sku"=>"1PNL-ROOF-FLAT-298","qty"=>7],["sku"=>"1PNL-WALL-264","qty"=>6],["sku"=>"1PNL-WALL-300","qty"=>12],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-TOP-SWISS","qty"=>4],["sku"=>"2LB-NS-268","qty"=>1],["sku"=>"2LB-S-563","qty"=>1],["sku"=>"2PILLAR-248","qty"=>2],["sku"=>"2PILLAR-280","qty"=>2],["sku"=>"2UB-268","qty"=>1],["sku"=>"2UB-563","qty"=>1],["sku"=>"3FTS-4080-299","qty"=>5],["sku"=>"3FTS-8080-299","qty"=>4],["sku"=>"3PP-L-280","qty"=>2],["sku"=>"3PP-L-570","qty"=>2],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-STD","qty"=>5],["sku"=>"4WIN-STD","qty"=>2]
                ]
            ],
            [
                "code" => "SWEDISH-10X20",
                "name" => "Swedish 10x20",
                "lines" => [
                    ["sku"=>"1PNL-DOOR-057","qty"=>1],["sku"=>"1PNL-WALL-255","qty"=>6],["sku"=>"1PNL-WALL-320","qty"=>12],["sku"=>"1RT-325","qty"=>7],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-TOP-SME","qty"=>4],["sku"=>"2CON-TOP-SWE","qty"=>4],["sku"=>"2LB-NS-268","qty"=>1],["sku"=>"2LB-S-563","qty"=>1],["sku"=>"2PILLAR-248","qty"=>4],["sku"=>"2UB-268","qty"=>1],["sku"=>"2UB-SWE-A-563","qty"=>1],["sku"=>"3FTS-4080-299","qty"=>5],["sku"=>"3FTS-8080-299","qty"=>4],["sku"=>"3PP-CAP-280","qty"=>4],["sku"=>"3RT-2040-300","qty"=>6],["sku"=>"3RT-4060-300","qty"=>6],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-STD","qty"=>5],["sku"=>"4WIN-PRE","qty"=>2],["sku"=>"5CL-831-300","qty"=>8],["sku"=>"5PERA-INN-300","qty"=>2],["sku"=>"5PERA-OUT-300","qty"=>2]
                ]
            ],
            [
                "code" => "SCANDI-15X30",
                "name" => "Scandi 15x30",
                "lines" => [
                    ["sku"=>"1PNL-WALL-255","qty"=>10],["sku"=>"1PNL-WALL-320","qty"=>19],["sku"=>"1RT-243","qty"=>20],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-TOP-SCD","qty"=>4],["sku"=>"2LB-NS-428","qty"=>1],["sku"=>"2LB-S-868","qty"=>1],["sku"=>"2PILLAR-248","qty"=>4],["sku"=>"2UB-SCD-A-428","qty"=>1],["sku"=>"2UB-SCD-B-868","qty"=>1],["sku"=>"3FTS-4080-449","qty"=>7],["sku"=>"3FTS-8080-449","qty"=>8],["sku"=>"3PP-CAP-440","qty"=>2],["sku"=>"3PP-CAP-890","qty"=>2],["sku"=>"3RT-2040-889","qty"=>4],["sku"=>"3RT-4060-889","qty"=>4],["sku"=>"3RT-5050-449","qty"=>4],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-3*1.147","qty"=>4],["sku"=>"4MGO-STD","qty"=>8],["sku"=>"4WIN-STD","qty"=>4],["sku"=>"5CL-831-221","qty"=>22],["sku"=>"5PERA-INN-300","qty"=>3],["sku"=>"5PERA-OUT-300","qty"=>3]
                ]
            ],
            [
                "code" => "SCANDI-10X20",
                "name" => "Scandi 10x20",
                "lines" => [
                    ["sku"=>"1PNL-WALL-255","qty"=>12],["sku"=>"1PNL-WALL-290","qty"=>4],["sku"=>"1PNL-WALL-300","qty"=>2],["sku"=>"1RT-175","qty"=>13],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-TOP-SCD","qty"=>4],["sku"=>"2LB-NS-268","qty"=>1],["sku"=>"2LB-S-563","qty"=>1],["sku"=>"2PILLAR-248","qty"=>4],["sku"=>"2UB-SCD-A-268","qty"=>1],["sku"=>"2UB-SCD-B-563","qty"=>1],["sku"=>"3FTS-4080-299","qty"=>5],["sku"=>"3FTS-8080-299","qty"=>4],["sku"=>"3PP-CAP-280","qty"=>2],["sku"=>"3RT-2040-600","qty"=>4],["sku"=>"3RT-4060-600","qty"=>4],["sku"=>"3RT-5050-300","qty"=>2],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-STD","qty"=>5],["sku"=>"4WIN-STD","qty"=>2],["sku"=>"5CL-831-140","qty"=>14],["sku"=>"5PERA-INN-300","qty"=>2],["sku"=>"5PERA-OUT-300","qty"=>2]
                ]
            ],
            [
                "code" => "SCANDI-10X10",
                "name" => "Scandi 10x10",
                "lines" => [
                    ["sku"=>"1PNL-WALL-255","qty"=>6],["sku"=>"1PNL-WALL-290","qty"=>4],["sku"=>"1PNL-WALL-300","qty"=>2],["sku"=>"1RT-175","qty"=>7],["sku"=>"2CON-HOLE","qty"=>4],["sku"=>"2CON-TOP-SCD","qty"=>4],["sku"=>"2LB-NS-268","qty"=>1],["sku"=>"2LB-S-268","qty"=>1],["sku"=>"2PILLAR-248","qty"=>4],["sku"=>"2UB-SCD-A-268","qty"=>1],["sku"=>"2UB-SCD-B-268","qty"=>1],["sku"=>"3FTS-4080-299","qty"=>3],["sku"=>"3FTS-8080-299","qty"=>2],["sku"=>"3PP-CAP-280","qty"=>2],["sku"=>"3RT-2040-300","qty"=>4],["sku"=>"3RT-4060-300","qty"=>4],["sku"=>"3RT-5050-300","qty"=>1],["sku"=>"4DOOR-STD","qty"=>1],["sku"=>"4MGO-STD","qty"=>3],["sku"=>"4WIN-STD","qty"=>2],["sku"=>"5CL-831-140","qty"=>8],["sku"=>"5PERA-INN-300","qty"=>2],["sku"=>"5PERA-OUT-300","qty"=>2]
                ]
            ],
        ];

        foreach ($packages as $pkgData) {
            $package = Package::updateOrCreate(
                ["code" => $pkgData["code"]],
                ["name" => $pkgData["name"], "is_active" => true, "created_by" => $userId]
            );

            $package->packageItems()->delete();

            foreach ($pkgData["lines"] as $line) {
                $item = Item::where("sku", $line["sku"])->first();
                if ($item) {
                    $package->packageItems()->create([
                        "item_id" => $item->id,
                        "quantity" => $line["qty"]
                    ]);
                }
            }
        }
    }
}
