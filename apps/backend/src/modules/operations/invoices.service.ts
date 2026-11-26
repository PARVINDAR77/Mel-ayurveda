import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly companyHomeState = 'gujarat';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates sequential tax invoice number: MEL-INV-YYYY-XXXXX
   */
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MEL-INV-${year}-`;
    const existing = await this.prisma.invoice.findMany({
      where: { invoiceNumber: { startsWith: prefix } },
      select: { invoiceNumber: true },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    });

    let maxNumber = 100; // Baseline starting number
    for (const inv of existing) {
      const numPart = inv.invoiceNumber.replace(prefix, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  /**
   * Generates GST Tax Invoice with intelligent CGST/SGST vs IGST bifurcation
   */
  async generateInvoice(orderId: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        invoice: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status === OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot generate GST tax invoice for a DRAFT order. Order must be confirmed first.',
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot generate invoice for a CANCELLED order');
    }

    if (order.invoice) {
      throw new ConflictException(
        `Invoice ${order.invoice.invoiceNumber} has already been issued for order ${order.orderNumber}`,
      );
    }

    const totalTax = Number(order.taxAmount);
    const grandTotal = Number(order.totalAmount);
    const customerState = order.customer.state?.trim().toLowerCase() || '';

    // Indian GST Tax Rules:
    // Intra-state (Within Gujarat) -> CGST 50% + SGST 50%
    // Inter-state (Outside Gujarat) -> IGST 100%
    const isIntraState = customerState === this.companyHomeState;

    let cgstAmount = 0.0;
    let sgstAmount = 0.0;
    let igstAmount = 0.0;

    if (isIntraState) {
      cgstAmount = Number((totalTax / 2).toFixed(2));
      sgstAmount = Number((totalTax / 2).toFixed(2));
      igstAmount = 0.0;
    } else {
      cgstAmount = 0.0;
      sgstAmount = 0.0;
      igstAmount = Number(totalTax.toFixed(2));
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalTax: Number(totalTax.toFixed(2)),
          grandTotal: Number(grandTotal.toFixed(2)),
        },
        include: {
          order: {
            include: {
              customer: true,
              items: {
                include: { product: true },
              },
            },
          },
        },
      });

      // 2. Advance confirmed order to PROCESSING if needed
      if (order.status === OrderStatus.CONFIRMED) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PROCESSING },
        });
      }

      // 3. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'INVOICE_GENERATED',
          entityType: 'Invoice',
          entityId: invoice.id,
          newState: {
            invoiceNumber: invoice.invoiceNumber,
            orderNumber: order.orderNumber,
            taxBifurcation: isIntraState ? 'CGST+SGST' : 'IGST',
            grandTotal: invoice.grandTotal,
            issuedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Invoice ${invoice.invoiceNumber} generated for order ${order.orderNumber}. Tax: ₹${totalTax} (${isIntraState ? 'CGST+SGST' : 'IGST'}). Grand Total: ₹${grandTotal}`,
      );

      return invoice;
    });
  }

  /**
   * Retrieves all invoices
   */
  async findAll(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { order: { customer: { fullName: { contains: q, mode: 'insensitive' } } } },
        { order: { customer: { phoneNumber: { contains: q } } } },
      ];
    }

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              paymentMode: true,
              customer: {
                select: {
                  customerCode: true,
                  fullName: true,
                  phoneNumber: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves invoice by order ID
   */
  async findByOrderId(orderId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice for order ID ${orderId} not found`);
    }

    return invoice;
  }

  /**
   * Retrieves single invoice by ID
   */
  async findById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  /**
   * Retrieves confirmed orders awaiting billing (Approved, but no invoice yet)
   */
  async getBillingQueue(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {
      status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
      invoice: null,
    };

    if (search && search.trim()) {
      const q = search.trim();
      const phoneDigits = q.replace(/\D/g, '').slice(-10);
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customer: { fullName: { contains: q, mode: 'insensitive' } } },
        { customer: { phoneNumber: { contains: q } } },
        { customer: { alternatePhone: { contains: q } } },
        { customer: { customerCode: { contains: q, mode: 'insensitive' } } },
        { notes: { contains: q, mode: 'insensitive' } },
        ...(phoneDigits ? [{ customer: { phoneNumber: { contains: phoneDigits } } }] : []),
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              fullName: true,
              phoneNumber: true,
              alternatePhone: true,
              address: true,
              city: true,
              state: true,
              pincode: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  sellingPrice: true,
                  mrpPrice: true,
                  gstRate: true,
                  targetDisease: true,
                  dosageForm: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * KPI metrics for the Billing Workspace
   */
  async getBillingStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      awaitingBillingCount,
      billedTodayCount,
      totalInvoicedRevenue,
      lowStockAlerts,
      totalInvoicesCount,
      totalInventoryCount,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
          invoice: null,
        },
      }),
      this.prisma.invoice.count({
        where: {
          issuedAt: { gte: today },
        },
      }),
      this.prisma.invoice.aggregate({
        _sum: { grandTotal: true },
      }),
      this.prisma.inventory.count({
        where: {
          availableQuantity: { lte: 20 },
        },
      }),
      this.prisma.invoice.count(),
      this.prisma.inventory.count(),
    ]);

    return {
      awaitingBillingCount,
      billedTodayCount,
      totalInvoicedRevenue: Number(totalInvoicedRevenue._sum.grandTotal || 0),
      lowStockAlerts,
      totalInvoicesCount,
      totalInventoryCount,
    };
  }
}
