import { ExcelColumnDef } from './export-excel';

/**
 * Official 27-Column Melayurveda Sales Excel Export Definition for Orders
 * Strictly matches the official spreadsheet template:
 * 1. Source Of Lead
 * 2. PAYMENT MODE
 * 3. DELIVERED / INTRANSIT/RTO/SHIPPED
 * 4. ORDER ID
 * 5. DATE
 * 6. Agent
 * 7. CUSTOMER'S NAME
 * 8. MOBILE
 * 9. AL. MOBILE
 * 10. ADDRESS
 * 11. PIN CODE
 * 12. CITY
 * 13. STATE
 * 14. DISEASE
 * 15. AMOUNT
 * 16. PRODUCT - 1
 * 17. QUANITY
 * 18. PRODUCT - 2
 * 19. QUANITY
 * 20. PRODUCT - 3
 * 21. QUANITY
 * 22. PRODUCT - 4
 * 23. QUANITY
 * 24. PRODUCT - 5
 * 25. QUANITY
 * 26. PRODUCT - 6
 * 27. QUANITY
 */
export const OFFICIAL_SALES_ORDERS_EXPORT_COLUMNS: ExcelColumnDef[] = [
  {
    header: 'Source Of Lead',
    width: 18,
    accessor: (o: any) => {
      const src =
        o.customer?.convertedFrom?.sourceType ||
        o.customer?.sourceType ||
        o.customer?.source ||
        o.sourceType ||
        'Tele-Sales';
      return typeof src === 'string' ? src.replace(/_/g, ' ') : 'Tele-Sales';
    },
  },
  {
    header: 'PAYMENT MODE',
    width: 16,
    accessor: (o: any) => {
      const mode = o.paymentMode || o.paymentMethod || 'COD';
      if (mode === 'CASH_ON_DELIVERY') return 'COD';
      return String(mode).replace(/_/g, ' ');
    },
  },
  {
    header: 'DELIVERED / INTRANSIT/RTO/SHIPPED',
    width: 32,
    accessor: (o: any) => {
      const shipStatus = o.shipment?.status;
      if (shipStatus) return String(shipStatus).replace(/_/g, ' ');
      const ordStatus = o.orderStatus || o.status;
      if (ordStatus === 'CONFIRMED' || ordStatus === 'APPROVED') return 'CONFIRMED';
      if (ordStatus === 'DELIVERED') return 'DELIVERED';
      if (ordStatus === 'SHIPPED') return 'SHIPPED';
      return ordStatus ? String(ordStatus).replace(/_/g, ' ') : 'PENDING';
    },
  },
  {
    header: 'ORDER ID',
    width: 22,
    accessor: (o: any) => o.orderNumber || '',
  },
  {
    header: 'DATE',
    width: 14,
    accessor: (o: any) => {
      if (!o.createdAt) return '';
      const d = new Date(o.createdAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    },
  },
  {
    header: 'Agent',
    width: 24,
    accessor: (o: any) => {
      if (o.createdBy) {
        const name = `${o.createdBy.firstName || ''} ${o.createdBy.lastName || ''}`.trim();
        const code = o.createdBy.employeeCode ? ` (${o.createdBy.employeeCode})` : '';
        return (name + code).trim() || 'Sales Consultant';
      }
      return o.creator?.employeeCode || o.creator?.fullName || o.assignedUser?.fullName || 'Sales Consultant';
    },
  },
  {
    header: "CUSTOMER'S NAME",
    width: 24,
    accessor: (o: any) => o.customer?.fullName || '',
  },
  {
    header: 'MOBILE',
    width: 16,
    accessor: (o: any) => o.customer?.phoneNumber || '',
  },
  {
    header: 'AL. MOBILE',
    width: 16,
    accessor: (o: any) => o.customer?.alternatePhone || o.customer?.convertedFrom?.alternatePhone || '',
  },
  {
    header: 'ADDRESS',
    width: 38,
    accessor: (o: any) => o.customer?.address || o.shippingAddress || o.customer?.convertedFrom?.address || '',
  },
  {
    header: 'PIN CODE',
    width: 12,
    accessor: (o: any) => o.customer?.pincode || o.pincode || '',
  },
  {
    header: 'CITY',
    width: 16,
    accessor: (o: any) => o.customer?.city || '',
  },
  {
    header: 'STATE',
    width: 16,
    accessor: (o: any) => o.customer?.state || '',
  },
  {
    header: 'DISEASE',
    width: 20,
    accessor: (o: any) => {
      return (
        o.items?.[0]?.product?.targetDisease ||
        o.customer?.convertedFrom?.productInterest ||
        o.productInterest ||
        'General Wellness'
      );
    },
  },
  {
    header: 'AMOUNT',
    width: 14,
    accessor: (o: any) => Number(o.totalAmount || o.grandTotal || 0),
  },
  {
    header: 'PRODUCT - 1',
    width: 26,
    accessor: (o: any) => o.items?.[0]?.product?.name || o.items?.[0]?.productName || '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: (o: any) => (o.items?.[0] ? o.items[0].quantity : ''),
  },
  {
    header: 'PRODUCT - 2',
    width: 26,
    accessor: (o: any) => o.items?.[1]?.product?.name || o.items?.[1]?.productName || '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: (o: any) => (o.items?.[1] ? o.items[1].quantity : ''),
  },
  {
    header: 'PRODUCT - 3',
    width: 26,
    accessor: (o: any) => o.items?.[2]?.product?.name || o.items?.[2]?.productName || '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: (o: any) => (o.items?.[2] ? o.items[2].quantity : ''),
  },
  {
    header: 'PRODUCT - 4',
    width: 26,
    accessor: (o: any) => o.items?.[3]?.product?.name || o.items?.[3]?.productName || '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: (o: any) => (o.items?.[3] ? o.items[3].quantity : ''),
  },
  {
    header: 'PRODUCT - 5',
    width: 26,
    accessor: (o: any) => o.items?.[4]?.product?.name || o.items?.[4]?.productName || '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: (o: any) => (o.items?.[4] ? o.items[4].quantity : ''),
  },
  {
    header: 'PRODUCT - 6',
    width: 26,
    accessor: (o: any) => o.items?.[5]?.product?.name || o.items?.[5]?.productName || '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: (o: any) => (o.items?.[5] ? o.items[5].quantity : ''),
  },
];

/**
 * Official 27-Column Melayurveda Sales Excel Export Definition for Leads
 * Strictly matches the official spreadsheet template:
 */
export const OFFICIAL_SALES_LEADS_EXPORT_COLUMNS: ExcelColumnDef[] = [
  {
    header: 'Source Of Lead',
    width: 18,
    accessor: (l: any) => {
      const src = l.source?.name || l.sourceType || 'Inbound Direct';
      return typeof src === 'string' ? src.replace(/_/g, ' ') : 'Inbound Direct';
    },
  },
  {
    header: 'PAYMENT MODE',
    width: 16,
    accessor: (l: any) => l.paymentMode || 'COD',
  },
  {
    header: 'DELIVERED / INTRANSIT/RTO/SHIPPED',
    width: 32,
    accessor: (l: any) => l.stage || l.status || 'NEW',
  },
  {
    header: 'ORDER ID',
    width: 22,
    accessor: (l: any) => l.leadCode || l.leadNumber || '',
  },
  {
    header: 'DATE',
    width: 14,
    accessor: (l: any) => {
      if (!l.createdAt) return '';
      const d = new Date(l.createdAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    },
  },
  {
    header: 'Agent',
    width: 24,
    accessor: (l: any) => {
      if (l.assignedTo) {
        const name = `${l.assignedTo.firstName || ''} ${l.assignedTo.lastName || ''}`.trim();
        const code = l.assignedTo.employeeCode ? ` (${l.assignedTo.employeeCode})` : '';
        return (name + code).trim() || 'Sales Consultant';
      }
      return 'Sales Consultant';
    },
  },
  {
    header: "CUSTOMER'S NAME",
    width: 24,
    accessor: (l: any) => l.customerName || '',
  },
  {
    header: 'MOBILE',
    width: 16,
    accessor: (l: any) => l.phoneNumber || l.primaryPhone || '',
  },
  {
    header: 'AL. MOBILE',
    width: 16,
    accessor: (l: any) => l.alternatePhone || '',
  },
  {
    header: 'ADDRESS',
    width: 38,
    accessor: (l: any) => l.address || '',
  },
  {
    header: 'PIN CODE',
    width: 12,
    accessor: (l: any) => l.pincode || '',
  },
  {
    header: 'CITY',
    width: 16,
    accessor: (l: any) => l.city || '',
  },
  {
    header: 'STATE',
    width: 16,
    accessor: (l: any) => l.state || '',
  },
  {
    header: 'DISEASE',
    width: 20,
    accessor: (l: any) => l.primaryAilment || l.productInterest || 'General Wellness',
  },
  {
    header: 'AMOUNT',
    width: 14,
    accessor: (l: any) => Number(l.estimatedValue || l.orderTotal || 0),
  },
  {
    header: 'PRODUCT - 1',
    width: 26,
    accessor: (l: any) => l.productInterest || '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: (l: any) => (l.productInterest ? 1 : ''),
  },
  {
    header: 'PRODUCT - 2',
    width: 26,
    accessor: () => '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: () => '',
  },
  {
    header: 'PRODUCT - 3',
    width: 26,
    accessor: () => '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: () => '',
  },
  {
    header: 'PRODUCT - 4',
    width: 26,
    accessor: () => '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: () => '',
  },
  {
    header: 'PRODUCT - 5',
    width: 26,
    accessor: () => '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: () => '',
  },
  {
    header: 'PRODUCT - 6',
    width: 26,
    accessor: () => '',
  },
  {
    header: 'QUANITY',
    width: 10,
    accessor: () => '',
  },
];
