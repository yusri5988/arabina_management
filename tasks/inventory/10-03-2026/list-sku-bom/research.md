# Research: SKU Breakdown by BOM
- Objective: List SKUs and break them down by BOM.
- Project Stack: Laravel (PHP)

## Model Relationships
- `Package`: Parent container. Has multiple `Bom` objects and `PackageItem` objects.
- `Bom`: Specific configuration within a `Package`. Has `type` (cabin, hardware, hardware_site) and multiple `BomItem` objects.
- `BomItem`: Link between a `Bom` and an `Item`, specifying `quantity`.
- `Item`: Represents an SKU.

## Objective Breakdown
The user wants to see SKUs and how they are broken down into components if they have a BOM.
Since `Bom` is linked to a `Package`, this might mean listing `Package` SKUs and their breakdown.

Wait, `Item` also has `bom_scope`. Let's check what it is for.
- `database/migrations/2026_03_10_000200_add_bom_scope_to_items_table.php`
- `app/Models/Item.php` includes `bom_scope` in `$fillable`.

## Schema Verification
Let's check `add_bom_scope_to_items_table.php`.
