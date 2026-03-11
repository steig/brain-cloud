import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface UseLoadMoreOptions<T> {
  queryKey: unknown[];
  queryFn: (params: { limit: number; offset: number }) => Promise<T[]>;
  countFn?: () => Promise<number>;
  pageSize?: number;
}

interface UseLoadMoreResult<T> {
  items: T[];
  totalCount: number | null;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
}

export function useLoadMore<T>({
  queryKey,
  queryFn,
  countFn,
  pageSize = 30,
}: UseLoadMoreOptions<T>): UseLoadMoreResult<T> {
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const prevKeyRef = useRef<string>("");

  // Serialize queryKey for change detection
  const keyStr = JSON.stringify(queryKey);

  // Reset when params change
  useEffect(() => {
    if (prevKeyRef.current && prevKeyRef.current !== keyStr) {
      setOffset(0);
      setAccumulated([]);
      setHasMore(true);
    }
    prevKeyRef.current = keyStr;
  }, [keyStr]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKey, "page", offset],
    queryFn: () => queryFn({ limit: pageSize, offset }),
  });

  const { data: totalCount } = useQuery({
    queryKey: [...queryKey, "count"],
    queryFn: countFn ?? (() => Promise.resolve(null as unknown as number)),
    enabled: !!countFn,
  });

  // When new data arrives, append to accumulated
  useEffect(() => {
    if (data) {
      if (offset === 0) {
        setAccumulated(data);
      } else {
        setAccumulated((prev) => {
          // Deduplicate by checking if first item already exists
          const existingIds = new Set(prev.map((item: any) => item.id));
          const newItems = data.filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
      if (data.length < pageSize) {
        setHasMore(false);
      }
    }
  }, [data, offset, pageSize]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setOffset((prev) => prev + pageSize);
    }
  }, [isFetching, hasMore, pageSize]);

  const reset = useCallback(() => {
    setOffset(0);
    setAccumulated([]);
    setHasMore(true);
  }, []);

  return {
    items: accumulated,
    totalCount: totalCount ?? null,
    isLoading: isLoading && offset === 0,
    isFetchingMore: isFetching && offset > 0,
    hasMore,
    loadMore,
    reset,
  };
}
