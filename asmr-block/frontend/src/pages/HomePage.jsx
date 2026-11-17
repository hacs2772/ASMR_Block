import React, { useEffect, useState } from 'react';
import { InstallBanner } from '../components/common/Install';
import { Link } from 'react-router-dom';
import { IoArrowForward, IoCash, IoCheckmarkCircle, IoCube, IoMoon, IoPhonePortrait } from 'react-icons/io5';
import { Trans, useTranslation } from 'react-i18next';
import { catalogApi, playlistApi, recommendApi } from '../api/api';
import Brick from '../components/brand/Brick';
import BlockLoader from '../components/brand/BlockLoader';
import BlockProductCard from '../components/block/BlockProductCard';
import { AppBadges } from '../components/common/ComingSoon';
import { useFirstRunGuide } from '../components/guide/GuideModal';
import AssembleButton from '../components/home/AssembleButton';
import QuickStart from '../components/home/QuickStart';
import ComboCard from '../components/playlist/ComboCard';
import { useStopPreviewOnLeave } from '../hooks/usePreview';
import { TRIGGER_COLOR } from '../lib/blocks';
import { tasteNames } from '../lib/recommend';
import useAuthStore from '../store/authStore';

/** 웹 첫 화면: 나만의 팅글 → 조합 만들기(가장 중요한 버튼) → 요즘 뜨는 블록 · 추천 조합 → 만드는 법 → 블록 판매 → 앱 받기 */
function HomePage() {
  const { t } = useTranslation();
  useStopPreviewOnLeave();
  // 처음 온 사람에게 한 번: 담기 → 끌어서 쌓기 → 시간 정하기 → 듣기
  useFirstRunGuide('welcome');
  const [groups, setGroups] = useState([]);
  const [blocks, setBlocks] = useState(null);
  const [combos, setCombos] = useState(null);
  const [rec, setRec] = useState(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    catalogApi.categories().then(setGroups).catch(() => setGroups([]));
    playlistApi.trending(6).then((c) => setCombos(c.slice(0, 4))).catch(() => setCombos([]));
  }, []);
  // 블록 칸: 로그인했고 취향을 알면 "취향 저격 블록", 아니면 요즘 뜨는 블록
  useEffect(() => {
    setBlocks(null);
    setRec(null);
    const trending = () => catalogApi.trending(8).then((b) => setBlocks(b.slice(0, 4)));
    const load = isAuthenticated
      ? recommendApi.blocks(4).then((r) => {
        if (!r.personalized) return trending();
        setRec(r);
        setBlocks(r.blocks.slice(0, 4));
        return undefined;
      })
      : trending();
    load.catch(() => setBlocks([]));
  }, [isAuthenticated]);

  return (
    <div>
      {/* ---------- 첫 화면 ---------- */}
      <InstallBanner />
      <section className="page grid items-center gap-12 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1 className="text-[40px] font-black leading-[1.15] tracking-tight sm:text-[54px]">
            <Trans i18nKey="home.headline" components={{ pink: <span className="text-pink-text" />, star: <span className="align-top text-[0.45em] text-pink" /> }} />
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
            {t('home.lead')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <AssembleButton />
            <Link to="/shop" className="btn-line px-5 py-3.5 text-[15px]">{t('home.browse')}</Link>
          </div>
          <div className="mt-8">
            <p className="mb-2.5 text-xs text-faint">{t('home.appSoon')}</p>
            <AppBadges />
          </div>
        </div>
        <HeroBoard />
      </section>

      {/* ---------- 첫 조합 바로 만들기: 트리거를 고르면 바로 쌓아서 듣기 ---------- */}
      {groups.length > 0 && (
        <section className="page pb-6">
          <QuickStart groups={groups} />
        </section>
      )}

      {/* ---------- 요즘 뜨는 블록 ---------- */}
      <Section eyebrow={rec ? t('forYou.homeEyebrow', { triggers: tasteNames(rec) }) : t('home.trendEyebrow')}
        title={rec ? t('forYou.homeTitle') : t('home.trendTitle')}
        more={rec ? { to: '/shop?tab=forYou', label: t('forYou.homeMore') } : { to: '/shop', label: t('home.trendMore') }}>
        {blocks === null ? <BlockLoader small /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid={rec ? 'home-for-you' : 'home-trending'}>
            {blocks.map((b, i) => <BlockProductCard key={b.id} block={b} rank={rec ? null : i + 1} />)}
          </div>
        )}
      </Section>

      {/* ---------- 추천 조합 ---------- */}
      <Section eyebrow={t('home.combosEyebrow')} title={t('home.combosTitle')} more={{ to: '/combos', label: t('home.combosMore') }}>
        {combos === null ? <BlockLoader small /> : combos.length === 0 ? (
          <p className="text-sm text-muted">{t('home.combosEmpty')}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {combos.map((c, i) => <ComboCard key={c.id} combo={c} rank={i + 1} />)}
          </div>
        )}
      </Section>

      {/* ---------- 만드는 법 ---------- */}
      <Section eyebrow={t('home.howEyebrow')} title={t('home.howTitle')}>
        <div className="grid gap-4 md:grid-cols-3">
          <Step no={1} icon={IoCube} title={t('home.step1Title')} body={t('home.step1Body')}>
            <Brick color={TRIGGER_COLOR.tap} width={70} height={36} bars="tap" />
          </Step>
          <Step no={2} icon={IoCheckmarkCircle} title={t('home.step2Title')} body={t('home.step2Body')}>
            <div className="flex pr-1.5">
              <Brick color={TRIGGER_COLOR.tap} width={46} height={36} bars="tap" />
              <Brick color={TRIGGER_COLOR.crinkle} width={46} height={36} bars="crinkle" />
              <Brick color={TRIGGER_COLOR.whisper} width={46} height={36} bars="whisper" />
            </div>
          </Step>
          <Step no={3} icon={IoMoon} title={t('home.step3Title')} body={t('home.step3Body')}>
            <span className="rounded-full bg-pink-soft px-3 py-1.5 text-sm font-bold text-pink-text">{t('home.step3Chip')}</span>
          </Step>
        </div>
        <div className="mt-8 flex justify-center"><AssembleButton label={t('home.buildNow')} /></div>
      </Section>

      {/* ---------- 블록 판매 ---------- */}
      <section className="page mt-20">
        <div className="card grid gap-8 overflow-hidden p-8 md:grid-cols-[1.2fr_1fr] md:p-12">
          <div>
            <p className="eyebrow">{t('home.sellEyebrow')}</p>
            <h2 className="h-section">{t('home.sellTitle')}</h2>
            <ul className="mt-5 space-y-2.5 text-[15px] text-muted">
              <li className="flex gap-2"><IoPhonePortrait className="mt-0.5 shrink-0 text-pink-text" />{t('home.sell1')}</li>
              <li className="flex gap-2"><IoCash className="mt-0.5 shrink-0 text-pink-text" />{t('home.sell2')}</li>
              <li className="flex gap-2"><IoCheckmarkCircle className="mt-0.5 shrink-0 text-pink-text" />{t('home.sell3')}</li>
            </ul>
            <Link to="/sell" className="btn-pink mt-7 px-5 py-3" data-testid="home-sell">{t('home.sellGo')} <IoArrowForward /></Link>
          </div>
          <div className="studs flex items-center justify-center rounded-xl bg-plate p-6">
            <div className="flex flex-col items-start gap-3">
              <span className="rounded-md bg-warn px-2 py-0.5 text-xs font-extrabold text-night">{t('home.sellCoins')}</span>
              <Brick color={TRIGGER_COLOR.scratch} width={150} height={52} bars="crinkle" minutes={4} />
              <p className="text-sm font-bold">{t('home.sellSample')} · <span className="text-faint">{t('home.sellNick')}</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 앱 받기 ---------- */}
      <section className="page mt-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-gradient-to-br from-[#1d1220] to-card p-8 md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-extrabold">{t('home.appTitle')}</h2>
            <p className="mt-2 text-muted">{t('home.appBody')}</p>
          </div>
          <AppBadges />
        </div>
      </section>
    </div>
  );
}

/** 첫 화면 오른쪽: 레고 바닥판 위에 블록이 이어지고, 소리 막대가 움직이고, 재생선이 지나감 */
function HeroBoard() {
  const { t } = useTranslation();
  const main = [
    { c: TRIGGER_COLOR.tap, w: 120, bars: 'tap', m: 4 },
    { c: TRIGGER_COLOR.crinkle, w: 90, bars: 'crinkle', m: 3 },
    { c: TRIGGER_COLOR.whisper, w: 90, bars: 'whisper', m: 3 },
    { c: TRIGGER_COLOR.scratch, w: 90, bars: 'crinkle', m: 3 },
  ];
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6" aria-hidden="true">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full border border-line-strong bg-pink-soft px-3 py-1 text-xs font-bold text-pink-text">{t('home.heroPlay')}</span>
        <span className="text-xs text-faint">{t('home.heroScale')}</span>
        <span className="ml-auto whitespace-nowrap rounded-full bg-card-active px-3 py-1 text-xs font-bold text-muted">{t('home.heroRepeat')}</span>
      </div>
      <div className="relative rounded-xl bg-plate px-4 pb-5 pt-3">
        <div className="mb-2 flex gap-[86px] text-[10px] text-faint"><span>0:00</span><span>3:00</span><span>6:00</span><span>9:00</span></div>
        <div className="flex overflow-hidden pr-2">
          {main.map((b, i) => <Brick key={i} color={b.c} width={b.w} height={56} bars={b.bars} minutes={b.m} />)}
        </div>
        <p className="mb-1.5 mt-4 text-[11px] text-muted">{t('home.heroLayer')}</p>
        <div className="relative h-9 rounded-lg border border-dashed border-line">
          <div className="absolute left-[24%] top-1"><Brick color={TRIGGER_COLOR.rain} width={150} height={26} bars="whisper" minutes={5} /></div>
        </div>
        <span className="playhead-run absolute bottom-2 top-8 w-[2px] rounded bg-pink" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span className="min-w-0 truncate">{t('home.heroOrder')}</span>
        <span className="shrink-0 font-bold text-ink">{t('home.heroLoop')}</span>
      </div>
    </div>
  );
}

function Section({ eyebrow, title, more, children }) {
  return (
    <section className="page mt-20">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="h-section">{title}</h2>
        </div>
        {more && <Link to={more.to} className="hidden shrink-0 items-center gap-1 text-sm font-bold text-pink-text hover:underline sm:flex">{more.label} <IoArrowForward /></Link>}
      </div>
      {children}
      {more && <Link to={more.to} className="btn-line mt-5 w-full sm:hidden">{more.label}</Link>}
    </section>
  );
}

function Step({ no, icon: Icon, title, body, children }) {
  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="studs flex h-24 items-center justify-center rounded-xl bg-plate">{children}</div>
      <div>
        <p className="flex items-center gap-2 text-lg font-extrabold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-pink text-xs text-white">{no}</span>
          {title}
          <Icon className="text-faint" size={16} />
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

export default HomePage;
