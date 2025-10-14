"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, ShoppingBasket, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/home/messages", icon: MessageSquare, label: "Messages" },
  { href: "/home/shop", icon: ShoppingBasket, label: "Shop" },
  { href: "/home/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 mt-auto w-full border-t bg-card">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "text-primary"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
