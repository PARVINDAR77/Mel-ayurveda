'use client';

import React from 'react';
import { RoleGuard } from '../../components/auth/role-guard';
import { AppLayout } from '../../components/layout/app-layout';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGEMENT']}>
      <AppLayout>{children}</AppLayout>
    </RoleGuard>
  );
}
