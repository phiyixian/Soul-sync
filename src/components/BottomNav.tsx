'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, ShoppingBasket, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirebase, useUser } from '@/firebase';
import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/home/messages', icon: MessageSquare, label: 'Messages' },
  {
    href: '/home/notifications',
    icon: Bell,
    label: 'Updates',
    isNotification: true,
  },
  { href: '/home/shop', icon: ShoppingBasket, label: 'Shop' },
  { href: '/home/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { firestore } = useFirebase();

  const notificationsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      where('isRead', '==', false)
    );
  }, [firestore, user]);

  const { data: notifications } = useCollection(notificationsQuery);

  return (
    <nav className="sticky bottom-0 mt-auto w-full border-t bg-card">
      <div className="mx-auto grid grid-cols-5 h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const hasNotification =
            item.isNotification && notifications && notifications.length > 0;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground relative',
                isActive && 'text-primary'
              )}
            >
              {hasNotification && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
              )}
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
