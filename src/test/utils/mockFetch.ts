import { vi } from 'vitest';

type MockResponseInit = {
  status?: number;
  json?: unknown;
};

export function mockFetchOnce({ status = 200, json }: MockResponseInit) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json ?? {}),
  } as Response;

  if (!globalThis.fetch || !vi.isMockFunction(globalThis.fetch)) {
    globalThis.fetch = vi.fn();
  }

  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);
}

export function resetFetchMock() {
  if (globalThis.fetch && vi.isMockFunction(globalThis.fetch)) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReset();
  }
}
