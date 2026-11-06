import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('includes credentials for the HttpOnly session cookie', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    await api<{ ok: boolean }>('/health');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('returns a safe API message on errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Class is full.' }),
      }),
    );
    await expect(api('/trials', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      message: 'Class is full.',
      status: 409,
    });
  });
});
