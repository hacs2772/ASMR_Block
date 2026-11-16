import React, { useCallback, useEffect, useState } from 'react';
import { IoCheckmarkCircle, IoPhonePortrait, IoDesktop } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import BlockLoader from '../brand/BlockLoader';
import { shortDateTime } from '../../lib/time';

const FILTERS = [
  { done: false, label: '새 의견' },
  { done: true, label: '확인함' },
  { done: undefined, label: '전체' },
];

/** 관리자: 의견 보내기로 받은 글 (베타 반응) */
function FeedbackList({ onNewCount }) {
  const [filter, setFilter] = useState(0);
  const [page, setPage] = useState(null);

  const load = useCallback(async () => {
    setPage(null);
    try {
      const data = await adminApi.feedback(FILTERS[filter].done);
      setPage({ content: data.content, total: data.pageInfo?.totalElements ?? data.content.length });
      if (FILTERS[filter].done === false) onNewCount?.(data.pageInfo?.totalElements ?? 0);
    } catch (e) {
      toast.error(errorMessage(e));
      setPage({ content: [], total: 0 });
    }
  }, [filter, onNewCount]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (f) => {
    try {
      await adminApi.markFeedback(f.id, !f.done);
      setPage((p) => ({
        content: FILTERS[filter].done === undefined ? p.content.map((x) => (x.id === f.id ? { ...x, done: !f.done } : x))
          : p.content.filter((x) => x.id !== f.id),
        total: FILTERS[filter].done === undefined ? p.total : p.total - 1,
      }));
      adminApi.feedback(false, 0, 1).then((d) => onNewCount?.(d.pageInfo?.totalElements ?? 0)).catch(() => {});
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <p className="max-w-xl text-sm text-muted">사이트·앱의 &ldquo;의견 보내기&rdquo;로 들어온 글이에요. 읽고 나면 &ldquo;확인함&rdquo;으로 넘겨 두세요.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <button key={f.label} type="button" className={`chip ${filter === i ? 'chip-on' : ''}`} onClick={() => setFilter(i)}>
            {f.label}{filter === i && page ? ` ${page.total}` : ''}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {page === null ? <BlockLoader small label="불러오는 중" /> : page.content.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">{FILTERS[filter].done === false ? '새 의견이 없어요.' : '아직 없어요.'}</p>
        ) : page.content.map((f) => (
          <article key={f.id} className={`card p-4 ${f.done ? 'opacity-60' : ''}`} data-testid={`feedback-${f.id}`}>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{f.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1">{f.client === 'app' ? <IoPhonePortrait /> : <IoDesktop />}{f.client === 'app' ? '앱' : '웹'}</span>
              <span>{f.who ? `@${f.who}${f.beta ? ' (베타 손님)' : ''}` : '로그인 안 함'}</span>
              {f.page && <span>{f.page}</span>}
              {f.contact && <span className="text-ink">답장: {f.contact}</span>}
              <span className="text-faint">{shortDateTime(f.createdAt)}</span>
              <button type="button" onClick={() => toggle(f)} data-testid={`feedback-done-${f.id}`}
                className={`ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold ${f.done ? 'text-muted hover:text-ink' : 'bg-pink-soft text-pink-text hover:bg-pink hover:text-white'}`}>
                <IoCheckmarkCircle /> {f.done ? '새 의견으로' : '확인함'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default FeedbackList;
