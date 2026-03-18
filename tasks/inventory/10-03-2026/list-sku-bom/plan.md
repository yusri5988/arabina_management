# Plan: SKU Breakdown by BOM Command
- Objective: Create a CLI command to list SKUs and their BOM breakdown.

## Implementation Steps
1. **Scaffold Command**: Create `app/Console/Commands/InventoryBomBreakdown.php` using `php artisan make:command InventoryBomBreakdown`.
2. **Implement Logic**:
   - Fetch all `Package` objects with their `boms.bomItems.item` and `packageItems.item` relationships.
   - Loop through each Package.
   - Display Package info (Code, Name).
   - Display Package Items (Directly linked).
   - Display Boms (By type: Cabin, Hardware, Hardware Site).
   - For each Bom, list its items (SKU, Name, Quantity).
3. **Refine Output**: Use tables for better readability.

## Safety & Standards
- Read-only operation.
- Use Eloquent eager loading to avoid N+1 issues.
- Follow Laravel naming conventions.

## Verification Strategy
- Run `php artisan inventory:bom-breakdown` and verify output matches database records.
