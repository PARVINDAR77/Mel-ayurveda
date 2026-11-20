import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadSourceDto, UpdateLeadSourceDto } from './dto/create-lead-source.dto';

@Injectable()
export class LeadSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadSourceDto) {
    const existing = await this.prisma.leadSource.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Lead source '${dto.name}' already exists`);
    }

    return this.prisma.leadSource.create({
      data: {
        name: dto.name.trim(),
        sourceType: dto.sourceType,
        description: dto.description?.trim(),
      },
    });
  }

  async findAll() {
    return this.prisma.leadSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  async findById(id: string) {
    const source = await this.prisma.leadSource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
    if (!source) {
      throw new NotFoundException(`Lead source with ID ${id} not found`);
    }
    return source;
  }

  async update(id: string, dto: UpdateLeadSourceDto) {
    await this.findById(id);
    return this.prisma.leadSource.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
      },
    });
  }

  async getAnalyticsSummary() {
    const sources = await this.prisma.leadSource.findMany({
      include: {
        leads: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return sources.map((s) => {
      const totalLeads = s.leads.length;
      const convertedCount = s.leads.filter((l) => l.status === 'CONVERTED').length;
      const approvedCount = s.leads.filter((l) => l.status === 'APPROVED').length;
      return {
        id: s.id,
        name: s.name,
        sourceType: s.sourceType,
        totalLeads,
        approvedCount,
        convertedCount,
        conversionRate: totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) + '%' : '0%',
      };
    });
  }
}
