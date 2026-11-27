'use client';

import React from 'react';
import { RoleGuard } from '../../components/auth/role-guard';
import { AppLayout } from '../../components/layout/app-layout';

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'BILLING_EXECUTIVE', 'MANAGEMENT']}>
      <AppLayout>{children}</AppLayout>
    </RoleGuard>
  );
}
