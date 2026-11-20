# Panel 05: Management Panel Specification

## 1. Overview & Authority
The **Management Panel** orchestrates the operational, commercial, and logistics engine of MELAYURVEDA INDIA PVT. LTD. Once leads are approved, management personnel handle customer onboarding, product catalog governance, sales draft confirmation, warehouse inventory allocation, GST invoice generation, and courier dispatch.

- **Primary Persona**: Operations Manager / Logistics Coordinator / Accounts Officer.
- **Identifier Prefix**: `MEL-MGT-XXX` (e.g., `MEL-MGT-001`).
- **Dashboard Title**: Customers • Orders • Business Operations.

## 2. Core Modules & Capabilities

### 2.1 Management Dashboard Metrics
- **Total Customers**: Verified customer base (`MEL-CUST-XXXXXX`).
- **Total Orders**: All draft, confirmed, shipped, and delivered orders.
- **Total Sales**: Aggregate revenue (₹) with monthly/weekly trend comparison.
- **Delivery Success Rate**: Percentage of successfully delivered parcels vs returned-to-origin (RTO).
- **Sales Overview Chart**: Area/line chart showing revenue trends over time.
- **Top Ayurvedic Products**: Breakdown of top revenue-generating formulations (e.g., Immunity Booster 40%, Joint Care 32%, Digestive Care 28%).
- **Recent Orders Table**: Live snapshot of latest orders with status tags (`PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`).

### 2.2 Customer Management
- Transform approved leads into customer records with a single click.
- Maintain permanent customer records with lifetime order history, clinical notes, and address book.

### 2.3 Disease-Wise Product Catalog
- Organize Ayurvedic formulations into therapeutic disease categories:
  - *Joint & Bone Health* (Artho-Care Oil, Shallaki Tablets)
  - *Digestive & Metabolism* (Triphala Churna, Pachak Syrup)
  - *Immunity & Rejuvenation* (Chyawanprash Special, Ashwagandha Gold)
  - *Skin & Hair Care* (Bhringraj Hair Elixir, Kumkumadi Tailam)
  - *Diabetic Care & Metabolic Balance* (Karela Jamun Juice, Madhu-Nashini)
- Manage product SKU, batch numbers, MRP, discounted selling price, GST rates (5%, 12%, 18%), and stock threshold alerts.

### 2.4 Order Lifecycle & Billing
- **Sales Draft**: Compile ordered items, dosage instructions, and applied discounts.
- **Final Confirmation**: Verify order with customer via phone/WhatsApp confirmation.
- **GST Invoicing**: Generate sequential tax invoice (`MEL-INV-YYYY-XXXXX`) calculating CGST, SGST, or IGST based on shipping state.
- **Payment Recording**: Support Cash on Delivery (COD), UPI, Bank Transfer, and Card payments with transaction reference numbers.

### 2.5 Inventory & Warehouse Stock
- Real-time stock levels per SKU.
- Atomic stock decrement upon order confirmation.
- Warehouse restock transaction logging with batch expiration tracking.

### 2.6 Courier & Dispatch Integration
- Assign courier partners (Delhivery, BlueDart, DTDC, India Post).
- Record AWB Tracking Number, dispatch date, and tracking URL.
- Track shipment status: `MANIFESTED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `RTO`.
