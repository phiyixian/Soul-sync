'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export function Skeleton({ 
  className, 
  width, 
  height, 
  rounded = true 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton',
        rounded && 'rounded',
        className
      )}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  );
}

// Pre-built skeleton components
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <Skeleton height="200px" className="w-full" />
      <div className="space-y-2">
        <Skeleton height="1.25rem" width="75%" />
        <Skeleton height="1rem" width="50%" />
      </div>
      <Skeleton height="2.5rem" className="w-full" />
    </div>
  );
}

export function ShopItemSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Skeleton height="200px" className="w-full" />
      <div className="p-4 space-y-2">
        <Skeleton height="1.25rem" width="80%" />
        <Skeleton height="2.5rem" className="w-full" />
      </div>
    </div>
  );
}

export function AvatarSkeleton() {
  return (
    <div className="relative w-[300px] h-[400px] mx-auto">
      <Skeleton height="400px" className="w-full" />
    </div>
  );
}

export function ButtonSkeleton() {
  return <Skeleton height="2.5rem" width="120px" />;
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          height="1rem" 
          width={i === lines - 1 ? "60%" : "100%"} 
        />
      ))}
    </div>
  );
}