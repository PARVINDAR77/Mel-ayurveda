'use client';

import React from 'react';
import { useAuth } from '../../context/auth-context';
import { RoleGuard } from '../../components/auth/role-guard';
import { AppLayout } from '../../components/layout/app-layout';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const title =
    user?.role === 'FOLLOWUP_EXECUTIVE'
      ? 'Panel 06: Customer Wellness Follow-Up & Refill Desk'
      : 'Panel 02: Salesperson Workspace & Calling Queue';

  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'SALESPERSON', 'FOLLOWUP_EXECUTIVE']}>
      <AppLayout title={title}>{children}</AppLayout>
    </RoleGuard>
  );
}
