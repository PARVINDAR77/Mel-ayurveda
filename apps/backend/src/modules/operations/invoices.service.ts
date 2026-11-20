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
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count(),
      this.prisma.invoice.findMany({
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: {
                select: {
                  customerCode: true,
                  fullName: true,
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
}
