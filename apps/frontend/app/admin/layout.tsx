'use client';

import React from 'react';
import { RoleGuard } from '../../components/auth/role-guard';
import { AppLayout } from '../../components/layout/app-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
      <AppLayout title="Panel 01: Super Admin Executive Control">{children}</AppLayout>
    </RoleGuard>
  );
}
