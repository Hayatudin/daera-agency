import { useState, useEffect } from 'react';
import { Candidate } from '@/types';

// Global cache variables outside the component
let cachedCandidates: Candidate[] | null = null;
let fetchPromise: Promise<Candidate[]> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds

export function useCandidates(forceRefresh = false) {
  const [candidates, setCandidates] = useState<Candidate[]>(cachedCandidates || []);
  const [isLoading, setIsLoading] = useState(!cachedCandidates);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCandidates() {
      // Use cache if valid and not forcing a refresh
      if (!forceRefresh && cachedCandidates && (Date.now() - lastFetchTime < CACHE_TTL)) {
        if (mounted) {
          setCandidates(cachedCandidates);
          setIsLoading(false);
        }
        return;
      }

      // Start a new fetch if one isn't already in progress, or if forcing refresh
      if (!fetchPromise || forceRefresh) {
        setIsLoading(true);
        fetchPromise = fetch('/api/candidates').then(async (res) => {
          if (!res.ok) throw new Error('Failed to fetch candidates');
          return res.json();
        }).catch(err => {
          fetchPromise = null; // Clear promise on error so it can be retried
          throw err;
        });
      }

      try {
        const data = await fetchPromise;
        cachedCandidates = data;
        lastFetchTime = Date.now();
        if (mounted) {
          setCandidates(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadCandidates();

    return () => { mounted = false; };
  }, [forceRefresh]);

  // Method to update cache and local state optimistically
  const mutate = (updater: Candidate[] | ((prev: Candidate[]) => Candidate[])) => {
    if (typeof updater === 'function') {
      const newData = updater(candidates);
      cachedCandidates = newData;
      setCandidates(newData);
    } else {
      cachedCandidates = updater;
      setCandidates(updater);
    }
  };

  return { candidates, isLoading, error, mutate };
}
