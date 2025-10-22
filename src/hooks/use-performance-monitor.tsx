'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  imageLoadTime: number;
  firestoreQueryTime: number;
}

export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    imageLoadTime: 0,
    firestoreQueryTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      setMetrics(prev => ({ ...prev, loadTime }));
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}:`, {
          loadTime: `${loadTime.toFixed(2)}ms`,
          renderTime: `${metrics.renderTime.toFixed(2)}ms`,
          imageLoadTime: `${metrics.imageLoadTime.toFixed(2)}ms`,
          firestoreQueryTime: `${metrics.firestoreQueryTime.toFixed(2)}ms`
        });
      }
    };
  }, [componentName, metrics.renderTime, metrics.imageLoadTime, metrics.firestoreQueryTime]);

  const measureRender = (fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    setMetrics(prev => ({ ...prev, renderTime: end - start }));
  };

  const measureImageLoad = (fn: () => Promise<void>) => {
    const start = performance.now();
    return fn().then(() => {
      const end = performance.now();
      setMetrics(prev => ({ ...prev, imageLoadTime: end - start }));
    });
  };

  const measureFirestoreQuery = (fn: () => Promise<any>) => {
    const start = performance.now();
    return fn().then((result) => {
      const end = performance.now();
      setMetrics(prev => ({ ...prev, firestoreQueryTime: end - start }));
      return result;
    });
  };

  return {
    metrics,
    measureRender,
    measureImageLoad,
    measureFirestoreQuery
  };
}

// Component for displaying performance metrics in development
export function PerformanceDebugger({ 
  componentName, 
  metrics 
}: { 
  componentName: string; 
  metrics: PerformanceMetrics 
}) {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50">
      <div className="font-bold">{componentName}</div>
      <div>Load: {metrics.loadTime.toFixed(1)}ms</div>
      <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
      <div>Images: {metrics.imageLoadTime.toFixed(1)}ms</div>
      <div>Firestore: {metrics.firestoreQueryTime.toFixed(1)}ms</div>
    </div>
  );
}
