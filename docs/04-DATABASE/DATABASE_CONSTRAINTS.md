# Database Constraints & Invariants

## 1. Unique Natural Identifiers
- **Employee Identifiers**: `users.employeeCode` is globally unique (e.g. `MEL-ADM-001`, `MEL-SAL-001`).
- **Lead Code**: `leads.leadCode` is globally unique (e.g. `MEL-LEAD-000101`).
- **Customer Code**: `customers.customerCode` is globally unique (e.g. `MEL-CUST-000101`).
- **Order Number**: `orders.orderNumber` is globally unique (e.g. `MEL-ORD-1024`).
- **Invoice Number**: `invoices.invoiceNumber` is globally unique (e.g. `MEL-INV-2026-0001`).
- **Shipment AWB**: `shipments.trackingAwb` is globally unique.
- **Product SKU**: `products.sku` is globally unique.

## 2. Check Constraints & Validation
- Mobile numbers must match `^[6-9]d{9}$`.
- Price and financial amounts must be non-negative (`subtotal >= 0`, `discountAmount >= 0`, `totalAmount >= 0`).
- Inventory available quantities must not drop below zero in the transaction engine.
- Call durations must be non-negative integers.

## 3. Foreign Key Deletion Rules
- **Cascade Deletes**: Permitted ONLY on transient sub-entities such as `order_items` when an unconfirmed draft order is deleted.
- **Restricted / No-Action Deletes**: Applied to all primary business entities (`leads`, `users`, `customers`, `orders`, `invoices`). Deleting a user or lead with associated history is strictly blocked by the database engine.
