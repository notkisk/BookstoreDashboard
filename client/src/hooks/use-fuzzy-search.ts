import { useMemo } from 'react';
import Fuse from 'fuse.js';

interface UseFuzzySearchOptions<T> {
  items: T[];
  keys: (keyof T)[];
  threshold?: number;
}

export function useFuzzySearch<T>({ 
  items, 
  keys,
  threshold = 0.3 
}: UseFuzzySearchOptions<T>) {
  // Create a memoized instance of Fuse
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys,
      threshold,
      ignoreLocation: true,
      findAllMatches: true,
    });
  }, [items, keys, threshold]);

  // Return a function to search items
  const search = (query: string): T[] => {
    if (!query) {
      return items;
    }
    
    const results = fuse.search(query);
    return results.map(result => result.item);
  };

  return search;
}
