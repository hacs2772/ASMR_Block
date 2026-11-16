import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IoCash, IoCloudUpload, IoImage, IoMusicalNotes, IoShieldCheckmark, IoVideocam } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { catalogApi, errorMessage, sellerApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import BetaLoginButton from '../components/common/BetaLoginButton';
import BlockProductCard from '../components/block/BlockProductCard';
import Trimmer from '../components/sell/Trimmer';
import { useStopPreviewOnLeave } from '../hooks/usePreview';
import { categoryLabel, colorOf, formatDuration, talkLabel, TALK_TYPES } from '../lib/blocks';
import { MAX_STICKERS, PATTERNS, patternLabel, StickerImage, stickerName, useStickers } from '../lib/stickers';
import { canTrim, initialRange, trimParams } from '../lib/trim';
import useAuthStore from '../store/authStore';
import { RecordingGuideLink } from './RecordingGuidePage';

const PRICE_STEPS = [0, 10, 20, 30, 50, 100];
const STATUS = {
  PENDING: 'bg-warn/15 text-warn',
  APPROVED: 'bg-success/15 text-success',
  REJECTED: 'bg-danger/15 text-danger',
};

/** 파일의 길이(초)를 브라우저에서 읽어 봄 (미리보기 블록 길이 · 길이 확인용). 영상도 같은 방법 */
function readDuration(url, isVideo = false) {
  return new Promise((resolve) => {
    const a = isVideo ? document.createElement('video') : new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => resolve(null);
    a.src = url;
  });
}

/**
 * 블록 판매 (크리에이터): 내 트리거 녹음을 블록으로 올리기.
 * 파일 → 이름 · 트리거 종류 · 말소리 · 녹음한 곳 · 한 줄 소개 · 가격 → 상점 카드 미리보기 → 올리기(검수 후 판매)
 */
function SellPage() {
  useStopPreviewOnLeave();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const { hash } = useLocation();
  const [policy, setPolicy] = useState(null);
  const [groups, setGroups] = useState([]);
  const [mine, setMine] = useState(null);

  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [duration, setDuration] = useState(null);
  // 구간 고르기: 파일을 고르면 먼저 올려서 파형을 받음 (draft = { draftId, duration, peaks })
  const [draft, setDraft] = useState(null);
  const [draftProgress, setDraftProgress] = useState(null);
  const [range, setRange] = useState(null);
  const pickToken = useRef(0);
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [talkType, setTalkType] = useState('NONE');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [price, setPrice] = useState(0);
  const [agree, setAgree] = useState(false);
  const [progress, setProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  // 올릴 것: 소리만(audio) 또는 영상(video). 영상이면 소리는 영상에서 뽑고, 고른 구간으로 소리·화면을 같이 잘라 싱크가 맞음
  const [kind, setKind] = useState('audio');
  // 블록 꾸미기(C안): 사진이 있으면 사진, 없으면 스티커 + 무늬
  const [cover, setCover] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [stickers, setStickers] = useState([]);
  // 고를 수 있는 스티커 (관리자가 숨긴 것은 빼고, 서버 순서대로)
  const { active: stickerChoices } = useStickers();
  const [pattern, setPattern] = useState('dots');
  const coverInputRef = useRef(null);

  const maxPrice = policy?.maxPrice ?? 100;
  const maxFileMb = policy?.maxFileMb ?? 50;

  useEffect(() => {
    sellerApi.policy().then(setPolicy).catch(() => {});
    catalogApi.categories().then(setGroups).catch(() => setGroups([]));
  }, []);
  const loadMine = () => sellerApi.mine().then((p) => setMine(p.content)).catch(() => setMine([]));
  useEffect(() => { if (isAuthenticated) loadMine(); }, [isAuthenticated]);
  useEffect(() => {
    if (hash === '#mine' && mine) document.getElementById('mine')?.scrollIntoView({ behavior: 'smooth' });
  }, [hash, mine]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);
  useEffect(() => () => { if (coverUrl) URL.revokeObjectURL(coverUrl); }, [coverUrl]);

  const maxVideoMb = policy?.maxVideoMb ?? 200;
  const maxImageMb = policy?.maxImageMb ?? 10;
  const pickCover = (f) => {
    if (!f) return undefined;
    if (f.size > maxImageMb * 1024 * 1024) return toast.error(t('sell.imageTooBig', { mb: maxImageMb }));
    setCover(f);
    setCoverUrl(URL.createObjectURL(f));
    return undefined;
  };
  const toggleSticker = (code) => setStickers((list) => (list.includes(code) ? list.filter((c) => c !== code)
    : list.length >= MAX_STICKERS ? list : [...list, code]));

  /** 끌어 온 파일이 영상인지 소리인지 (webm처럼 둘 다 되는 형식은 지금 고른 쪽) */
  const kindOf = (f) => {
    if (f.type?.startsWith('video/')) return 'video';
    if (f.type?.startsWith('audio/')) return 'audio';
    const ext = f.name.split('.').pop()?.toLowerCase();
    const isVideo = policy?.videoExtensions?.includes(ext);
    const isAudio = policy?.extensions?.includes(ext);
    return isVideo && !isAudio ? 'video' : isAudio && !isVideo ? 'audio' : kind;
  };
  const clearFile = () => {
    pickToken.current += 1;
    setFile(null); setFileUrl(null); setDuration(null); setDraft(null); setRange(null); setDraftProgress(null);
  };
  const switchKind = (k) => {
    if (k === kind) return;
    clearFile();
    setKind(k);
  };

  const pick = async (f) => {
    if (!f) return;
    const k = kindOf(f);
    const limit = k === 'video' ? maxVideoMb : maxFileMb;
    if (f.size > limit * 1024 * 1024) return toast.error(t(k === 'video' ? 'sell.videoTooBig' : 'sell.audioTooBig', { mb: limit }));
    const url = URL.createObjectURL(f);
    const token = ++pickToken.current;
    setKind(k);
    setFile(f);
    setFileUrl(url);
    setDraft(null);
    setRange(null);
    setDraftProgress(0);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 60));
    readDuration(url, k === 'video').then((d) => { if (token === pickToken.current) setDuration(d); });
    // 먼저 올려서 파형 받기 (그동안 이름·트리거를 적으면 돼요). 실패하면 구간 고르기 없이 파일을 그대로 올림
    try {
      const d = await sellerApi.draft(f, (p) => token === pickToken.current && setDraftProgress(p), k);
      if (token !== pickToken.current) return undefined;
      setDraft(d);
      setDuration(d.duration);
      setRange(initialRange(d.duration, policy?.maxSeconds ?? 1200));
    } catch (e) {
      if (token === pickToken.current) toast.error(errorMessage(e, t('sell.draftFailed')));
    } finally {
      if (token === pickToken.current) setDraftProgress(null);
    }
    return undefined;
  };

  const group = groups.find((g) => g.id === groupId);
  const category = group?.children?.find((c) => c.id === categoryId);
  // 블록 길이: 고른 구간 (파형을 못 만들었으면 파일 전체)
  const soundLength = file ? (range ? range.end - range.start : duration) : null;
  const lengthProblem = soundLength && policy
    ? (soundLength < policy.minSeconds ? t('sell.tooShort', { sec: Math.round(policy.minSeconds) }) : soundLength > policy.maxSeconds + 0.05 ? t('sell.tooLong', { min: policy.maxSeconds / 60 }) : null)
    : null;
  const missing = !file ? t(kind === 'video' ? 'sell.needVideo' : 'sell.needAudio')
    : draftProgress !== null ? t('sell.drafting', { p: draftProgress })
    : lengthProblem || (!title.trim() ? t('sell.needTitle')
    : !categoryId ? t('sell.needTrigger') : !agree ? t('sell.needAgree') : null);

  // 상점에서 보일 모습 그대로
  const previewBlock = useMemo(() => ({
    id: -1, title: title.trim() || t('sell.previewTitle'), description: note, duration: soundLength || 200, price,
    talkType, recordedPlace: place.trim() || null, owned: true, fileUrl,
    category: category ? { ...category, parentName: group?.name, color: group?.color } : group ? { ...group, parentName: group.name } : null,
    uploader: { nickname: user?.nickname || t('sell.me') },
    design: { coverUrl, stickers, pattern, hasVideo: !!file && kind === 'video', videoUrl: null },
  }), [title, note, soundLength, price, talkType, place, category, group, user, fileUrl, coverUrl, stickers, pattern, file, kind, t]);

  const submit = async () => {
    if (missing) return;
    const form = new FormData();
    // 먼저 올린 파일이 있으면 그걸 쓰고(다시 안 보냄), 고른 구간만
    if (draft) {
      form.append('draftId', draft.draftId);
      const trim = trimParams(range, draft.duration);
      if (trim) {
        form.append('trimStart', String(trim.trimStart));
        form.append('trimEnd', String(trim.trimEnd));
      }
    } else if (file) {
      form.append(kind === 'video' ? 'video' : 'file', file);
    }
    if (cover) form.append('cover', cover);
    if (stickers.length) form.append('stickers', stickers.join(','));
    form.append('pattern', pattern);
    form.append('title', title.trim());
    form.append('categoryId', String(categoryId));
    form.append('license', 'OWN');
    form.append('price', String(price));
    form.append('talkType', talkType);
    if (place.trim()) form.append('recordedPlace', place.trim());
    if (note.trim()) form.append('description', note.trim());
    setProgress(0);
    try {
      await sellerApi.upload(form, setProgress);
      toast.success(t('sell.uploaded'));
      clearFile(); setTitle(''); setPlace(''); setNote(''); setAgree(false);
      setCover(null); setCoverUrl(null); setStickers([]);
      loadMine();
    } catch (e) {
      toast.error(errorMessage(e, t('sell.uploadFailed')));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="page pt-10">
      <p className="eyebrow">{t('sell.eyebrow')}</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('sell.title')}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        {t('sell.lead')}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Info icon={IoCloudUpload} title={t('sell.info1Title')} body={t('sell.info1Body')} />
        <Info icon={IoShieldCheckmark} title={t('sell.info2Title')} body={t('sell.info2Body')} />
        <Info icon={IoCash} title={t('sell.info3Title')} body={t('sell.info3Body', { max: maxPrice })} />
      </div>
      <RecordingGuideLink className="mt-3" />

      {!isAuthenticated ? (
        <div className="card mt-10 flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-lg font-bold">{t('sell.loginPrompt')}</p>
          <BetaLoginButton className="w-full max-w-sm" />
          <div className="flex gap-2"><Link to="/login" className="btn-pink">{t('sell.login')}</Link><Link to="/signup" className="btn-line">{t('sell.signup')}</Link></div>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="card space-y-7 p-6 sm:p-8">
            {/* 파일 */}
            <div>
              <p className="label">{t('sell.whatLabel')}</p>
              <div className="mb-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('sell.whatLabel')}>
                {[
                  { k: 'audio', icon: IoMusicalNotes, title: t('sell.kindAudio'), body: t('sell.kindAudioBody') },
                  { k: 'video', icon: IoVideocam, title: t('sell.kindVideo'), body: t('sell.kindVideoBody') },
                ].map((o) => (
                  <button key={o.k} type="button" role="radio" aria-checked={kind === o.k} onClick={() => switchKind(o.k)} data-testid={`sell-kind-${o.k}`}
                    className={`flex min-w-0 items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                      kind === o.k ? 'border-pink bg-pink-soft' : 'border-line bg-card hover:border-line-strong'}`}>
                    <o.icon size={20} className={`mt-0.5 shrink-0 ${kind === o.k ? 'text-pink-text' : 'text-faint'}`} />
                    <span className="min-w-0">
                      <span className={`block text-sm font-bold ${kind === o.k ? 'text-pink-text' : ''}`}>{o.title}</span>
                      <span className="block text-[11px] leading-snug text-muted">{o.body}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
                className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver ? 'border-pink bg-pink-soft' : 'border-line-strong hover:border-faint'}`} data-testid="sell-drop">
                {file ? (
                  <>
                    {kind === 'video' ? <IoVideocam size={28} className="text-pink-text" /> : <IoMusicalNotes size={28} className="text-pink-text" />}
                    <span className="max-w-full truncate font-bold">{file.name}</span>
                    <span className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(1)}MB{duration ? ` · ${formatDuration(duration)}` : ''} · {t('sell.change')}</span>
                    {lengthProblem && <span className="text-xs font-bold text-danger">{lengthProblem}</span>}
                  </>
                ) : (
                  <>
                    <IoCloudUpload size={30} className="text-faint" />
                    <span className="font-bold">{t(kind === 'video' ? 'sell.dropVideo' : 'sell.dropAudio')}</span>
                    <span className="text-xs text-faint">
                      {!policy ? 'mp3, m4a, wav …' : kind === 'video'
                        ? t('sell.dropHint', { exts: policy.videoExtensions.join(', '), mb: maxVideoMb })
                        : t('sell.dropHint', { exts: policy.extensions.join(', '), mb: maxFileMb })}
                    </span>
                    {kind === 'video' && (
                      <span className="text-[11px] text-faint">{t('sell.videoNote')}</span>
                    )}
                  </>
                )}
              </button>
              <input ref={inputRef} type="file" className="hidden" data-testid="sell-file"
                accept={!policy ? (kind === 'video' ? 'video/*' : 'audio/*')
                  : (kind === 'video' ? policy.videoExtensions : policy.extensions).map((x) => `.${x}`).join(',')}
                onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />

              {/* 구간 고르기: 길게 녹음했으면 쓸 부분만 (영상이면 화면도 같이) */}
              {file && draftProgress !== null && (
                <div className="mt-3 rounded-xl bg-card-active p-3.5 text-sm text-muted" data-testid="draft-progress">
                  {t('sell.waveMaking')} {draftProgress < 100 ? `${draftProgress}%` : t('sell.almostDone')}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-pink transition-all" style={{ width: `${draftProgress}%` }} /></div>
                </div>
              )}
              {file && draft && range && canTrim(draft.duration, policy?.minSeconds ?? 10) && (
                <div className="mt-3">
                  {draft.duration > (policy?.maxSeconds ?? 1200) && (
                    <p className="mb-2 text-xs text-warn">{t('sell.overMax', { min: (policy?.maxSeconds ?? 1200) / 60 })}</p>
                  )}
                  <Trimmer src={fileUrl} duration={draft.duration} peaks={draft.peaks} range={range} onChange={setRange}
                    min={policy?.minSeconds ?? 10} max={policy?.maxSeconds ?? 1200} video={kind === 'video'} />
                </div>
              )}
            </div>

            {/* 블록 꾸미기 (C안) */}
            <div>
              <p className="label">{t('sell.designLabel')} <span className="ml-1 text-xs font-normal text-faint">· {t('sell.designHint')}</span></p>
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card-active p-3.5">
                {coverUrl ? <img src={coverUrl} alt={t('sell.coverAlt')} className="h-12 w-20 rounded-md object-cover" /> : <IoImage size={22} className="text-pink-text" />}
                <p className="min-w-0 flex-1 basis-44 text-sm"><b>{t('sell.cover')}</b> <span className="text-xs text-faint">{t('sell.coverHint', { mb: maxImageMb })}</span></p>
                {cover ? (
                  <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => { setCover(null); setCoverUrl(null); }}>{t('sell.remove')}</button>
                ) : (
                  <button type="button" className="btn-line btn-sm ml-auto" onClick={() => coverInputRef.current?.click()} data-testid="sell-cover-pick">{t('sell.pickPhoto')}</button>
                )}
                <input ref={coverInputRef} type="file" className="hidden" data-testid="sell-cover"
                  accept={policy ? policy.imageExtensions.map((x) => `.${x}`).join(',') : 'image/*'} onChange={(e) => pickCover(e.target.files?.[0])} />
              </div>
              <p className="mb-2 mt-4 text-sm font-bold">{t('sell.stickers')} <span className="text-xs font-normal text-faint">· {t('sell.stickersHint', { max: MAX_STICKERS })}{cover ? t('sell.stickersHidden') : ''}</span></p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {stickerChoices.map((st) => (
                  <button key={st.code} type="button" onClick={() => toggleSticker(st.code)} data-testid={`sticker-${st.code}`}
                    className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 pb-1.5 pt-2 text-[11px] transition-colors ${
                      stickers.includes(st.code) ? 'border-pink bg-pink-soft text-pink-text' : 'border-line bg-card text-muted hover:text-ink'}`}>
                    <span className="flex h-7"><StickerImage sticker={st} className="h-full w-auto max-w-none" /></span>
                    <span className="w-full truncate text-center">{stickerName(st)}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted">{t('sell.pattern')}</span>
                {PATTERNS.map((p) => (
                  <button key={p.key} type="button" className={`chip px-3 py-1 text-xs ${pattern === p.key ? 'chip-on' : ''}`} onClick={() => setPattern(p.key)}>{patternLabel(p.key)}</button>
                ))}
              </div>
            </div>

            <Field label={t('sell.name')} hint={t('sell.nameHint')}>
              <input className="input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={t('sell.namePh')} data-testid="sell-title" />
            </Field>

            <Field label={t('sell.trigger')} hint={t('sell.triggerHint')}>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button key={g.id} type="button" className={`chip ${groupId === g.id ? 'chip-on' : ''}`}
                    onClick={() => { setGroupId(g.id); setCategoryId(null); }} data-testid={`sell-group-${g.code}`}>
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />{categoryLabel(g)}
                  </button>
                ))}
              </div>
              {group && (
                <div className="mt-3 flex flex-wrap gap-2 border-l-2 pl-3" style={{ borderColor: colorOf(group) }}>
                  {group.children.map((c) => (
                    <button key={c.id} type="button" className={`chip px-3 py-1 text-xs ${categoryId === c.id ? 'chip-on' : ''}`}
                      onClick={() => setCategoryId(c.id)} data-testid={`sell-sub-${c.code}`}>{categoryLabel(c)}</button>
                  ))}
                </div>
              )}
            </Field>

            <Field label={t('sell.talk')}>
              <div className="flex flex-wrap gap-2">
                {TALK_TYPES.map((k) => (
                  <button key={k} type="button" className={`chip ${talkType === k ? 'chip-on' : ''}`} onClick={() => setTalkType(k)}>{talkLabel(k)}</button>
                ))}
              </div>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('sell.place')} hint={t('sell.optional')}>
                <input className="input" value={place} maxLength={60} onChange={(e) => setPlace(e.target.value)} placeholder={t('sell.placePh')} />
              </Field>
              <Field label={t('sell.note')} hint={t('sell.optional')}>
                <input className="input" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder={t('sell.notePh')} />
              </Field>
            </div>

            <Field label={t('sell.price')} hint={t('sell.priceHint', { max: maxPrice })}>
              <div className="flex flex-wrap gap-2">
                {PRICE_STEPS.filter((p) => p <= maxPrice).map((p) => (
                  <button key={p} type="button" className={`chip ${price === p ? 'chip-on' : ''}`} onClick={() => setPrice(p)}>
                    {p === 0 ? t('common.free') : t('common.coins', { count: p })}
                  </button>
                ))}
              </div>
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-card-active p-4 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#F7609A]" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-testid="sell-agree" />
              <span className="leading-relaxed text-muted">
                <b className="text-ink">{t('sell.agreeStrong')}</b> {t('sell.agreeRest')}
              </span>
            </label>

            <button type="button" className="btn-pink w-full py-3.5 text-base" onClick={submit} disabled={!!missing || progress !== null} data-testid="sell-submit">
              <IoCloudUpload size={18} />
              {progress !== null ? t('sell.uploading', { p: progress }) : missing || t('sell.submit')}
            </button>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <p className="text-sm font-bold text-muted">{t('sell.previewLabel')}</p>
            <BlockProductCard block={previewBlock} preview />
            <p className="text-xs leading-relaxed text-faint">{t('sell.previewNote')}</p>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <section id="mine" className="mt-16 scroll-mt-24">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-2xl font-extrabold">{t('sell.mine')}</h2>
            {user?.id && (
              <Link to={`/creator/${user.id}`} className="btn-line btn-sm" data-testid="my-creator-page">{t('sell.myPage')}</Link>
            )}
          </div>
          <div className="mt-5">
            {mine === null ? <BlockLoader small /> : mine.length === 0 ? (
              <p className="card p-6 text-sm text-muted">{t('sell.mineEmpty')}</p>
            ) : (
              <div className="card divide-y divide-line">
                {mine.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 p-4" style={{ borderLeft: `4px solid ${colorOf(u.category)}` }} data-testid={`my-upload-${u.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{u.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {categoryLabel(u.category) || t('common.other')} · {talkLabel(u.talkType)} · {formatDuration(u.duration)} · {u.price > 0 ? t('common.coins', { count: u.price }) : t('common.free')}
                        {u.recordedPlace ? ` · ${u.recordedPlace}` : ''}
                      </p>
                      {u.status === 'REJECTED' && u.reviewNote && (
                        <p className="mt-1.5 rounded-lg bg-danger/10 px-2.5 py-1.5 text-xs text-danger" data-testid={`review-note-${u.id}`}>{t('sell.reviewNote', { note: u.reviewNote })}</p>
                      )}
                    </div>
                    {u.design?.hasVideo && <span className="flex items-center gap-1 text-xs text-muted"><IoVideocam /> {t('sell.kindVideo')}</span>}
                    <span className="hidden text-xs text-muted sm:block">{t('sell.collected', { count: u.collectedCount })}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[u.status] || ''}`}>{STATUS[u.status] ? t(`sell.status.${u.status}`) : u.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <p className="label">{label} {hint && <span className="ml-1 text-xs font-normal text-faint">· {hint}</span>}</p>
      {children}
    </div>
  );
}

function Info({ icon: Icon, title, body }) {
  return (
    <div className="card flex gap-3 p-4">
      <Icon size={20} className="mt-0.5 shrink-0 text-pink-text" />
      <div><p className="text-sm font-bold">{title}</p><p className="mt-0.5 text-xs text-muted">{body}</p></div>
    </div>
  );
}

export default SellPage;
