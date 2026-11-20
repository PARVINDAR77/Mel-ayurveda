'use client';

import React from 'react';
import { RoleGuard } from '../../components/auth/role-guard';
import { AppLayout } from '../../components/layout/app-layout';

export default function PendingReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'PENDING_REVIEWER']}>
      <AppLayout title="Panel 03: Clinical Triage & Pending Review">{children}</AppLayout>
    </RoleGuard>
  );
}
