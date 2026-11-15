import React, { useEffect, useState } from 'react';
import { IoAdd, IoArrowDown, IoArrowUp, IoCreate, IoEye, IoEyeOff } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import { ICON_CHOICES, iconOf, TRIGGER_COLOR } from '../../lib/blocks';
import BlockLoader from '../brand/BlockLoader';
import Brick from '../brand/Brick';

const COLOR_PRESETS = [...Object.values(TRIGGER_COLOR), '#E879F9', '#F59E0B', '#14B8A6', '#6366F1'];

/**
 * 트리거 종류 관리: 묶음(대분류) = 블록 색, 소분류 = 블록 아이콘.
 * 바꾸면 앱·웹 메뉴에 바로 (앱 업데이트 필요 없음). 블록이 달려 있을 수 있어 지우지 않고 숨김
 */
function CategoryManager() {
  const [tree, setTree] = useState(null);
  // 열린 입력 칸: { kind: 'new-group' } | { kind: 'new-child', parent } | { kind: 'edit', category, parent }
  const [form, setForm] = useState(null);

  useEffect(() => {
    adminApi.categories().then(setTree).catch((e) => { toast.error(errorMessage(e)); setTree([]); });
  }, []);

  const run = async (promise, message) => {
    try {
      setTree(await promise);
      if (message) toast.success(message);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };
  const move = (siblings, index, delta) => {
    const ids = siblings.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(adminApi.orderCategories(ids));
  };
  const toggle = (c) => run(adminApi.updateCategory(c.id, { active: !c.active }),
    c.active ? `"${c.name}" 숨겼어요. 이미 있는 블록은 그대로 보여요.` : `"${c.name}" 다시 보여요.`);

  if (tree === null) return <BlockLoader small label="불러오는 중" />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          <b className="text-ink">트리거 묶음</b>의 색이 블록 색, <b className="text-ink">소분류</b>의 아이콘이 블록 아이콘이 돼요.
          고치면 앱·웹에 바로 보여요(앱 업데이트 필요 없음). 블록이 달려 있을 수 있어서 지우지 않고 숨겨요.
        </p>
        <button type="button" className="btn-pink btn-sm" onClick={() => setForm({ kind: 'new-group' })} data-testid="add-group">
          <IoAdd /> 트리거 묶음 추가
        </button>
      </div>

      {form?.kind === 'new-group' && (
        <CategoryForm isGroup onCancel={() => setForm(null)}
          onSave={async (body) => (await run(adminApi.addCategory(body), `"${body.name}" 묶음을 추가했어요.`)) && setForm(null)} />
      )}

      <div className="mt-5 space-y-3">
        {tree.map((g, gi) => (
          <section key={g.id} className={`card overflow-hidden ${g.active ? '' : 'opacity-60'}`} data-testid={`group-${g.code}`}>
            <div className="flex flex-wrap items-center gap-3 p-4" style={{ borderLeft: `5px solid ${g.color}` }}>
              <Brick color={g.color} width={64} height={34} icon={iconOf(g)} />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">{g.name} {!g.active && <HiddenBadge />}</p>
                <p className="truncate text-xs text-faint">{g.code} · 소분류 {g.children.length}개 · 블록 {g.blockCount + g.children.reduce((n, c) => n + c.blockCount, 0)}개{g.description ? ` · ${g.description}` : ''}</p>
              </div>
              <RowActions first={gi === 0} last={gi === tree.length - 1} active={g.active}
                onUp={() => move(tree, gi, -1)} onDown={() => move(tree, gi, 1)} onToggle={() => toggle(g)}
                onEdit={() => setForm({ kind: 'edit', category: g })} />
            </div>
            {form?.kind === 'edit' && form.category.id === g.id && (
              <div className="px-4 pb-4"><CategoryForm isGroup initial={g} onCancel={() => setForm(null)}
                onSave={async (body) => (await run(adminApi.updateCategory(g.id, body), '고쳤어요.')) && setForm(null)} /></div>
            )}

            <div className="border-t border-line bg-night/40">
              {g.children.map((c, ci) => (
                <div key={c.id} className={c.active ? '' : 'opacity-60'} data-testid={`child-${c.code}`}>
                  <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 pl-6">
                    <Brick color={g.color} width={48} height={28} icon={iconOf(c)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{c.name} {!c.active && <HiddenBadge />}</p>
                      <p className="truncate text-[11px] text-faint">{c.code} · 아이콘 {c.icon} · 블록 {c.blockCount}개</p>
                    </div>
                    <RowActions small first={ci === 0} last={ci === g.children.length - 1} active={c.active}
                      onUp={() => move(g.children, ci, -1)} onDown={() => move(g.children, ci, 1)} onToggle={() => toggle(c)}
                      onEdit={() => setForm({ kind: 'edit', category: c, parent: g })} />
                  </div>
                  {form?.kind === 'edit' && form.category.id === c.id && (
                    <div className="px-4 pb-3 pl-6"><CategoryForm initial={c} parentColor={g.color} onCancel={() => setForm(null)}
                      onSave={async (body) => (await run(adminApi.updateCategory(c.id, body), '고쳤어요.')) && setForm(null)} /></div>
                  )}
                </div>
              ))}
              {form?.kind === 'new-child' && form.parent.id === g.id ? (
                <div className="px-4 pb-4 pl-6 pt-2"><CategoryForm parentColor={g.color} parentCode={g.code} onCancel={() => setForm(null)}
                  onSave={async (body) => (await run(adminApi.addCategory({ ...body, parentId: g.id }), `"${body.name}" 소분류를 추가했어요.`)) && setForm(null)} /></div>
              ) : (
                <button type="button" className="flex w-full items-center gap-1.5 px-6 py-2.5 text-left text-xs font-bold text-pink-text hover:bg-card-active"
                  onClick={() => setForm({ kind: 'new-child', parent: g })} data-testid={`add-child-${g.code}`}>
                  <IoAdd /> 소분류 추가
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function HiddenBadge() {
  return <span className="ml-1 rounded-full bg-card-active px-2 py-0.5 align-middle text-[10px] font-bold text-muted">숨김</span>;
}

function RowActions({ first, last, active, onUp, onDown, onEdit, onToggle, small }) {
  const cls = `btn-ghost ${small ? 'p-1.5' : 'p-2'} disabled:opacity-25`;
  return (
    <div className="flex items-center">
      <button type="button" className={cls} onClick={onUp} disabled={first} aria-label="위로"><IoArrowUp /></button>
      <button type="button" className={cls} onClick={onDown} disabled={last} aria-label="아래로"><IoArrowDown /></button>
      <button type="button" className={cls} onClick={onEdit} aria-label="고치기"><IoCreate /></button>
      <button type="button" className={cls} onClick={onToggle} aria-label={active ? '숨기기' : '다시 보이기'} title={active ? '숨기기' : '다시 보이기'}>
        {active ? <IoEye /> : <IoEyeOff />}
      </button>
    </div>
  );
}

/** 묶음·소분류 입력 칸 (추가·고치기 같이 씀) */
function CategoryForm({ initial, isGroup, parentColor, parentCode, onSave, onCancel }) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name || '');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(initial?.color || COLOR_PRESETS[0]);
  const [icon, setIcon] = useState(initial?.icon || 'musical-notes');
  const [description, setDescription] = useState(initial?.description || '');
  const [saving, setSaving] = useState(false);
  const brickColor = isGroup ? color : parentColor;

  const submit = async (e) => {
    e.preventDefault();
    const body = { name: name.trim(), icon };
    if (isGroup) Object.assign(body, { color, description: description.trim() });
    if (!editing && code.trim()) body.code = code.trim();
    setSaving(true);
    await onSave(body);
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="mt-3 rounded-xl border border-line-strong bg-card-active p-4" data-testid="category-form">
      <div className="flex flex-wrap items-center gap-4">
        <Brick color={brickColor} width={120} height={44} icon={iconOf({ icon })} label={name || undefined} />
        <p className="text-xs text-muted">{isGroup ? '블록 색은 이 묶음 색을 따라요' : '블록 색은 묶음 색, 아이콘은 여기서 고른 것'}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">이름</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required
            placeholder={isGroup ? '예: 먹방·씹기' : '예: 등대·뱃고동'} data-testid="category-name" />
        </label>
        {!editing && (
          <label className="block">
            <span className="label">영문 코드 <span className="text-xs font-normal text-faint">(선택, 비우면 자동)</span></span>
            <div className="flex items-center gap-1">
              {!isGroup && <span className="text-xs text-faint">{parentCode}.</span>}
              <input className="input" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} maxLength={20}
                pattern="[a-z][a-z0-9_\-]{1,19}" placeholder={isGroup ? 'mukbang' : 'lighthouse'} />
            </div>
          </label>
        )}
        {isGroup && (
          <label className="block sm:col-span-2">
            <span className="label">한 줄 설명 <span className="text-xs font-normal text-faint">(선택)</span></span>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100}
              placeholder="예: 씹는 소리, 바삭한 소리" />
          </label>
        )}
      </div>
      {isGroup && (
        <div className="mt-3">
          <span className="label">블록 색</span>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c}
                className={`h-7 w-7 rounded-lg border-2 ${color.toLowerCase() === c.toLowerCase() ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} aria-label="직접 고르기"
              className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent" />
          </div>
        </div>
      )}
      <div className="mt-3">
        <span className="label">아이콘 <span className="text-xs font-normal text-faint">{icon}</span></span>
        <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto rounded-xl bg-night p-2 sm:grid-cols-12">
          {ICON_CHOICES.map((name) => {
            const Icon = iconOf({ icon: name });
            return (
              <button key={name} type="button" onClick={() => setIcon(name)} title={name} aria-label={name}
                className={`flex h-9 items-center justify-center rounded-lg ${icon === name ? 'bg-pink text-white' : 'text-muted hover:bg-card-active hover:text-ink'}`}>
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>취소</button>
        <button type="submit" className="btn-pink btn-sm" disabled={saving || !name.trim()} data-testid="category-save">
          {saving ? '저장 중…' : editing ? '저장' : '추가'}
        </button>
      </div>
    </form>
  );
}

export default CategoryManager;
