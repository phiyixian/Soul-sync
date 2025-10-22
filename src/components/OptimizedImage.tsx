'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: () => void;
  fallbackSrc?: string;
  pixelated?: boolean;
  dataAiHint?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  priority = false,
  sizes,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  onError,
  onLoad,
  fallbackSrc = 'https://picsum.photos/200/200?random=1',
  pixelated = false,
  dataAiHint,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setHasError(true);
    
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setIsLoading(true);
    } else {
      onError?.(e);
    }
  }, [imageSrc, fallbackSrc, onError]);

  const imageProps = {
    src: imageSrc,
    alt,
    className: cn(
      'transition-opacity duration-300',
      isLoading && 'opacity-0',
      !isLoading && 'opacity-100',
      pixelated && 'pixelated',
      className
    ),
    onLoad: handleLoad,
    onError: handleError,
    priority,
    quality,
    placeholder,
    blurDataURL,
    sizes,
    ...(fill ? { fill: true } : { width, height }),
    ...(dataAiHint ? { 'data-ai-hint': dataAiHint } : {}),
    ...props
  };

  return (
    <div className={cn('relative', fill && 'w-full h-full')}>
      {/* Loading skeleton */}
      {isLoading && (
        <div 
          className={cn(
            'absolute inset-0 skeleton rounded',
            fill ? 'w-full h-full' : `w-[${width}px] h-[${height}px]`
          )}
        />
      )}
      
      {/* Error state */}
      {hasError && imageSrc === fallbackSrc && (
        <div className="image-error absolute inset-0 rounded flex items-center justify-center">
          <span className="text-xs">Failed to load</span>
        </div>
      )}
      
      {/* Actual image */}
      <Image {...imageProps} />
    </div>
  );
}
