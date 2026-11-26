'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PendingReviewPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/approval/queue');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-slate-500">Redirecting to Approval Queue...</p>
    </div>
  );
}
