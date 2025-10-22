'use client';

import { useEffect } from 'react';

interface PreloadImageOptions {
  priority?: boolean;
  quality?: number;
  sizes?: string;
}

export function useImagePreloader(imageUrls: string[], options: PreloadImageOptions = {}) {
  useEffect(() => {
    const { priority = false, quality = 75, sizes } = options;
    
    imageUrls.forEach((url) => {
      if (!url) return;
      
      // Create a link element for preloading
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      
      if (priority) {
        link.setAttribute('fetchpriority', 'high');
      }
      
      document.head.appendChild(link);
      
      // Also preload using Image constructor for better caching
      const img = new Image();
      img.src = url;
      
      // Cleanup function
      return () => {
        document.head.removeChild(link);
      };
    });
  }, [imageUrls, options]);
}

// Hook for preloading critical images based on user status
export function useCriticalImagePreloader(status: string, avatarAssets: any) {
  const criticalImages = [
    '/kiss.png', // Always needed for animations
    'https://picsum.photos/300/400?random=1', // Default status image
  ];

  // Add status-specific images
  if (['sleeping', 'eating', 'showering'].includes(status)) {
    criticalImages.push(`https://picsum.photos/300/400?random=${status}`);
  }

  // Add avatar assets if available
  if (avatarAssets) {
    Object.values(avatarAssets).forEach((assets: any) => {
      if (Array.isArray(assets)) {
        assets.forEach((asset: any) => {
          if (asset.imageUrl) {
            criticalImages.push(asset.imageUrl);
          }
        });
      }
    });
  }

  useImagePreloader(criticalImages, { priority: true });
}

// Hook for lazy loading non-critical images
export function useLazyImageLoader(imageUrls: string[]) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    // Observe all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach((img) => observer.observe(img));

    return () => {
      observer.disconnect();
    };
  }, [imageUrls]);
}
