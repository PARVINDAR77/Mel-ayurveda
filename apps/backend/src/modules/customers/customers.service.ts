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
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
