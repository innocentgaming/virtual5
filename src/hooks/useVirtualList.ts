import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

export interface UseVirtualListOptions {
  itemHeight: number;
  overscan?: number;
  threshold?: number;
}

export interface UseVirtualListResult<T> {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  isVirtual: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
}

/**
 * Lightweight, zero-dependency windowing hook for large collections.
 * Automatically activates only when items exceed threshold (> 100),
 * keeping semantic DOM and screen readers 100% intact for smaller lists.
 */
export function useVirtualList<T>(
  items: T[],
  options: UseVirtualListOptions
): UseVirtualListResult<T> {
  const { itemHeight, overscan = 5, threshold = 100 } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const isVirtual = items.length > threshold;

  useEffect(() => {
    if (!isVirtual || !containerRef.current) return;
    const updateHeight = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight || 600);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [isVirtual]);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return useMemo(() => {
    if (!isVirtual) {
      return {
        visibleItems: items,
        startIndex: 0,
        endIndex: items.length,
        totalHeight: items.length * itemHeight,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        isVirtual: false,
        containerRef,
        onScroll,
      };
    }

    const totalCount = items.length;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(totalCount, startIndex + visibleCount);

    const topSpacerHeight = startIndex * itemHeight;
    const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * itemHeight);
    const visibleItems = items.slice(startIndex, endIndex);

    return {
      visibleItems,
      startIndex,
      endIndex,
      totalHeight: totalCount * itemHeight,
      topSpacerHeight,
      bottomSpacerHeight,
      isVirtual: true,
      containerRef,
      onScroll,
    };
  }, [isVirtual, items, scrollTop, itemHeight, overscan, viewportHeight, onScroll]);
}
