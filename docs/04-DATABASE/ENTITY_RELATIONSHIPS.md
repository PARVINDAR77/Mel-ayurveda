# Entity Relationship Specifications

## 1. Domain Boundary Decomposition
The schema is partitioned into five tightly governed functional domains:

1. **Identity & Access Management (IAM)**:
   - `User` 1:N `UserSession` (User active login sessions)
   - `User` 1:N `RefreshToken` (Cryptographic rotation tokens)
   - `User` 1:N `AuditLog` (Actions initiated by the user)

2. **Lead Intake & Distribution**:
   - `LeadSource` 1:N `Lead` (Channel of origination)
   - `User` 1:N `Lead` (`createdById` for manual creation)
   - `User` 1:N `Lead` (`assignedToId` for tele-consultant ownership)
   - `Lead` 1:N `LeadAssignment` (Immutable assignment audit trail)
   - `Lead` 1:N `LeadStatusHistory` (State transition ledger)

3. **Engagement & Triage**:
   - `Lead` 1:N `CallLog` (Append-only consultation records)
   - `Lead` 1:N `FollowUp` (Scheduled customer callbacks)
   - `Lead` 1:N `PendingReview` (Quality audit dossiers)
   - `Lead` 1:N `ApprovalRequest` (Commercial/medical sign-off records)

4. **Commercial Conversion & Fulfillment**:
   - `Lead` 1:1 `Customer` (Converted customer profile)
   - `Customer` 1:N `Order` (Purchases placed by customer)
   - `ProductCategory` 1:N `Product` (Therapeutic formulation categories)
   - `Order` 1:N `OrderItem` (Items included in order)
   - `Product` 1:N `OrderItem`
   - `Product` 1:1 `Inventory` (Warehouse balance per SKU)
   - `Inventory` 1:N `InventoryTransaction` (Stock ledger)
   - `Order` 1:1 `Invoice` (Tax invoice per order)
   - `Order` 1:1 `Shipment` (Courier logistics tracking)

5. **Auditing & Governance**:
   - `AuditLog` captures polymorphic state diffs for any modified entity.
