import { __resetClientForTests, api, ApiError, setSessionExpiredHandler } from '@/api/client';
import { session } from '@/lib/session';

jest.mock('@/lib/config', () => ({ API_URL: 'http://api.test/api/v1' }));
jest.mock('@/lib/session', () => {
  let tokens: { accessToken: string; refreshToken: string } | null = null;
  return {
    session: {
      get: () => tokens,
      save: jest.fn(async (t: { accessToken: string; refreshToken: string }) => { tokens = t; }),
      clear: jest.fn(async () => { tokens = null; }),
      load: jest.fn(async () => tokens),
    },
  };
});

const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

describe('API 클라이언트', () => {
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    __resetClientForTests();
    await session.save({ accessToken: 'old-access', refreshToken: 'old-refresh' });
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
  });

  it('여러 요청이 동시에 401을 받아도 토큰 갱신은 한 번만 하고, 새 토큰으로 재시도한다', async () => {
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      if (url.endsWith('/auth/refresh')) {
        return json(200, { success: true, data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
      }
      if (auth === 'Bearer old-access') return json(401, { success: false, error: { code: 'UNAUTHORIZED', message: '만료' } });
      return json(200, { success: true, data: { url } });
    });

    const results = await Promise.all([api<{ url: string }>('/playlists'), api<{ url: string }>('/users/me')]);

    expect(results.map((r) => r.url)).toEqual(['http://api.test/api/v1/playlists', 'http://api.test/api/v1/users/me']);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(JSON.parse(refreshCalls[0][1].body)).toEqual({ refreshToken: 'old-refresh' });
    expect(session.get()).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
  });

  it('갱신도 실패하면 토큰을 지우고 세션 만료 처리', async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    fetchMock.mockImplementation(() => json(401, { success: false, error: { code: 'UNAUTHORIZED', message: '만료' } }));

    await expect(api('/playlists')).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(session.get()).toBeNull();
  });

  it('서버 오류 메시지를 그대로 전달하고, 네트워크 오류는 안내 문구로', async () => {
    fetchMock.mockImplementationOnce(() => json(400, { success: false, error: { code: 'VALIDATION_ERROR', message: '제목은 필수입니다.' } }));
    await expect(api('/playlists', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: '제목은 필수입니다.' });

    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('Network request failed')));
    await expect(api('/blocks')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
