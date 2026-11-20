# API Data Contracts & TypeScript Interfaces

## 1. Authentication Contracts
```typescript
export interface LoginRequestDto {
  email: string;
  passwordHash: string;
}

export interface LoginResponseDto {
  accessToken: string;
  user: {
    id: string;
    employeeCode: string;
    email: string;
    firstName: string;
    lastName: string;
    role: RoleType;
  };
}
```

## 2. Lead Contracts
```typescript
export interface CreateManualLeadRequest {
  customerName: string;
  phoneNumber: string;
  alternatePhone?: string;
  email?: string;
  city?: string;
  state?: string;
  address?: string;
  productInterest?: string;
  customerRequirements?: string;
  notes?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignToEmployeeId?: string;
}

export interface SalespersonLeadDto {
  id: string;
  leadCode: string;
  customerName: string;
  phoneNumber: string;
  alternatePhone?: string;
  city?: string;
  state?: string;
  address?: string;
  productInterest?: string;
  priority: string;
  status: string;
  assignedAt: string;
  lastContactedAt?: string;
}

export interface AdminLeadDto extends SalespersonLeadDto {
  sourceType: string;
  sourceName?: string;
  campaignId?: string;
  campaignName?: string;
  costPerLead?: number;
}
```

## 3. Calling Contracts
```typescript
export interface CreateCallLogDto {
  leadId: string;
  callOutcome: 'INTERESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'BUSY_CALL_LATER' | 'INVALID_NUMBER' | 'FOLLOW_UP_REQUIRED' | 'PENDING_REVIEW' | 'REJECTED';
  durationSeconds: number;
  notes?: string;
  followUpDate?: string; // ISO String if outcome is BUSY_CALL_LATER or FOLLOW_UP_REQUIRED
}
```

## 4. Review & Approval Contracts
```typescript
export interface PendingDecisionDto {
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_FOLLOW_UP' | 'SEND_BACK';
  notes: string;
  rejectionReason?: string;
}

export interface ApprovalDecisionDto {
  decision: 'APPROVE' | 'REJECT' | 'SEND_BACK';
  reason?: string;
  notes?: string;
}
```
