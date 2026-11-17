import React, { useEffect, useRef, useState } from 'react';
import { IoAdd, IoArrowBack, IoArrowForward, IoCloudUpload, IoCreate, IoEye, IoEyeOff } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import { TRIGGER_COLOR } from '../../lib/blocks';
import { loadStickers, StickerImage } from '../../lib/stickers';
import BlockLoader from '../brand/BlockLoader';

/**
 * 스티커 관리: 그림(SVG 추천, PNG도 됨)을 올리면 앱·웹의 블록 판매 화면에 바로 나옴 (앱 업데이트 필요 없음).
 * 숨기면 새로 고를 수 없지만, 이미 붙인 블록에는 그대로 보임
 */
function StickerManager() {
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    adminApi.stickers().then(setList).catch((e) => { toast.error(errorMessage(e)); setList([]); });
  }, []);

  /** 바꾼 뒤: 이 화면 목록 + 사이트 전체 블록 그림 다시 받기 */
  const refresh = async (next) => {
    setList(next || await adminApi.stickers());
    loadStickers(true);
  };
  const move = async (index, delta) => {
    const codes = list.map((s) => s.code);
    const target = index + delta;
    if (target < 0 || target >= codes.length) return;
    [codes[index], codes[target]] = [codes[target], codes[index]];
    try { await refresh(await adminApi.orderStickers(codes)); } catch (e) { toast.error(errorMessage(e)); }
  };
  const toggle = async (s) => {
    try {
      await adminApi.updateSticker(s.code, { active: !s.active });
      await refresh();
      toast.success(s.active ? `"${s.name}" 숨겼어요. 이미 붙인 블록에는 그대로 보여요.` : `"${s.name}" 다시 고를 수 있어요.`);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  /** 이름 + 영어 이름 (영어를 비우면 지움 → 영어 화면은 기본 영어 이름이나 한국어 이름) */
  const rename = async (s, name, nameEn) => {
    try {
      await adminApi.updateSticker(s.code, { name, nameEn });
      await refresh();
      setEditing(null);
    } catch (e) { toast.error(errorMessage(e)); }
  };

  if (list === null) return <BlockLoader small label="불러오는 중" />;
  const activeCount = list.filter((s) => s.active).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          판매자가 블록 겉면에 붙이는 그림이에요. 올리면 앱·웹의 블록 판매 화면에 바로 나와요(앱 업데이트 필요 없음).
          숨기면 새로 고를 수 없지만, 이미 붙인 블록에는 그대로 보여요. 지금 고를 수 있는 스티커 {activeCount}개.
          영어 이름은 영어 화면에 보여요.
        </p>
        {!adding && <button type="button" className="btn-pink btn-sm" onClick={() => setAdding(true)} data-testid="add-sticker"><IoAdd /> 스티커 추가</button>}
      </div>

      {adding && <AddSticker onCancel={() => setAdding(false)} onAdded={async (s) => { await refresh(); setAdding(false); toast.success(`"${s.name}" 스티커를 추가했어요.`); }} />}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {list.map((s, i) => (
          <div key={s.code} className={`card flex flex-col items-center gap-2 p-3 ${s.active ? '' : 'opacity-50'}`} data-testid={`admin-sticker-${s.code}`}>
            <div className="flex h-16 w-full items-center justify-center rounded-xl pat-dots-light" style={{ background: TRIGGER_COLOR.tap }}>
              <StickerImage sticker={s} className="h-10 w-auto max-w-[80%] drop-shadow" />
            </div>
            {editing === s.code ? (
              <RenameInput initial={s.name} initialEn={s.nameEn} onSave={(name, nameEn) => rename(s, name, nameEn)} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <p className="w-full truncate text-center text-sm font-bold">{s.name}{!s.active && <span className="ml-1 text-[10px] text-muted">숨김</span>}</p>
                <p className="-mt-1.5 w-full truncate text-center text-[11px] text-muted" data-testid={`sticker-en-${s.code}`}>EN {s.nameEn || '-'}</p>
              </>
            )}
            <p className="text-[10px] text-faint">{s.code} · {s.svg ? 'SVG' : 'PNG'}</p>
            <div className="flex">
              <button type="button" className="btn-ghost p-1.5 disabled:opacity-25" onClick={() => move(i, -1)} disabled={i === 0} aria-label="앞으로"><IoArrowBack /></button>
              <button type="button" className="btn-ghost p-1.5 disabled:opacity-25" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="뒤로"><IoArrowForward /></button>
              <button type="button" className="btn-ghost p-1.5" onClick={() => setEditing(s.code)} aria-label="이름 고치기"><IoCreate /></button>
              <button type="button" className="btn-ghost p-1.5" onClick={() => toggle(s)} aria-label={s.active ? '숨기기' : '다시 보이기'}
                title={s.active ? '숨기기' : '다시 보이기'} data-testid={`toggle-sticker-${s.code}`}>
                {s.active ? <IoEye /> : <IoEyeOff />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RenameInput({ initial, initialEn, onSave, onCancel }) {
  const [name, setName] = useState(initial);
  const [nameEn, setNameEn] = useState(initialEn || '');
  const cls = 'w-full min-w-0 rounded-lg border border-line bg-night px-2 py-1 text-xs';
  const esc = (e) => e.key === 'Escape' && onCancel();
  return (
    <form className="flex w-full flex-col gap-1" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim(), nameEn.trim()); }}>
      <input className={cls} value={name} maxLength={10} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={esc} aria-label="스티커 이름" />
      <input className={cls} value={nameEn} maxLength={20} onChange={(e) => setNameEn(e.target.value)} onKeyDown={esc}
        placeholder="영어 이름 (선택)" aria-label="영어 이름" data-testid="sticker-rename-en" />
      <button type="submit" className="btn-pink px-2 py-1 text-xs">저장</button>
    </form>
  );
}

/** 스티커 추가: 이름 + 그림 파일, 블록 위에 어떻게 보일지 미리보기 */
function AddSticker({ onAdded, onCancel }) {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const pick = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!name) setName(f.name.replace(/\.[^.]+$/, '').slice(0, 10));
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('그림 파일을 골라 주세요.');
    const form = new FormData();
    form.append('name', name.trim());
    if (nameEn.trim()) form.append('nameEn', nameEn.trim());
    form.append('file', file);
    setSaving(true);
    try {
      onAdded(await adminApi.addSticker(form));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-line-strong bg-card-active p-4" data-testid="sticker-form">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <div className="space-y-3">
          <label className="block">
            <span className="label">이름 <span className="text-xs font-normal text-faint">(판매 화면에 보여요, 10자까지)</span></span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={10} required placeholder="예: 등대" data-testid="sticker-name" />
          </label>
          <label className="block">
            <span className="label">영어 이름 <span className="text-xs font-normal text-faint">(영어 화면, 선택, 20자까지)</span></span>
            <input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={20} placeholder="e.g. Lighthouse" data-testid="sticker-name-en" />
          </label>
          <div>
            <span className="label">그림 파일</span>
            <button type="button" className="btn-line w-full" onClick={() => inputRef.current?.click()}>
              <IoCloudUpload /> {file ? file.name : 'SVG 또는 PNG 고르기'}
            </button>
            <input ref={inputRef} type="file" className="hidden" accept=".svg,.png,.jpg,.jpeg,.webp" onChange={(e) => pick(e.target.files?.[0])} data-testid="sticker-file" />
            <p className="mt-1.5 text-xs text-faint">
              SVG 추천: 30KB까지, viewBox 필수, 색은 fill 속성으로 (script·style·외부 그림은 안 돼요).
              PNG는 투명 배경 정사각형이 좋아요 (256px로 줄여서 저장, 2MB까지).
            </p>
          </div>
        </div>
        <div>
          <span className="label">미리보기</span>
          <div className="flex h-28 items-center justify-center gap-2 rounded-xl pat-dots-light" style={{ background: TRIGGER_COLOR.nature }}>
            {preview ? <img src={preview} alt="" className="h-12 w-auto max-w-[70%] drop-shadow" /> : <span className="text-xs text-white/80">그림을 고르면 보여요</span>}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>취소</button>
        <button type="submit" className="btn-pink btn-sm" disabled={saving || !file || !name.trim()} data-testid="sticker-save">
          {saving ? '올리는 중…' : '추가'}
        </button>
      </div>
    </form>
  );
}

export default StickerManager;
