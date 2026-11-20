# Lead Source Privacy Specification

## 1. Business Mandate
MELAYURVEDA INDIA PVT. LTD. considers digital marketing acquisition intelligence, ad campaign strategies, cost-per-lead (CPL) data, and channel performance proprietary intellectual property.

**Core Rule**: Under no operational scenario shall a sales representative or tele-caller have access to:
- Marketing Channel Source (`Facebook`, `Instagram`, `Google Ads`, `Website`, `WhatsApp`, `Manual`)
- Campaign Name, Campaign ID, AdSet ID, Ad ID
- Ad Creative or Copy Details
- Cost per acquisition, spend, or marketing budget
- External platform tracking tokens or raw webhook payloads

## 2. Technical Implementation Architecture

### 2.1 Backend DTO Projection
Never rely on the frontend to hide fields. The NestJS backend enforces strict response segregation at the controller level:

```typescript
// apps/backend/src/modules/leads/dto/salesperson-lead-response.dto.ts
export class SalespersonLeadResponseDto {
  id: string;
  leadCode: string;          // e.g. MEL-LEAD-000101
  customerName: string;
  phoneNumber: string;
  alternatePhone?: string;
  email?: string;
  city?: string;
  state?: string;
  address?: string;
  productInterest?: string;
  priority: LeadPriority;
  status: LeadStatus;
  assignedAt: Date;
  lastContactedAt?: Date;
  // NOTE: source, campaign, ad details, cost are EXCLUDED from this class entirely!
}

// apps/backend/src/modules/leads/dto/admin-lead-response.dto.ts
export class AdminLeadResponseDto extends SalespersonLeadResponseDto {
  sourceType: LeadSourceType;
  sourceChannelName: string;
  campaignId?: string;
  campaignName?: string;
  adSetId?: string;
  adId?: string;
  costPerLead?: number;
  externalLeadId?: string;
  rawWebhookPayload?: Record<string, any>;
}
```

### 2.2 Controller-Level Serialization Interceptor
```typescript
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: LeadFilterDto) {
    if (user.role === Role.SALESPERSON) {
      // Force query filter to salesperson's assigned leads
      query.assignedToId = user.id;
      const leads = await this.leadsService.findSalespersonLeads(query);
      return plainToInstance(SalespersonLeadResponseDto, leads, { excludeExtraneousValues: true });
    }
    
    // Super Admin & Management see full details
    const leads = await this.leadsService.findAdminLeads(query);
    return plainToInstance(AdminLeadResponseDto, leads);
  }
}
```

### 2.3 Automated Verification Test Standard
Every CI/CD build executes a dedicated security integration test:
1. Log in with `SALESPERSON` credentials.
2. Query `GET /api/v1/leads` and `GET /api/v1/leads/:id`.
3. Assert that response JSON keys do NOT contain: `source`, `sourceType`, `campaign`, `adId`, `cost`, `utm`.
4. If any marketing key is detected in the response body, the build FAILS immediately.
