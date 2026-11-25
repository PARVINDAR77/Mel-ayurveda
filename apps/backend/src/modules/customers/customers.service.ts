import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { RouteCustomerToSalesDto } from './dto/route-customer-to-sales.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  LeadStatus,
  LeadPriority,
  OrderStatus,
  InventoryTxType,
  NotificationType,
  RoleType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generates sequential unique customer identifier: MEL-CUST-000101, MEL-CUST-000102, ...
   */
  async generateCustomerCode(): Promise<string> {
    const prefix = 'MEL-CUST-';
    const existing = await this.prisma.customer.findMany({
      where: { customerCode: { startsWith: prefix } },
      select: { customerCode: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let maxNumber = 100; // Baseline starting number
    for (const c of existing) {
      const numPart = c.customerCode.replace(prefix, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Convert an APPROVED customer product lead into a permanent Customer CRM record.
   * STRICT INVARIANTS:
   * 1. Only leads in APPROVED state can be converted.
   * 2. Idempotency: Re-converting an already converted lead is rejected (HTTP 409).
   * 3. Transitions lead state: APPROVED -> CONVERTED.
   * 4. Sequential ID generation: MEL-CUST-XXXXXX.
   */
  async convertLeadToCustomer(
    leadId: string,
    dto: ConvertLeadDto,
    user: AuthenticatedUser,
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { customer: true },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    // STRICT INVARIANT 1: Prevent duplicate conversion
    if (lead.status === LeadStatus.CONVERTED || lead.customer) {
      throw new ConflictException(
        `This lead has already been converted to customer ${lead.customer?.customerCode || ''}`.trim(),
      );
    }

    // STRICT INVARIANT 2: Lead must be in APPROVED state
    if (lead.status !== LeadStatus.APPROVED) {
      this.logger.warn(
        `Conversion blocked: Lead ${lead.leadCode} has status ${lead.status} (Expected APPROVED)`,
      );
      throw new BadRequestException(
        `Only APPROVED leads can be converted into customers. Current lead status is: ${lead.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Check if a customer record with the same primary phone number already exists
      let customer = await tx.customer.findUnique({
        where: { phoneNumber: lead.phoneNumber },
      });

      if (!customer) {
        const customerCode = await this.generateCustomerCode();
        customer = await tx.customer.create({
          data: {
            customerCode,
            convertedFromId: lead.id,
            fullName: lead.customerName,
            phoneNumber: lead.phoneNumber,
            alternatePhone: dto.alternatePhone || lead.alternatePhone,
            email: dto.email || lead.email,
            address: dto.address || lead.address,
            city: dto.city || lead.city,
            state: dto.state || lead.state,
            pincode: dto.pincode,
          },
        });
      } else if (!customer.convertedFromId) {
        // Link existing customer to this originating lead
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { convertedFromId: lead.id },
        });
      }

      // 2. Transition lead status to CONVERTED
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: new Date(),
        },
      });

      // 3. Record status transition history
      await tx.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: LeadStatus.APPROVED,
          toStatus: LeadStatus.CONVERTED,
          changedById: user.id,
          reason: `Converted to Customer ${customer.customerCode}`,
        },
      });

      // 4. Record audit trail
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'LEAD_CONVERTED_TO_CUSTOMER',
          entityType: 'Customer',
          entityId: customer.id,
          newState: {
            customerCode: customer.customerCode,
            leadCode: lead.leadCode,
            fullName: customer.fullName,
            convertedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Lead ${lead.leadCode} successfully converted to Customer ${customer.customerCode} by ${user.employeeCode}`,
      );

      return {
        success: true,
        customer,
        previousLeadStatus: LeadStatus.APPROVED,
        leadStatus: LeadStatus.CONVERTED,
      };
    });
  }

  /**
   * Directly creates a customer (e.g. direct retail or medicine inquiry customer)
   */
  async createCustomer(dto: CreateCustomerDto, user: AuthenticatedUser) {
    const existing = await this.prisma.customer.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existing) {
      throw new ConflictException(
        `A customer with phone number ${dto.phoneNumber} already exists (${existing.customerCode})`,
      );
    }

    const customerCode = await this.generateCustomerCode();

    const customer = await this.prisma.customer.create({
      data: {
        customerCode,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber.trim(),
        alternatePhone: dto.alternatePhone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        pincode: dto.pincode?.trim(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CUSTOMER_CREATED_DIRECT',
        entityType: 'Customer',
        entityId: customer.id,
        newState: { customerCode: customer.customerCode, fullName: customer.fullName },
      },
    });

    return customer;
  }

  /**
   * Retrieves list of customers with order counts and search
   */
  async findAll(query: CustomerQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
        { customerCode: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          convertedFrom: {
            select: {
              id: true,
              leadCode: true,
              productInterest: true,
              priority: true,
            },
          },
          _count: {
            select: { orders: true },
          },
        },
      }),
    ]);

    return {
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single comprehensive customer CRM profile
   */
  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            invoice: true,
            shipment: true,
          },
        },
        convertedFrom: {
          include: {
            assignedTo: {
              select: { id: true, employeeCode: true, firstName: true, lastName: true },
            },
            callLogs: {
              orderBy: { calledAt: 'desc' },
              take: 5,
              include: {
                caller: {
                  select: { id: true, employeeCode: true, firstName: true, lastName: true },
                },
              },
            },
            pendingReviews: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            approvalRequests: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Updates customer profile
   */
  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto,
    user: AuthenticatedUser,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim() || customer.fullName,
        alternatePhone:
          dto.alternatePhone !== undefined
            ? dto.alternatePhone?.trim() || null
            : customer.alternatePhone,
        email:
          dto.email !== undefined
            ? dto.email?.trim().toLowerCase() || null
            : customer.email,
        address:
          dto.address !== undefined
            ? dto.address?.trim() || null
            : customer.address,
        city: dto.city !== undefined ? dto.city?.trim() || null : customer.city,
        state: dto.state !== undefined ? dto.state?.trim() || null : customer.state,
        pincode:
          dto.pincode !== undefined
            ? dto.pincode?.trim() || null
            : customer.pincode,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CUSTOMER_UPDATED',
        entityType: 'Customer',
        entityId: customer.id,
        newState: {
          customerCode: customer.customerCode,
          updatedFields: JSON.parse(JSON.stringify(dto)),
          updatedBy: user.employeeCode,
        },
      },
    });

    return updated;
  }

  /**
   * Customer CRM KPIs
   */
  async getMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCustomers, convertedFromLeads, createdThisMonth] =
      await Promise.all([
        this.prisma.customer.count(),
        this.prisma.customer.count({
          where: { convertedFromId: { not: null } },
        }),
        this.prisma.customer.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
      ]);

    return {
      totalCustomers,
      convertedFromLeads,
      createdThisMonth,
    };
  }

  /**
   * Retrieves all active sales consultants for re-assignment
   */
  async getActiveSalespersons() {
    return this.prisma.user.findMany({
      where: {
        role: RoleType.SALESPERSON,
        isActive: true,
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        isAcceptingLeads: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Routes a customer back to the sales desk when an order is cancelled or customer needs re-engagement.
   * Atomically:
   * 1. Cancels active/confirmed order & returns reserved stock back to warehouse inventory.
   * 2. Re-opens or generates a high-priority URGENT lead assigned to the specific salesperson.
   * 3. Attaches management's directive note to the lead record.
   * 4. Pushes an URGENT real-time notification with audio alert to the salesperson's desk.
   */
  async routeToSales(
    customerId: string,
    dto: RouteCustomerToSalesDto,
    user: AuthenticatedUser,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        convertedFrom: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const salesperson = await this.prisma.user.findUnique({
      where: { id: dto.assignedSalespersonId },
    });

    if (!salesperson) {
      throw new NotFoundException(`Salesperson with ID ${dto.assignedSalespersonId} not found`);
    }

    // Determine target order to cancel, if any
    let targetOrder: any = null;
    if (dto.orderId) {
      targetOrder = customer.orders.find((o) => o.id === dto.orderId);
      if (!targetOrder) {
        targetOrder = await this.prisma.order.findUnique({
          where: { id: dto.orderId },
          include: { items: true },
        });
      }
    } else {
      // Auto-target most recent CONFIRMED or DRAFT order
      targetOrder = customer.orders.find(
        (o) => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.DRAFT,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. If target order is CONFIRMED, return reserved inventory batches back to available pool
      if (targetOrder && targetOrder.status === OrderStatus.CONFIRMED) {
        for (const item of targetOrder.items) {
          const inv = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });

          if (inv) {
            const newAvailable = inv.availableQuantity + item.quantity;
            const newReserved = Math.max(0, inv.reservedQuantity - item.quantity);

            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                availableQuantity: newAvailable,
                reservedQuantity: newReserved,
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inv.id,
                type: InventoryTxType.ORDER_CANCELLED,
                quantity: item.quantity,
                balanceAfter: newAvailable,
                notes: `Stock returned: Order ${targetOrder.orderNumber} cancelled & routed to sales by ${user.employeeCode}`,
              },
            });
          }
        }
      }

      // 2. Mark order CANCELLED if active
      if (targetOrder && (targetOrder.status === OrderStatus.CONFIRMED || targetOrder.status === OrderStatus.DRAFT)) {
        await tx.order.update({
          where: { id: targetOrder.id },
          data: {
            status: OrderStatus.CANCELLED,
            notes: targetOrder.notes
              ? `${targetOrder.notes} | Cancelled by management: ${dto.cancellationReason || 'Customer requested removal'} (${dto.directiveMessage})`
              : `Cancelled by management: ${dto.cancellationReason || 'Customer requested removal'} (${dto.directiveMessage})`,
          },
        });
      }

      // 3. Re-open existing Lead or create new re-engagement recovery Lead
      const directiveHeader = `🚨 [MANAGEMENT DIRECTIVE - ${user.employeeCode} (${new Date().toLocaleDateString('en-IN')})]: ${dto.directiveMessage.trim()}`;
      let activeLead: any = customer.convertedFrom;

      if (activeLead) {
        activeLead = await tx.lead.update({
          where: { id: activeLead.id },
          data: {
            status: LeadStatus.FOLLOW_UP_REQUIRED,
            priority: LeadPriority.URGENT,
            assignedToId: dto.assignedSalespersonId,
            assignedAt: new Date(),
            customerRequirements: activeLead.customerRequirements
              ? `${directiveHeader}\n\n${activeLead.customerRequirements}`
              : directiveHeader,
            notes: activeLead.notes
              ? `${directiveHeader}\n\n${activeLead.notes}`
              : directiveHeader,
          },
        });

        await tx.leadStatusHistory.create({
          data: {
            leadId: activeLead.id,
            fromStatus: LeadStatus.CONVERTED,
            toStatus: LeadStatus.FOLLOW_UP_REQUIRED,
            changedById: user.id,
            reason: `Order cancelled & routed to ${salesperson.firstName} ${salesperson.lastName}: ${dto.directiveMessage.slice(0, 450)}`,
          },
        });
      } else {
        const year = new Date().getFullYear();
        const prefix = `MEL-LEAD-${year}-`;
        const count = await tx.lead.count();
        const leadCode = `${prefix}${String(count + 101).padStart(5, '0')}`;

        activeLead = await tx.lead.create({
          data: {
            leadCode,
            customerName: customer.fullName,
            phoneNumber: customer.phoneNumber,
            alternatePhone: customer.alternatePhone,
            city: customer.city,
            state: customer.state,
            address: customer.address,
            status: LeadStatus.FOLLOW_UP_REQUIRED,
            priority: LeadPriority.URGENT,
            assignedToId: dto.assignedSalespersonId,
            assignedAt: new Date(),
            createdById: user.id,
            productInterest: 'Ayurvedic Deal Recovery',
            customerRequirements: directiveHeader,
            notes: directiveHeader,
          },
        });

        await tx.customer.update({
          where: { id: customer.id },
          data: { convertedFromId: activeLead.id },
        });

        await tx.leadStatusHistory.create({
          data: {
            leadId: activeLead.id,
            fromStatus: LeadStatus.NEW,
            toStatus: LeadStatus.FOLLOW_UP_REQUIRED,
            changedById: user.id,
            reason: `Direct walk-in recovery lead created: ${dto.directiveMessage.slice(0, 450)}`,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CUSTOMER_ROUTED_TO_SALES',
          entityType: 'Customer',
          entityId: customer.id,
          newState: {
            customerCode: customer.customerCode,
            leadCode: activeLead.leadCode,
            assignedSalesperson: salesperson.employeeCode,
            cancelledOrderNumber: targetOrder?.orderNumber,
            directive: dto.directiveMessage,
            reason: dto.cancellationReason,
          },
        },
      });

      return {
        customer,
        lead: activeLead,
        cancelledOrder: targetOrder,
        salesperson,
      };
    });

    // 5. Send Real-Time URGENT Notification to Salesperson
    try {
      const orderInfo = result.cancelledOrder ? ` (Order ${result.cancelledOrder.orderNumber} Cancelled)` : '';
      await this.notificationsService.createNotification({
        userId: dto.assignedSalespersonId,
        title: `🚨 Customer Re-routed to Your Desk: ${customer.fullName}`,
        message: `Management Directive: "${dto.directiveMessage.slice(0, 140)}..."${orderInfo}. Please call and re-engage immediately.`,
        type: NotificationType.URGENT,
        link: `/sales/calling?leadId=${result.lead.id}`,
      });
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch recovery notification: ${notifErr}`);
    }

    return {
      success: true,
      message: `Customer ${customer.fullName} successfully re-assigned to ${salesperson.firstName} ${salesperson.lastName} (${salesperson.employeeCode}).`,
      data: result,
    };
  }
}
