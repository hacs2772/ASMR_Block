import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IoCash, IoCloudUpload, IoImage, IoMusicalNotes, IoShieldCheckmark, IoVideocam } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { catalogApi, errorMessage, sellerApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import BetaLoginButton from '../components/common/BetaLoginButton';
import BlockProductCard from '../components/block/BlockProductCard';
import { useStopPreviewOnLeave } from '../hooks/usePreview';
import { colorOf, formatDuration, TALK_LABEL } from '../lib/blocks';
import { MAX_STICKERS, PATTERNS, STICKER_CODES, STICKERS } from '../lib/stickers';
import useAuthStore from '../store/authStore';

const PRICE_STEPS = [0, 10, 20, 30, 50, 100];
const STATUS = {
  PENDING: { label: '검수 중', cls: 'bg-warn/15 text-warn' },
  APPROVED: { label: '판매 중', cls: 'bg-success/15 text-success' },
  REJECTED: { label: '거절됨', cls: 'bg-danger/15 text-danger' },
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
  const { isAuthenticated, user } = useAuthStore();
  const { hash } = useLocation();
  const [policy, setPolicy] = useState(null);
  const [groups, setGroups] = useState([]);
  const [mine, setMine] = useState(null);

  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [duration, setDuration] = useState(null);
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
  // 영상(선택): 소리 파일이 없으면 영상의 소리를 블록 음원으로 씀
  const [video, setVideo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const videoInputRef = useRef(null);
  // 블록 꾸미기(C안): 사진이 있으면 사진, 없으면 스티커 + 무늬
  const [cover, setCover] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [stickers, setStickers] = useState([]);
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
  const pickVideo = async (f) => {
    if (!f) return undefined;
    if (f.size > maxVideoMb * 1024 * 1024) return toast.error(`영상은 ${maxVideoMb}MB까지 올릴 수 있어요.`);
    setVideo(f);
    const url = URL.createObjectURL(f);
    setVideoDuration(await readDuration(url, true));
    URL.revokeObjectURL(url);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 60));
    return undefined;
  };
  const pickCover = (f) => {
    if (!f) return undefined;
    if (f.size > maxImageMb * 1024 * 1024) return toast.error(`사진은 ${maxImageMb}MB까지 올릴 수 있어요.`);
    setCover(f);
    setCoverUrl(URL.createObjectURL(f));
    return undefined;
  };
  const toggleSticker = (code) => setStickers((list) => (list.includes(code) ? list.filter((c) => c !== code)
    : list.length >= MAX_STICKERS ? list : [...list, code]));

  const pick = async (f) => {
    if (!f) return;
    if (f.size > maxFileMb * 1024 * 1024) return toast.error(`${maxFileMb}MB 이하 파일만 올릴 수 있어요.`);
    const url = URL.createObjectURL(f);
    setFile(f);
    setFileUrl(url);
    setDuration(await readDuration(url));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 60));
    return undefined;
  };

  const group = groups.find((g) => g.id === groupId);
  const category = group?.children?.find((c) => c.id === categoryId);
  // 소리 길이: 소리 파일이 있으면 그것, 없으면 영상
  const soundLength = file ? duration : videoDuration;
  const lengthProblem = soundLength && policy
    ? (soundLength < policy.minSeconds ? `${Math.round(policy.minSeconds)}초보다 길어야 해요` : soundLength > policy.maxSeconds ? `${policy.maxSeconds / 60}분보다 짧아야 해요` : null)
    : null;
  const missing = !file && !video ? '소리 파일이나 영상을 골라 주세요' : lengthProblem || (!title.trim() ? '이름을 적어 주세요'
    : !categoryId ? '트리거 종류를 골라 주세요' : !agree ? '직접 녹음했는지 확인해 주세요' : null);

  // 상점에서 보일 모습 그대로
  const previewBlock = useMemo(() => ({
    id: -1, title: title.trim() || '내 블록 이름', description: note, duration: soundLength || 200, price,
    talkType, recordedPlace: place.trim() || null, owned: true, fileUrl,
    category: category ? { ...category, parentName: group?.name, color: group?.color } : group ? { ...group, parentName: group.name } : null,
    uploader: { nickname: user?.nickname || '나' },
    design: { coverUrl, stickers, pattern, hasVideo: !!video, videoUrl: null },
  }), [title, note, soundLength, price, talkType, place, category, group, user, fileUrl, coverUrl, stickers, pattern, video]);

  const submit = async () => {
    if (missing) return;
    const form = new FormData();
    if (file) form.append('file', file);
    if (video) form.append('video', video);
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
      toast.success('올렸어요! 검수가 끝나면 블록 상점에 올라가요.');
      setFile(null); setFileUrl(null); setDuration(null); setTitle(''); setPlace(''); setNote(''); setAgree(false);
      setVideo(null); setVideoDuration(null); setCover(null); setCoverUrl(null); setStickers([]);
      loadMine();
    } catch (e) {
      toast.error(errorMessage(e, '올리지 못했어요.'));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="page pt-10">
      <p className="eyebrow">크리에이터</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">ASMR 블록 판매</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        내 트리거 녹음을 블록으로 올려 팔아 보세요. 휴대폰 녹음 파일도 괜찮아요. 음량은 자동으로 맞추고, 확인을 거쳐 블록 상점에 올라가요.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Info icon={IoCloudUpload} title="1. 올리기" body="3~4분 길이의 소리 파일 하나 = 블록 하나" />
        <Info icon={IoShieldCheckmark} title="2. 검수" body="남의 소리·음악이 섞였는지 확인해요" />
        <Info icon={IoCash} title="3. 판매" body={`가격은 내가 (무료 ~ ${maxPrice}코인). 정산은 출시 후 열려요`} />
      </div>

      {!isAuthenticated ? (
        <div className="card mt-10 flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-lg font-bold">로그인하면 내 트리거를 블록으로 올릴 수 있어요</p>
          <BetaLoginButton className="w-full max-w-sm" />
          <div className="flex gap-2"><Link to="/login" className="btn-pink">로그인</Link><Link to="/signup" className="btn-line">회원가입</Link></div>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="card space-y-7 p-6 sm:p-8">
            {/* 파일 */}
            <div>
              <p className="label">소리 파일 <span className="ml-1 text-xs font-normal text-faint">· 영상만 올려도 돼요 (영상의 소리를 써요)</span></p>
              <button type="button" onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
                className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver ? 'border-pink bg-pink-soft' : 'border-line-strong hover:border-faint'}`} data-testid="sell-drop">
                {file ? (
                  <>
                    <IoMusicalNotes size={28} className="text-pink-text" />
                    <span className="font-bold">{file.name}</span>
                    <span className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(1)}MB{duration ? ` · ${formatDuration(duration)}` : ''} · 눌러서 바꾸기</span>
                    {lengthProblem && <span className="text-xs font-bold text-danger">{lengthProblem}</span>}
                  </>
                ) : (
                  <>
                    <IoCloudUpload size={30} className="text-faint" />
                    <span className="font-bold">파일을 여기로 끌어오거나 눌러서 고르기</span>
                    <span className="text-xs text-faint">
                      {policy ? `${policy.extensions.join(', ')} · ${Math.round(policy.minSeconds)}초~${policy.maxSeconds / 60}분 · ${maxFileMb}MB까지` : 'mp3, m4a, wav …'}
                    </span>
                  </>
                )}
              </button>
              <input ref={inputRef} type="file" className="hidden" data-testid="sell-file"
                accept={policy ? policy.extensions.map((x) => `.${x}`).join(',') : 'audio/*'} onChange={(e) => pick(e.target.files?.[0])} />

              {/* 영상 (선택) */}
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-card-active p-3.5">
                <IoVideocam size={20} className="text-pink-text" />
                <div className="min-w-0 flex-1 basis-52 text-sm">
                  {video ? (
                    <p className="truncate"><b>{video.name}</b> <span className="text-xs text-muted">{(video.size / 1024 / 1024).toFixed(0)}MB{videoDuration ? ` · ${formatDuration(videoDuration)}` : ''}</span></p>
                  ) : (
                    <p><b>영상도 같이 올리기</b> <span className="text-xs text-faint">(선택)</span></p>
                  )}
                  <p className="text-xs text-muted">"진짜 그 장면이구나" 하고 볼 수 있게. 듣는 사람이 "영상도 같이 보기"를 켜면 보여요 · 가볍게 480p로 저장</p>
                </div>
                {video ? (
                  <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => { setVideo(null); setVideoDuration(null); }}>빼기</button>
                ) : (
                  <button type="button" className="btn-line btn-sm ml-auto" onClick={() => videoInputRef.current?.click()} data-testid="sell-video-pick">영상 고르기</button>
                )}
                <input ref={videoInputRef} type="file" className="hidden" data-testid="sell-video"
                  accept={policy ? policy.videoExtensions.map((x) => `.${x}`).join(',') : 'video/*'} onChange={(e) => pickVideo(e.target.files?.[0])} />
              </div>
            </div>

            {/* 블록 꾸미기 (C안) */}
            <div>
              <p className="label">블록 꾸미기 <span className="ml-1 text-xs font-normal text-faint">· 사진이 있으면 사진, 없으면 스티커가 블록 겉면에 보여요</span></p>
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card-active p-3.5">
                {coverUrl ? <img src={coverUrl} alt="고른 사진" className="h-12 w-20 rounded-md object-cover" /> : <IoImage size={22} className="text-pink-text" />}
                <p className="min-w-0 flex-1 basis-44 text-sm"><b>겉면 사진</b> <span className="text-xs text-faint">(선택) 녹음한 장소나 장면 사진 · {maxImageMb}MB까지</span></p>
                {cover ? (
                  <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => { setCover(null); setCoverUrl(null); }}>빼기</button>
                ) : (
                  <button type="button" className="btn-line btn-sm ml-auto" onClick={() => coverInputRef.current?.click()} data-testid="sell-cover-pick">사진 고르기</button>
                )}
                <input ref={coverInputRef} type="file" className="hidden" data-testid="sell-cover"
                  accept={policy ? policy.imageExtensions.map((x) => `.${x}`).join(',') : 'image/*'} onChange={(e) => pickCover(e.target.files?.[0])} />
              </div>
              <p className="mb-2 mt-4 text-sm font-bold">스티커 <span className="text-xs font-normal text-faint">· 최대 {MAX_STICKERS}개{cover ? ' (사진을 빼면 보여요)' : ''}</span></p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {STICKER_CODES.map((code) => (
                  <button key={code} type="button" onClick={() => toggleSticker(code)} data-testid={`sticker-${code}`}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-1 pb-1.5 pt-2 text-[11px] transition-colors ${
                      stickers.includes(code) ? 'border-pink bg-pink-soft text-pink-text' : 'border-line bg-card text-muted hover:text-ink'}`}>
                    <span className="flex h-7 [&>svg]:h-full [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: STICKERS[code].svg }} />
                    {STICKERS[code].label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted">무늬</span>
                {PATTERNS.map((p) => (
                  <button key={p.key} type="button" className={`chip px-3 py-1 text-xs ${pattern === p.key ? 'chip-on' : ''}`} onClick={() => setPattern(p.key)}>{p.label}</button>
                ))}
              </div>
            </div>

            <Field label="이름" hint="상점에 보이는 이름">
              <input className="input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="예: 원목 책상 손톱 탭핑" data-testid="sell-title" />
            </Field>

            <Field label="트리거 종류" hint="블록 색은 트리거 묶음, 아이콘은 소분류로 정해져요">
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button key={g.id} type="button" className={`chip ${groupId === g.id ? 'chip-on' : ''}`}
                    onClick={() => { setGroupId(g.id); setCategoryId(null); }} data-testid={`sell-group-${g.code}`}>
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />{g.name}
                  </button>
                ))}
              </div>
              {group && (
                <div className="mt-3 flex flex-wrap gap-2 border-l-2 pl-3" style={{ borderColor: colorOf(group) }}>
                  {group.children.map((c) => (
                    <button key={c.id} type="button" className={`chip px-3 py-1 text-xs ${categoryId === c.id ? 'chip-on' : ''}`}
                      onClick={() => setCategoryId(c.id)} data-testid={`sell-sub-${c.code}`}>{c.name}</button>
                  ))}
                </div>
              )}
            </Field>

            <Field label="말소리">
              <div className="flex flex-wrap gap-2">
                {Object.entries(TALK_LABEL).map(([k, v]) => (
                  <button key={k} type="button" className={`chip ${talkType === k ? 'chip-on' : ''}`} onClick={() => setTalkType(k)}>{v}</button>
                ))}
              </div>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="녹음한 곳" hint="선택">
                <input className="input" value={place} maxLength={60} onChange={(e) => setPlace(e.target.value)} placeholder="예: 도쿄 신주쿠역 앞" />
              </Field>
              <Field label="한 줄 소개" hint="선택">
                <input className="input" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="예: 손톱 끝으로 천천히" />
              </Field>
            </div>

            <Field label="가격" hint={`최대 ${maxPrice}코인 · 코인 판매는 출시 후 열려요`}>
              <div className="flex flex-wrap gap-2">
                {PRICE_STEPS.filter((p) => p <= maxPrice).map((p) => (
                  <button key={p} type="button" className={`chip ${price === p ? 'chip-on' : ''}`} onClick={() => setPrice(p)}>
                    {p === 0 ? '무료' : `${p}코인`}
                  </button>
                ))}
              </div>
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-card-active p-4 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#F7609A]" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-testid="sell-agree" />
              <span className="leading-relaxed text-muted">
                <b className="text-ink">직접 녹음했고, 남의 소리나 음악이 섞이지 않았어요.</b> 남의 저작물이면 블록이 내려가고 판매가 멈출 수 있어요.
              </span>
            </label>

            <button type="button" className="btn-pink w-full py-3.5 text-base" onClick={submit} disabled={!!missing || progress !== null} data-testid="sell-submit">
              <IoCloudUpload size={18} />
              {progress !== null ? `올리는 중… ${progress}%` : missing || '블록 올리기'}
            </button>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <p className="text-sm font-bold text-muted">블록 상점에서는 이렇게 보여요</p>
            <BlockProductCard block={previewBlock} preview />
            <p className="text-xs leading-relaxed text-faint">블록 길이 = 소리 길이. 블록 색은 트리거 묶음, 아이콘은 소분류를 따라가요. 미리보기에서 ▶로 고른 파일을 들어 볼 수 있어요.</p>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <section id="mine" className="mt-16 scroll-mt-24">
          <h2 className="text-2xl font-extrabold">내가 올린 블록</h2>
          <div className="mt-5">
            {mine === null ? <BlockLoader small /> : mine.length === 0 ? (
              <p className="card p-6 text-sm text-muted">아직 올린 블록이 없어요. 위에서 첫 블록을 올려 보세요.</p>
            ) : (
              <div className="card divide-y divide-line">
                {mine.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 p-4" style={{ borderLeft: `4px solid ${colorOf(u.category)}` }} data-testid={`my-upload-${u.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{u.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {u.category?.name || '기타'} · {TALK_LABEL[u.talkType || 'NONE']} · {formatDuration(u.duration)} · {u.price > 0 ? `${u.price}코인` : '무료'}
                        {u.recordedPlace ? ` · ${u.recordedPlace}` : ''}
                      </p>
                    </div>
                    {u.design?.hasVideo && <span className="flex items-center gap-1 text-xs text-muted"><IoVideocam /> 영상</span>}
                    <span className="hidden text-xs text-muted sm:block">담은 사람 {u.collectedCount}명</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[u.status]?.cls}`}>{STATUS[u.status]?.label}</span>
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
