'use client';

import React from 'react';
import { RoleGuard } from '../../components/auth/role-guard';
import { AppLayout } from '../../components/layout/app-layout';

export default function ApprovalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'APPROVAL_OFFICER']}>
      <AppLayout title="Panel 04: Approval Authority & Medical Verification">{children}</AppLayout>
    </RoleGuard>
  );
}
