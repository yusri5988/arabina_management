# Project Function Flow

This document is the central reference for feature flow, function ownership, and implementation details.
Update this file every time a feature is added or behavior is changed.

## How To Use This Doc

1. Read `Function Registry` to find the feature.
2. Open the feature section for end-to-end flow.
3. Update the section in the same task whenever code changes.
4. Add new features to `Function Registry` first.

## Function Registry

| ID | Function | Status | Main Area |
| --- | --- | --- | --- |
| FUNC-001 | Admin User Management (CRUD) | Active | `/admin/users` |
| FUNC-002 | Inventory Stock Management (Option B) | Active | `/items` |
| FUNC-003 | Package Setup by SKU | Active | `/packages` |
| FUNC-004 | Inventory Transaction Ledger | Active | `inventory_transactions` |
| FUNC-005 | Sales Order Capture | Active | `/orders` |
| FUNC-006 | Procurement Shortage + Receiving | Active | `/procurement` |
| FUNC-007 | Rejected List Audit | Active | `/rejections` |

---

## FUNC-001: Admin User Management (CRUD)

### Purpose

Allow `super_admin` to create, update, and delete managed accounts with immediate UI updates and notifications.

### Access Control

- Route group middleware: `auth`, `role:super_admin`
- Roles allowed to be managed: `store_keeper`, `procurement`, `finance`, `sales`

### Entry Points

- Page: `GET /admin/users`
- Create API: `POST /admin/users`
- Update API: `PUT /admin/users/{user}`
- Delete API: `DELETE /admin/users/{user}`

### UI Files

- `resources/js/Pages/Admin/UserManagement.jsx`
- `resources/views/app.blade.php` (CSRF meta token for AJAX requests)

### Backend Files

- `routes/web.php`
- `app/Http/Controllers/Admin/UserManagementController.php`
- `app/Models/User.php`

### Data Model Used

Table: `users`

Relevant columns:
- `id`
- `name`
- `email`
- `password` (hashed via model cast)
- `role`
- `created_by`
- `created_at`

### End-to-End Flow

1. Super admin opens `/admin/users`.
2. `UserManagementController@index` fetches managed users (`whereIn role`) and returns Inertia page.
3. User fills form in `UserManagement.jsx`.
4. Frontend sends `fetch` request with JSON body and CSRF token.
5. For create (`POST /admin/users`), `UserManagementController@store` validates payload:
   - `name`: required, string, max 255
   - `email`: required, email, max 255, unique
   - `password`: required, string, min 6
   - `role`: required, in managed roles
6. On success, backend creates user and returns `201` JSON:
   - `message`
   - `data` (id, name, email, role, created_at)
7. Frontend prepends returned user to local `accounts` list and shows success notification.
8. For update (`PUT /admin/users/{user}`), backend validates:
   - `name`: required, string, max 255
   - `email`: required, email, max 255, unique except current user
   - `password`: nullable, string, min 6
   - `role`: required, in managed roles
9. On update success, backend returns JSON and frontend replaces updated row in local `accounts` list.
10. For delete (`DELETE /admin/users/{user}`), backend deletes managed user and frontend removes row from local `accounts` list.

### Validation/Error Behavior

- `422` returns field errors for create/update; frontend maps and displays errors under related fields.
- `404` for non-managed user operations (update/delete safety guard).
- Unexpected/network error shows generic error notification.

### Current UX Behavior

- Success/error notification appears for create, update, and delete.
- Edit button loads selected account into form.
- Delete button asks confirmation before delete.
- Account list updates immediately without page reload.

### Manual Test Checklist

1. Login as `super_admin`.
2. Open `/admin/users`.
3. Create user with:
   - valid email (not used before)
   - password length 6 or more
4. Confirm:
   - success notification appears
   - new row appears at top of list
5. Click `Edit` on any user, change fields, submit, and verify row updates.
6. Click `Delete` on any user, confirm, and verify row is removed.
7. Try invalid payload (e.g., short password < 6) and verify field error appears.

---

## FUNC-002: Inventory Stock Management (Option B)

### Purpose

Allow `store_keeper` (and admin) to register base items first, then run stock movements with these rules:
- Stock In: by package or ala carte SKU
- Stock Out: by package or ala carte SKU and must be tagged by customer text or selected sales order

### Access Control

- Middleware: `auth`
- Primary Users: `store_keeper`, `super_admin`

### Entry Points

- Page: `GET /items`
- API: `POST /items` (Register base item only)
- Page: `GET /items/stock` (Query `?type=in` or `?type=out`)
- API: `POST /items/stock/in` (Stock in: `mode=package|alacarte`)
- API: `POST /items/stock/out` (Stock out by `mode=package|alacarte` + customer/sales order tag)

### UI Files

- `resources/js/Pages/Inventory/Index.jsx`
- `resources/js/Pages/Inventory/Stock.jsx`
- `resources/js/Pages/Dashboard.jsx` (Quick action buttons for + / -)
- `resources/js/Layouts/AuthenticatedLayout.jsx` (Bottom navigation updated)

### Backend Files

- `routes/web.php`
- `app/Http/Controllers/ItemController.php`
- `app/Models/Item.php`
- `app/Models/ItemVariant.php`
- `app/Models/InventoryTransaction.php`
- `app/Models/InventoryTransactionLine.php`
- `database/migrations/2026_02_24_140000_create_inventory_transactions_tables.php`

### Data Model Used

Table: `items` (Parent)
- `id`, `sku` (unique), `name`, `length_m` (unique, nullable), `unit`, `created_by`

Table: `item_variants` (Child)
- `id`, `item_id`, `color`, `stock_initial`, `stock_current`

### End-to-End Flow

1. Store keeper opens `/items`.
2. `ItemController@index` fetches items with variants and returns Inertia page.
3. User fills Registration Form:
   - SKU, Name, Unit (dropdown: pcs, set), Length (nullable but unique if provided).
4. On submit, `ItemController@store` validates and creates only base item.
5. To update stock, user opens `/items/stock` from Dashboard quick actions.
6. For Stock In:
   - `mode=package`: select package + package quantity
   - `mode=alacarte`: select one/many SKU lines + qty
7. `ItemController@stockInStore` resolves lines by SKU and increments `stock_initial` + `stock_current`.
8. For Stock Out:
   - package mode or ala carte mode
   - user can choose open sales order, or fill manual `customer_tag`
9. `ItemController@stockOutStore` validates stock sufficiency for all selected lines, then decrements `stock_current`.
10. Every stock movement creates transaction + transaction lines (audit by SKU).

### Current UX Behavior

- Item registration form does not ask for initial stock.
- Stock In supports package and ala carte SKU.
- Stock Out supports package and ala carte SKU.
- Stock Out supports customer tag text and optional sales order link.
- Dashboard has quick action buttons (`+` for Stock In, `-` for Stock Out).
- Inventory is displayed as modern cards.
- Stock counts are color-coded (Red for 0, Green for available).
- Mobile-friendly card list layout.

### Manual Test Checklist

1. Login as `store_keeper` or `super_admin`.
2. Open `/items` (via "Inventory Stock" button on Dashboard or "Items" in Bottom Nav).
3. Register an item without stock.
4. Create package on `/packages` that includes the registered SKU.
5. Open `/items/stock?type=in`, choose package mode, submit quantity 1.
6. Verify stock value appears/updates on the item card.
7. Open `/items/stock?type=in`, choose ala carte mode, add SKU qty manually.
8. Verify stock increases accordingly.
9. Open `/items/stock?type=out`, choose package (or ala carte), fill customer tag or choose sales order, submit quantity 1.
10. Verify stock decreases and request fails if stock insufficient.
11. Try to register duplicate SKU and verify validation error.
12. Try to register duplicate `length_m` value and verify validation error.

---

## FUNC-003: Package Setup by SKU

### Purpose

Allow `super_admin` to define package composition based on registered SKU and quantity per SKU.

### Access Control

- Middleware: `auth`, `role:super_admin`
- Primary Users: `super_admin`

### Entry Points

- Page: `GET /packages`
- API: `POST /packages` (Create package)
- API: `DELETE /packages/{package}` (Delete package)

### UI Files

- `resources/js/Pages/Packages/Index.jsx`
- `resources/js/Pages/Dashboard.jsx` (Quick action link for package setup)

### Backend Files

- `routes/web.php`
- `app/Http/Controllers/PackageController.php`
- `app/Models/Package.php`
- `app/Models/PackageItem.php`

### Data Model Used

Table: `packages`
- `id`, `code` (unique), `name`, `is_active`, `created_by`

Table: `package_items`
- `id`, `package_id`, `item_id`, `quantity`
- unique pair: `package_id + item_id`

### End-to-End Flow

1. Authorized user opens `/packages`.
2. `PackageController@index` loads all SKU from `items` and existing package definitions.
3. User fills package code, package name, active flag, and one or more package lines.
4. Each package line must select a registered SKU and quantity (`min:1`).
5. `PackageController@store` validates payload and creates package with child `package_items` in DB transaction.
6. Frontend prepends newly created package to list without page reload.
7. User can delete package from list; backend removes parent + children via cascade.

### Manual Test Checklist

1. Login as `super_admin`.
2. Open `/packages`.
3. Create package with 2 SKU lines and different quantity.
4. Verify package appears in list with expected SKU lines.
5. Try duplicate package code and verify validation error.
6. Delete package and verify it is removed from list.

---

## FUNC-004: Inventory Transaction Ledger

### Purpose

Provide auditable stock movement records by SKU for both package and ala carte operations.

### Data Model Used

Table: `inventory_transactions`
- `id`, `type` (`in`/`out`), `mode` (`package`/`alacarte`)
- `package_id`, `package_quantity`
- `sales_order_id` (nullable), optional link to sales order
- `notes` stores customer context (`Customer: ...`, optional SO code) for stock out flow
- `created_by`, `notes`, timestamps

Table: `inventory_transaction_lines`
- `id`, `inventory_transaction_id`, `item_id`, `item_variant_id`, `quantity`, timestamps

### Behavior

1. A header transaction record is created per stock request.
2. One line is written per affected SKU.
3. For stock in: line quantity is added to `stock_initial` and `stock_current`.
4. For stock out: line quantity is deducted from `stock_current`.
5. All writes happen inside DB transaction to keep stock and ledger consistent.

---

## FUNC-005: Sales Order Capture

### Purpose

Allow sales team to submit customer order by package, to be used as reference for stock out and future procurement planning.

### Access Control

- Middleware: `auth`
- Create permission: `sales`, `super_admin`
- View permission: all authenticated roles

### Entry Points

- Page: `GET /orders`
- API: `POST /orders` (Create sales order)

### UI Files

- `resources/js/Pages/Sales/Orders.jsx`
- `resources/js/Layouts/AuthenticatedLayout.jsx` (existing `Order` navigation path)

### Backend Files

- `routes/web.php`
- `app/Http/Controllers/SalesOrderController.php`
- `app/Models/SalesOrder.php`
- `app/Models/SalesOrderLine.php`

### Data Model Used

Table: `sales_orders`
- `id`, `code` (unique), `customer_name`, `order_date`, `status`, `created_by`, `notes`

Table: `sales_order_lines`
- `id`, `sales_order_id`, `package_id`, `package_quantity`, `shipped_quantity`

### End-to-End Flow

1. Sales user opens `/orders`.
2. User fills customer name, order date, and one/more package lines.
3. `SalesOrderController@store` validates payload and creates `sales_orders` + `sales_order_lines` in DB transaction.
4. System auto-generates order code format `SO-YYYYMMDD-XXXX`.
5. Newly created order appears in recent list without reload.
6. Open and partial sales orders are available in stock out page as optional tag source.
7. When stock out is submitted in `package` mode with selected `sales_order_id`, line `shipped_quantity` is incremented.
8. Sales order status auto-updates:
   - `open`: no line shipped
   - `partial`: some shipped, not complete
   - `fulfilled`: all lines shipped `>= package_quantity`

---

## FUNC-006: Procurement Shortage + Receiving

### Purpose

Allow procurement/store operations to:
- auto-calculate shortage from open sales orders vs current stock
- generate procurement draft in package + SKU format
- record supplier receiving and auto-calculate rejected quantity

### Access Control

- Middleware: `auth`
- Create procurement draft: `procurement`, `super_admin`
- Submit receiving: `store_keeper`, `procurement`, `super_admin`

### Entry Points

- Page: `GET /procurement`
- API: `POST /procurement/orders` (Create draft from suggestion)
- API: `PUT /procurement/orders/{order}/receive` (Record received/rejected)
- API: `DELETE /procurement/orders/{order}` (Delete draft)

### UI Files

- `resources/js/Pages/Procurement/Index.jsx`
- `resources/js/Layouts/AuthenticatedLayout.jsx` (navigation link)
- `resources/js/Pages/Dashboard.jsx` (quick action card)

### Backend Files

- `routes/web.php`
- `app/Http/Controllers/ProcurementController.php`
- `app/Models/ProcurementOrder.php`
- `app/Models/ProcurementOrderLine.php`
- `app/Models/ProcurementOrderPackageLine.php`

### Data Model Used

Table: `procurement_orders`
- `id`, `code` (unique), `status` (`draft|partial|received`), `created_by`, `notes`

Table: `procurement_order_package_lines`
- `id`, `procurement_order_id`, `package_id`, `quantity`

Table: `procurement_order_lines`
- `id`, `procurement_order_id`, `item_id`
- `suggested_quantity`, `ordered_quantity`
- `received_quantity`, `rejected_quantity`

Table: `procurement_order_sales_order`
- `id`, `procurement_order_id`, `sales_order_id`
- records source sales orders used to generate each procurement draft

### End-to-End Flow

1. Procurement opens `/procurement`.
2. System scans all `sales_orders` with status `open`.
3. Demand is exploded by package composition into SKU demand.
4. System compares SKU demand with `item_variants.stock_current`.
5. Shortage list is shown in two views:
   - package demand summary
   - SKU shortage list (qty to order from supplier)
6. System also shows source sales orders (`open` + `partial`) for audit.
6. Procurement clicks `Generate Procurement Draft`.
7. System stores header + package lines + SKU lines + source sales order links.
8. When supplier stock arrives, store keeper enters received qty per SKU.
9. System auto-calculates rejected qty (`ordered - received`).
10. Received qty is added to inventory (`stock_initial` and `stock_current`).
11. Draft procurement order can be deleted by `procurement` or `super_admin`.

---

## FUNC-007: Rejected List Audit

### Purpose

Separate rejected stock audit from procurement input screen, so procurement UI remains focused on order + receiving.

### Access Control

- Middleware: `auth`
- View permission: `store_keeper`, `procurement`, `super_admin`

### Entry Points

- Page: `GET /rejections`

### UI Files

- `resources/js/Pages/Rejections/Index.jsx`
- `resources/js/Layouts/AuthenticatedLayout.jsx` (navigation link)
- `resources/js/Pages/Dashboard.jsx` (quick action card)

### Backend Files

- `routes/web.php`
- `app/Http/Controllers/ProcurementController.php` (`rejectedList`)

### Behavior

1. System reads `procurement_order_lines` where `rejected_quantity > 0`.
2. Data is grouped by procurement order.
3. Rejected page shows SKU, ordered qty, received qty, and rejected qty.
4. Procurement page no longer shows rejected list inline.
