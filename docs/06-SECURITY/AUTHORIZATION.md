# Authorization Architecture (RBAC + ABAC)

## 1. Role-Based Access Control (RBAC)
Controllers and routes are protected via declarative NestJS decorators:
```typescript
@Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
@Post('manual')
async createManualLead(@Body() dto: CreateManualLeadDto) { ... }
```

## 2. Attribute-Based Access Control (ABAC) & Resource Ownership
Beyond static roles, fine-grained ownership is verified dynamically:
- When a salesperson attempts to view or log calls for lead `L`, the service evaluates:
  `lead.assignedToId === currentUser.id`
- If false, the backend rejects the operation with `403 Forbidden`, preventing IDOR vulnerability.
