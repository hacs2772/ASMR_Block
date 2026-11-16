import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 화면 언어가 바뀌면(처음 열 때 말고) 한 번 부름 — 서버 글(블록·조합 이름, 트리거 이름 등)을 새 언어로 다시 받을 때.
 * 하던 것을 지켜야 하는 화면(편집기·듣기·블록 판매)만 씀. 다른 화면은 App이 언어가 바뀌면 새로 그림
 */
export default function useLangChange(callback) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const last = useRef(lang);
  const latest = useRef(callback);
  useEffect(() => { latest.current = callback; });
  useEffect(() => {
    if (last.current === lang) return;
    last.current = lang;
    latest.current();
  }, [lang]);
}
