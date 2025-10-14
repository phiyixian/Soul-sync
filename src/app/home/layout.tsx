'use client';

import { BottomNav } from '@/components/BottomNav';
import { PartnerRequestNotification } from '@/components/PartnerRequestNotification';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { GiftNotification } from '@/components/GiftNotification';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="app-container flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <PartnerRequestNotification />
      <GiftNotification />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
