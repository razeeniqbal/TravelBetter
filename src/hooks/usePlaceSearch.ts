import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { PlaceSearchResult } from '@/types/itinerary';

type PlaceSearchStatus = 'idle' | 'loading' | 'success' | 'no_results' | 'error';

interface UsePlaceSearchOptions {
  destinationContext?: string;
  dayNumber?: number;
  limit?: number;
  debounceMs?: number;
}

export function usePlaceSearch(options: UsePlaceSearchOptions = {}) {
  const {
    destinationContext,
    dayNumber,
    limit = 5,
    debounceMs = 350,
  } = options;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [status, setStatus] = useState<PlaceSearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  const clearState = useCallback(() => {
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    setResults([]);
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  const runSearch = useCallback(async (nextQuery: string) => {
    const normalizedQuery = nextQuery.trim();
    if (!normalizedQuery) {
      clearState();
      return;
    }

    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    lastQueryRef.current = normalizedQuery;

    setStatus('loading');
    setErrorMessage(null);

    const { data, error } = await api.placeSearch(
      {
        query: normalizedQuery,
        destinationContext,
        dayNumber,
        limit,
      },
      { signal: controller.signal }
    );

    if (controller.signal.aborted) return;

    if (error || !data) {
      setResults([]);
      setStatus('error');
      setErrorMessage(error?.message || 'Unable to search places right now.');
      return;
    }

    const nextResults = Array.isArray(data.results) ? data.results : [];
    setResults(nextResults);
    setStatus(nextResults.length > 0 ? 'success' : 'no_results');
  }, [clearState, dayNumber, destinationContext, limit]);

  const retry = useCallback(() => {
    if (!lastQueryRef.current) return;
    void runSearch(lastQueryRef.current);
  }, [runSearch]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      clearState();
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(normalizedQuery);
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [clearState, debounceMs, query, runSearch]);

  useEffect(() => () => {
    activeControllerRef.current?.abort();
  }, []);

  return {
    query,
    setQuery,
    results,
    status,
    errorMessage,
    isLoading: status === 'loading',
    runSearch,
    retry,
    clearState,
  };
}
