import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

beforeEach(() => {
  if (!globalThis.fetch || !vi.isMockFunction(globalThis.fetch)) {
    globalThis.fetch = vi.fn();
  }
});

afterEach(() => {
  if (globalThis.fetch && vi.isMockFunction(globalThis.fetch)) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReset();
  }
});
