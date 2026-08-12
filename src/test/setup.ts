import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver; CircleGrid only uses it to react to
// layout changes, so a no-op stub is enough for tests that don't assert on
// live resize behavior.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = ResizeObserverStub;
