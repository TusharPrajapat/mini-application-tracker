import { useEffect, useMemo, useRef } from "react";
import { debounce, DebouncedFunction } from "../utils/debounce";

/**
 * Custom React Hook for Stable Debounced Callback.
 * Preserves debounced function identity across component re-renders using useMemo and useRef,
 * preventing timer resets caused by React render cycles.
 * Performs proper cleanup on unmount.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): DebouncedFunction<T> {
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useMemo(() => {
    const fn = (...args: Parameters<T>) => {
      return callbackRef.current(...args);
    };
    return debounce(fn, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      debouncedFn.cancel();
    };
  }, [debouncedFn]);

  return debouncedFn;
}

/**
 * Stale Response Guard for Asynchronous API Searches.
 * Generates an incremental request ID and verifies whether a returning response matches the latest active request ID.
 * Prevents older out-of-order network responses from overwriting newer search results.
 */
export function useStaleResponseGuard() {
  const lastRequestIdRef = useRef<number>(0);

  const createRequest = () => {
    const requestId = ++lastRequestIdRef.current;
    return {
      requestId,
      isCurrent: () => requestId === lastRequestIdRef.current,
    };
  };

  return { createRequest, lastRequestIdRef };
}
