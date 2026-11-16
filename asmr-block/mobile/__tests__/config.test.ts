/** 설치용 앱(개발이 아닌 빌드)은 공개 서버에 붙고, 개발할 땐 PC 주소로 */
describe('API 주소', () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  const original = { dev: g.__DEV__, env: process.env.EXPO_PUBLIC_API_URL };
  afterEach(() => {
    g.__DEV__ = original.dev;
    if (original.env === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = original.env;
    jest.resetModules();
  });

  const load = (hostUri?: string) => {
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { hostUri } } }));
    let api = '';
    jest.isolateModules(() => {
      // 모듈을 새로 읽어야 해서 require (import는 한 번만 읽음)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      api = (require('@/lib/config') as typeof import('@/lib/config')).resolveApiUrl();
    });
    return api;
  };

  it('eas.json이 넣어 준 주소가 있으면 그것 (끝의 / 빼고)', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://asmrblock.com/api/v1/';
    expect(load('192.168.0.10:8081')).toBe('https://asmrblock.com/api/v1');
  });

  it('설치용 앱인데 주소가 없으면 공개 서버', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    g.__DEV__ = false;
    expect(load(undefined)).toBe('https://asmrblock.com/api/v1');
  });

  it('개발(Expo Go)은 expo start 한 PC의 IP:8080', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    g.__DEV__ = true;
    expect(load('192.168.0.10:8081')).toBe('http://192.168.0.10:8080/api/v1');
  });
});
