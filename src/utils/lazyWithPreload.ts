import React from 'react';

export interface PreloadableComponent<T extends React.ComponentType<any>> {
  (props: React.ComponentProps<T>): React.ReactElement | null;
  preload: () => Promise<{ default: T }>;
}

const allPreloaders: Array<() => Promise<unknown>> = [];

export async function preloadAllTabs(): Promise<void> {
  await Promise.all(allPreloaders.map((fn) => fn()));
}

/**
 * Creates a lazy-loaded component with manual and idle prefetch capabilities.
 * Supports synchronous bypass in test environments once preloaded to keep synchronous test assertions stable.
 */
export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  let loadedComponent: T | null = null;
  let loadPromise: Promise<{ default: T }> | null = null;

  const preload = (): Promise<{ default: T }> => {
    if (!loadPromise) {
      loadPromise = factory().then((module) => {
        loadedComponent = module.default;
        return module;
      });
    }
    return loadPromise;
  };

  allPreloaders.push(preload);

  const LazyComp = React.lazy(preload);

  const Component = (props: React.ComponentProps<T>): React.ReactElement | null => {
    if (loadedComponent) {
      return React.createElement(loadedComponent, props);
    }
    return React.createElement(LazyComp, props);
  };

  return Object.assign(Component, { preload }) as PreloadableComponent<T>;
}
