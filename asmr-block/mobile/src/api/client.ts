import { API_URL } from '@/lib/config';
import { session, type Tokens } from '@/lib/session';
import i18n, { currentLang } from '@/locales';

/** 서버가 보낸 오류 (ApiResponse.error) */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** 토큰 만료(401) 시 한 번 갱신 후 재시도 (기본 true) */
  retryOnUnauthorized?: boolean;
};

// 토큰이 완전히 만료되면(갱신 실패) 호출됨 → 로그인 화면으로 보내는 용도
let onSessionExpired: () => void = () => {};
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// refreshToken은 한 번 쓰면 바뀌므로, 여러 요청이 동시에 401을 받아도 갱신은 한 번만
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const current = session.get();
  if (!current) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return false;
    await session.save(json.data as Tokens);
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  refreshing ??= refreshTokens().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, retryOnUnauthorized = true } = options;
  // 화면 언어: 서버가 오류 문장·트리거 이름·블록/조합 영어 제목을 그 언어로
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': currentLang() };
  // 파일 업로드(FormData)는 경계값이 붙은 Content-Type을 fetch가 직접 정함
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  const tokens = session.get();
  if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', i18n.t('errors.network'));
  }

  if (res.status === 401 && retryOnUnauthorized && tokens && !path.startsWith('/auth/')) {
    if (await refreshOnce()) {
      return api<T>(path, { ...options, retryOnUnauthorized: false });
    }
    await session.clear();
    onSessionExpired();
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'UNKNOWN',
      json?.error?.message ?? i18n.t('errors.generic'),
    );
  }
  return json.data as T;
}

/** 테스트용: 진행 중인 갱신 상태 초기화 */
export function __resetClientForTests() {
  refreshing = null;
  onSessionExpired = () => {};
}
