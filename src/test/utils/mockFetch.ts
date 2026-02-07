import { vi } from 'vitest';

type MockResponseInit = {
  status?: number;
  json?: unknown;
};

function buildMockResponse({ status = 200, json }: MockResponseInit): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json ?? {}),
  } as Response;
}

function ensureFetchMock() {
  if (!globalThis.fetch || !vi.isMockFunction(globalThis.fetch)) {
    globalThis.fetch = vi.fn();
  }

  return globalThis.fetch as ReturnType<typeof vi.fn>;
}

export function mockFetchOnce({ status = 200, json }: MockResponseInit) {
  ensureFetchMock().mockResolvedValueOnce(buildMockResponse({ status, json }));
}

export function mockFetchSequence(responses: MockResponseInit[]) {
  const fetchMock = ensureFetchMock();
  responses.forEach(response => {
    fetchMock.mockResolvedValueOnce(buildMockResponse(response));
  });
}

export function expectFetchCalledWithPath(pathFragment: string) {
  expect(globalThis.fetch).toBeDefined();
  expect(vi.isMockFunction(globalThis.fetch)).toBe(true);

  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const called = calls.some(call => String(call[0]).includes(pathFragment));
  expect(called).toBe(true);
}

export function resetFetchMock() {
  if (globalThis.fetch && vi.isMockFunction(globalThis.fetch)) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReset();
  }
}
