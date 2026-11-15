/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import { BUILTIN_STICKERS, toStickerMap } from '@/lib/stickers';

/** 기본 스티커(오프라인·첫 화면용)는 서버 V8 마이그레이션에 넣은 16개와 그림까지 같아야 함 */
describe('기본 스티커', () => {
  const sql = readFileSync(join(__dirname, '../../backend/src/main/resources/db/migration/V8__admin_stickers_and_review_note.sql'), 'utf8');
  const web = readFileSync(join(__dirname, '../../frontend/src/lib/stickers.js'), 'utf8');

  it('16개, 코드가 겹치지 않음', () => {
    expect(BUILTIN_STICKERS).toHaveLength(16);
    expect(Object.keys(toStickerMap(BUILTIN_STICKERS))).toHaveLength(16);
  });

  it.each(BUILTIN_STICKERS.map((s) => [s.code, s]))('%s: 서버·웹과 이름·그림이 같음', (_code, s) => {
    expect(sql).toContain(`('${s.code}', '${s.name}', '${s.svg}'`);
    expect(web).toContain(`${s.code}: { label: '${s.name}', svg: '${s.svg}' }`);
    expect(s.active).toBe(true);
  });
});
