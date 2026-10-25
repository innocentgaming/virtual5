import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';
import { preloadAllTabs } from './utils/lazyWithPreload';

beforeAll(async () => {
  await import('./App');
  await preloadAllTabs();
});

afterEach(() => {
  cleanup();
});
