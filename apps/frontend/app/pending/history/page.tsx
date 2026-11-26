'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PendingHistoryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/approval/history');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-slate-500">Redirecting to Sign-Off History...</p>
    </div>
  );
}
