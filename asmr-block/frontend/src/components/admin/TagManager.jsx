import React, { useEffect, useState } from 'react';
import { IoAdd } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import BlockLoader from '../brand/BlockLoader';
import { HiddenBadge, RowActions } from './AdminRow';

/**
 * 소리 느낌 태그 관리 (부드러운·바삭한·느린…): 판매자가 블록을 올릴 때 3개까지 고르고, 상점에서 태그로 찾음.
 * 바꾸면 앱·웹에 바로. 블록에 달려 있을 수 있어서 지우지 않고 숨김
 */
function TagManager() {
  const [tags, setTags] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | 태그 id

  useEffect(() => {
    adminApi.tags().then(setTags).catch((e) => { toast.error(errorMessage(e)); setTags([]); });
  }, []);

  const run = async (promise, message) => {
    try {
      setTags(await promise);
      if (message) toast.success(message);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };
  const move = (index, delta) => {
    const ids = tags.map((x) => x.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(adminApi.orderTags(ids));
  };

  if (tags === null) return <BlockLoader small label="불러오는 중" />;

  return (
    <section className="mt-10" data-testid="tag-manager">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">소리 느낌 태그</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            판매자가 블록을 올릴 때 3개까지 고르고, 상점에서 태그로 찾아요. 블록 카드에는 #바삭한처럼 작게 보여요.
          </p>
        </div>
        <button type="button" className="btn-pink btn-sm" onClick={() => setEditing('new')} data-testid="add-tag">
          <IoAdd /> 태그 추가
        </button>
      </div>
      {editing === 'new' && (
        <TagForm onCancel={() => setEditing(null)}
          onSave={async (body) => (await run(adminApi.addTag(body), `"${body.name}" 태그를 추가했어요.`)) && setEditing(null)} />
      )}
      <div className="card mt-4 divide-y divide-line overflow-hidden">
        {tags.map((tag, i) => (
          <div key={tag.id} className={tag.active ? '' : 'opacity-60'} data-testid={`admin-tag-${tag.code}`}>
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">#{tag.name} {!tag.active && <HiddenBadge />}</p>
                <p className="truncate text-[11px] text-faint">
                  {tag.code} · 블록 {tag.blockCount}개 · EN {tag.nameEn || '영어 이름 없음'}
                </p>
              </div>
              <RowActions small first={i === 0} last={i === tags.length - 1} active={tag.active}
                onUp={() => move(i, -1)} onDown={() => move(i, 1)} onEdit={() => setEditing(tag.id)}
                onToggle={() => run(adminApi.updateTag(tag.id, { active: !tag.active }),
                  tag.active ? `"${tag.name}" 숨겼어요. 이미 달린 블록에서도 안 보여요.` : `"${tag.name}" 다시 보여요.`)} />
            </div>
            {editing === tag.id && (
              <div className="px-4 pb-3"><TagForm initial={tag} onCancel={() => setEditing(null)}
                onSave={async (body) => (await run(adminApi.updateTag(tag.id, body), '고쳤어요.')) && setEditing(null)} /></div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TagForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [nameEn, setNameEn] = useState(initial?.nameEn || '');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('이름을 적어 주세요.');
    onSave({ name: name.trim(), nameEn: nameEn.trim() });
    return undefined;
  };
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-night/60 p-3" data-testid="tag-form">
      <label className="min-w-[8rem] flex-1">
        <span className="label">이름 (12자)</span>
        <input className="input" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} placeholder="예: 사각사각" data-testid="tag-name" />
      </label>
      <label className="min-w-[8rem] flex-1">
        <span className="label">영어 이름 (선택)</span>
        <input className="input" value={nameEn} maxLength={24} onChange={(e) => setNameEn(e.target.value)} placeholder="Scritchy" />
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>취소</button>
        <button type="submit" className="btn-pink btn-sm" data-testid="tag-save">저장</button>
      </div>
    </form>
  );
}

export default TagManager;
