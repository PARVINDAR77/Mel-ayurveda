'use client';

import React from 'react';
import { RoleGuard } from '../../components/auth/role-guard';
import { AppLayout } from '../../components/layout/app-layout';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'SALESPERSON']}>
      <AppLayout title="Panel 02: Salesperson Workspace & Calling Queue">{children}</AppLayout>
    </RoleGuard>
  );
}
