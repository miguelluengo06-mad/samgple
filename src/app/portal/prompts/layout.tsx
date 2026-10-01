'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortalRoleContext } from '@/app/portal/context';

export default function PromptsLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = usePortalRoleContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'agency') router.replace('/portal');
  }, [role, loading, router]);

  if (role !== 'agency') return null;
  return <div className="flex-1 min-w-0 overflow-hidden flex flex-col">{children}</div>;
}
