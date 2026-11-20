# Manual Lead Creation Specification

## 1. Overview & Authorized Roles
The Manual Lead Creation interface enables authorized administrators (`SUPER_ADMIN` and authorized `MANAGEMENT` staff) to capture inbound leads received via direct clinical walk-ins, doctor referrals, executive contacts, or offline wellness camps.

## 2. Form Schema & Field Validation
```typescript
export class CreateManualLeadDto {
  // Mandatory Fields
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  customerName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]d{9}$/, { message: 'Must be a valid 10-digit Indian mobile number' })
  phoneNumber: string;

  // Optional Fields
  @IsOptional()
  @Matches(/^[6-9]d{9}$/, { message: 'Alternate phone must be a valid 10-digit Indian mobile number' })
  alternatePhone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  productInterest?: string;

  @IsOptional()
  @IsString()
  customerRequirements?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority = LeadPriority.NORMAL; // LOW, NORMAL, HIGH, URGENT

  // Assignment Option
  @IsOptional()
  @IsUUID()
  assignToEmployeeId?: string; // Optional employee ID for immediate allocation
}
```

## 3. System Processing Rules
1. **Creator Extraction**: The backend never accepts `createdBy` from the HTTP request body. It injects `createdBy = request.user.id` directly from the authenticated session.
2. **Sequential Lead Code**: The database transaction atomically obtains the next sequential lead code formatted as `MEL-LEAD-XXXXXX`.
3. **Source Tagging**: System assigns:
   - `source_type = MANUAL`
   - `created_method = MANUAL_ENTRY`
   - `created_at = NOW() (UTC)`
4. **Immediate Assignment Execution**:
   - If `assignToEmployeeId` is omitted: Lead status becomes `NEW`.
   - If valid active salesperson ID is provided: Lead status becomes `ASSIGNED`, and a record is added to `lead_assignments` with `assigned_by = current_user.id`.
