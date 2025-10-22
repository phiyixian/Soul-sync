'use client';

import { useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  QueryConstraint,
  Query,
  DocumentSnapshot
} from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';

interface UseOptimizedQueryOptions {
  limitCount?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  whereConditions?: Array<{ field: string; operator: any; value: any }>;
}

export function useOptimizedQuery(
  firestore: Firestore | null,
  collectionPath: string,
  options: UseOptimizedQueryOptions = {}
) {
  const {
    limitCount = 20,
    orderByField,
    orderDirection = 'desc',
    whereConditions = []
  } = options;

  const queryConstraints = useMemo(() => {
    if (!firestore) return null;
    
    const constraints: QueryConstraint[] = [];
    
    // Add where conditions
    whereConditions.forEach(({ field, operator, value }) => {
      constraints.push(where(field, operator, value));
    });
    
    // Add ordering
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }
    
    // Add limit
    constraints.push(limit(limitCount));
    
    return constraints;
  }, [firestore, whereConditions, orderByField, orderDirection, limitCount]);

  const createQuery = useCallback(() => {
    if (!firestore || !queryConstraints) return null;
    
    const collectionRef = collection(firestore, collectionPath);
    return query(collectionRef, ...queryConstraints);
  }, [firestore, collectionPath, queryConstraints]);

  const createPaginatedQuery = useCallback((lastDoc: DocumentSnapshot | null) => {
    if (!firestore || !queryConstraints) return null;
    
    const collectionRef = collection(firestore, collectionPath);
    const constraints = [...queryConstraints];
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    
    return query(collectionRef, ...constraints);
  }, [firestore, collectionPath, queryConstraints]);

  return {
    createQuery,
    createPaginatedQuery,
    queryConstraints
  };
}

// Hook for debounced queries to prevent excessive Firestore calls
export function useDebouncedQuery<T>(
  queryFn: () => Promise<T>,
  delay: number = 300
) {
  const debouncedQuery = useCallback(
    debounce(queryFn, delay),
    [queryFn, delay]
  );

  return debouncedQuery;
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Hook for caching frequently accessed data
export function useQueryCache<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
) {
  const cache = useMemo(() => new Map<string, { data: T; timestamp: number }>(), []);
  
  const getCachedData = useCallback(async (): Promise<T | null> => {
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    try {
      const data = await queryFn();
      cache.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Query cache error:', error);
      return null;
    }
  }, [key, queryFn, cache, ttl]);
  
  const invalidateCache = useCallback(() => {
    cache.delete(key);
  }, [key, cache]);
  
  return {
    getCachedData,
    invalidateCache
  };
}
