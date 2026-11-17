import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { errorMessage, sellerApi } from '../../api/api';
import { TALK_TYPES, talkLabel } from '../../lib/blocks';

/**
 * 내가 올린 블록 고치기: 이름·한 줄 소개·녹음한 곳·말소리·가격 + 영어 칸 + 상점에 보이기(판매 중일 때).
 * 돌려보낸 블록은 저장하면 다시 검수를 받아요
 */
function EditUpload({ upload, priceSteps, maxPrice, onSaved, onCancel }) {
  const { t } = useTranslation();
  const [f, setF] = useState({
    title: upload.title || '', description: upload.description || '', recordedPlace: upload.recordedPlace || '',
    titleEn: upload.titleEn || '', descriptionEn: upload.descriptionEn || '', recordedPlaceEn: upload.recordedPlaceEn || '',
    talkType: upload.talkType || 'NONE', price: upload.price || 0, listed: upload.listed !== false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const prices = [...new Set([...priceSteps.filter((p) => p <= maxPrice), f.price])].sort((a, b) => a - b);
  const rejected = upload.status === 'REJECTED';

  const save = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return toast.error(t('sell.needTitle'));
    setSaving(true);
    try {
      const body = { ...f, title: f.title.trim() };
      if (upload.status !== 'APPROVED') delete body.listed;
      const res = await sellerApi.update(upload.id, body);
      toast.success(res.message);
      onSaved(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <form onSubmit={save} className="space-y-4 border-t border-line bg-night/40 p-4" data-testid={`edit-upload-${upload.id}`}>
      {rejected && <p className="rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">{t('sell.editRejectedHint')}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t('sell.name')} value={f.title} onChange={set('title')} max={60} testId="edit-title" />
        <Input label={t('sell.place')} value={f.recordedPlace} onChange={set('recordedPlace')} max={60} />
        <div className="sm:col-span-2"><Input label={t('sell.note')} value={f.description} onChange={set('description')} max={80} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {TALK_TYPES.map((k) => (
          <button key={k} type="button" className={`chip px-3 py-1 text-xs ${f.talkType === k ? 'chip-on' : ''}`}
            onClick={() => setF((x) => ({ ...x, talkType: k }))}>{talkLabel(k)}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted">{t('sell.price')}</span>
        {prices.map((p) => (
          <button key={p} type="button" className={`chip px-3 py-1 text-xs ${f.price === p ? 'chip-on' : ''}`}
            onClick={() => setF((x) => ({ ...x, price: p }))} data-testid={`edit-price-${p}`}>
            {p === 0 ? t('common.free') : t('common.coins', { count: p })}
          </button>
        ))}
      </div>
      <EnglishFields value={f} onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))} open={!!(upload.titleEn || upload.descriptionEn || upload.recordedPlaceEn)} />
      {upload.status === 'APPROVED' && (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#F7609A]" checked={f.listed}
            onChange={(e) => setF((x) => ({ ...x, listed: e.target.checked }))} data-testid="edit-listed" />
          <span><b>{t('sell.listed')}</b><span className="block text-xs text-muted">{t('sell.listedHint')}</span></span>
        </label>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="submit" className="btn-pink btn-sm" disabled={saving} data-testid="edit-save">
          {saving ? t('create.saving') : rejected ? t('sell.editResubmit') : t('sell.editSave')}
        </button>
      </div>
    </form>
  );
}

/** 영어로도 적기 (선택): 영어 화면에 보이는 제목·녹음한 곳·한 줄 소개 — 올리기·고치기 같이 씀 */
export function EnglishFields({ value, onChange, open = false }) {
  const { t } = useTranslation();
  return (
    <details className="rounded-xl border border-line p-3" open={open}>
      <summary className="cursor-pointer text-sm font-bold" data-testid="en-fields">{t('sell.enTitle')}</summary>
      <p className="mt-1 text-xs text-muted">{t('sell.enHint')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input label={t('sell.enName')} value={value.titleEn} onChange={(e) => onChange('titleEn', e.target.value)} max={60} ph={t('sell.enNamePh')} testId="en-title" />
        <Input label={t('sell.enPlace')} value={value.recordedPlaceEn} onChange={(e) => onChange('recordedPlaceEn', e.target.value)} max={60} ph={t('sell.enPlacePh')} testId="en-place" />
        <div className="sm:col-span-2">
          <Input label={t('sell.enNote')} value={value.descriptionEn} onChange={(e) => onChange('descriptionEn', e.target.value)} max={120} ph={t('sell.enNotePh')} testId="en-note" />
        </div>
      </div>
    </details>
  );
}

function Input({ label, value, onChange, max, ph, testId }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" value={value} onChange={onChange} maxLength={max} placeholder={ph} data-testid={testId} />
    </label>
  );
}

export default EditUpload;
