import React, { useEffect, useState } from 'react';
import { InstallBanner } from '../components/common/Install';
import { Link } from 'react-router-dom';
import { IoArrowForward, IoCash, IoCheckmarkCircle, IoCube, IoMoon, IoPhonePortrait } from 'react-icons/io5';
import { catalogApi, playlistApi } from '../api/api';
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

/** 웹 첫 화면: 나만의 팅글 → 조합 만들기(가장 중요한 버튼) → 요즘 뜨는 블록 · 추천 조합 → 만드는 법 → 블록 판매 → 앱 받기 */
function HomePage() {
  useStopPreviewOnLeave();
  // 처음 온 사람에게 한 번: 담기 → 끌어서 쌓기 → 시간 정하기 → 듣기
  useFirstRunGuide('welcome');
  const [groups, setGroups] = useState([]);
  const [blocks, setBlocks] = useState(null);
  const [combos, setCombos] = useState(null);

  useEffect(() => {
    catalogApi.categories().then(setGroups).catch(() => setGroups([]));
    catalogApi.trending(8).then((b) => setBlocks(b.slice(0, 4))).catch(() => setBlocks([]));
    playlistApi.trending(6).then((c) => setCombos(c.slice(0, 4))).catch(() => setCombos([]));
  }, []);

  return (
    <div>
      {/* ---------- 첫 화면 ---------- */}
      <InstallBanner />
      <section className="page grid items-center gap-12 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <p className="eyebrow">ASMR · 나만의 팅글 만들기</p>
          <h1 className="text-[40px] font-black leading-[1.15] tracking-tight sm:text-[54px]">
            나만의 <span className="text-pink-text">팅글<span className="align-top text-[0.45em] text-pink">✦</span></span>을<br />
            블록으로 쌓아 보세요
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
            소리 하나가 블록 하나. 탭핑 3분, 바스락 3분, 귓속말 3분처럼 좋아하는 트리거 블록만 골라
            딸깍 이어 붙이면 나한테 딱 맞는 ASMR이 돼요.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <AssembleButton />
            <Link to="/shop" className="btn-line px-5 py-3.5 text-[15px]">블록 둘러보기</Link>
          </div>
          <div className="mt-8">
            <p className="mb-2.5 text-xs text-faint">휴대폰 앱은 곧 출시돼요</p>
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
      <Section eyebrow="최근 7일" title="요즘 팅글 많이 오는 블록" more={{ to: '/shop', label: '블록 상점에서 더 보기' }}>
        {blocks === null ? <BlockLoader small /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {blocks.map((b, i) => <BlockProductCard key={b.id} block={b} rank={i + 1} />)}
          </div>
        )}
      </Section>

      {/* ---------- 추천 조합 ---------- */}
      <Section eyebrow="★ 추천 조합" title="다른 사람이 쌓은 조합, 한 번에 담기" more={{ to: '/combos', label: '추천 조합 더 보기' }}>
        {combos === null ? <BlockLoader small /> : combos.length === 0 ? (
          <p className="text-sm text-muted">아직 추천할 조합이 없어요. 첫 조합을 만들어 공개해 보세요.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {combos.map((c, i) => <ComboCard key={c.id} combo={c} rank={i + 1} />)}
          </div>
        )}
      </Section>

      {/* ---------- 만드는 법 ---------- */}
      <Section eyebrow="이렇게 만들어요" title="담고, 쌓고, 시간만 정하면 끝">
        <div className="grid gap-4 md:grid-cols-3">
          <Step no={1} icon={IoCube} title="블록 담기" body="블록 상점에서 좋아하는 트리거 블록을 담아요. 무료 블록은 바로, 유료는 30초 맛보기.">
            <Brick color={TRIGGER_COLOR.tap} width={70} height={36} bars="tap" />
          </Step>
          <Step no={2} icon={IoCheckmarkCircle} title="딸깍 쌓기" body="담은 블록을 왼쪽부터 이어 붙여요. 레이어드로 빗소리를 아래에 겹칠 수도 있어요.">
            <div className="flex pr-1.5">
              <Brick color={TRIGGER_COLOR.tap} width={46} height={36} bars="tap" />
              <Brick color={TRIGGER_COLOR.crinkle} width={46} height={36} bars="crinkle" />
              <Brick color={TRIGGER_COLOR.whisper} width={46} height={36} bars="whisper" />
            </div>
          </Step>
          <Step no={3} icon={IoMoon} title="얼마나 들을지 정하기" body="30분~8시간 중 고르면 끊김 없는 완성본을 그 시간만큼 반복해서 들려줘요.">
            <span className="rounded-full bg-pink-soft px-3 py-1.5 text-sm font-bold text-pink-text">🌙 8시간</span>
          </Step>
        </div>
        <div className="mt-8 flex justify-center"><AssembleButton label="지금 조합 만들기" /></div>
      </Section>

      {/* ---------- 블록 판매 ---------- */}
      <section className="page mt-20">
        <div className="card grid gap-8 overflow-hidden p-8 md:grid-cols-[1.2fr_1fr] md:p-12">
          <div>
            <p className="eyebrow">크리에이터</p>
            <h2 className="h-section">내 트리거를 블록으로 팔아 보세요</h2>
            <ul className="mt-5 space-y-2.5 text-[15px] text-muted">
              <li className="flex gap-2"><IoPhonePortrait className="mt-0.5 shrink-0 text-pink-text" />휴대폰 녹음 파일이든 마이크로 녹음한 파일이든, 3~4분이면 블록 하나</li>
              <li className="flex gap-2"><IoCash className="mt-0.5 shrink-0 text-pink-text" />가격은 내가 정해요 (무료도 OK). 담기고 쓰일수록 내 블록이 알려져요</li>
              <li className="flex gap-2"><IoCheckmarkCircle className="mt-0.5 shrink-0 text-pink-text" />음량은 자동으로 맞추고, 확인을 거쳐 블록 상점에 올라가요</li>
            </ul>
            <Link to="/sell" className="btn-pink mt-7 px-5 py-3" data-testid="home-sell">블록 판매하러 가기 <IoArrowForward /></Link>
          </div>
          <div className="studs flex items-center justify-center rounded-xl bg-plate p-6">
            <div className="flex flex-col items-start gap-3">
              <span className="rounded-md bg-warn px-2 py-0.5 text-xs font-extrabold text-night">20코인</span>
              <Brick color={TRIGGER_COLOR.scratch} width={150} height={52} bars="crinkle" minutes={4} />
              <p className="text-sm font-bold">마이크 브러싱 · <span className="text-faint">@나의 닉네임</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 앱 받기 ---------- */}
      <section className="page mt-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-gradient-to-br from-[#1d1220] to-card p-8 md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-extrabold">오늘 밤 팅글, 휴대폰으로</h2>
            <p className="mt-2 text-muted">화면을 꺼도 계속 들리고, 잠들면 스르르 꺼져요. 앱은 곧 출시돼요.</p>
          </div>
          <AppBadges />
        </div>
      </section>
    </div>
  );
}

/** 첫 화면 오른쪽: 레고 바닥판 위에 블록이 이어지고, 소리 막대가 움직이고, 재생선이 지나감 */
function HeroBoard() {
  const main = [
    { c: TRIGGER_COLOR.tap, w: 120, bars: 'tap', m: 4 },
    { c: TRIGGER_COLOR.crinkle, w: 90, bars: 'crinkle', m: 3 },
    { c: TRIGGER_COLOR.whisper, w: 90, bars: 'whisper', m: 3 },
    { c: TRIGGER_COLOR.scratch, w: 90, bars: 'crinkle', m: 3 },
  ];
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6" aria-hidden="true">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full border border-line-strong bg-pink-soft px-3 py-1 text-xs font-bold text-pink-text">▶ 전체 듣기</span>
        <span className="text-xs text-faint">1칸 = 1분</span>
        <span className="ml-auto rounded-full bg-card-active px-3 py-1 text-xs font-bold text-muted">🌙 8시간 반복</span>
      </div>
      <div className="relative rounded-xl bg-plate px-4 pb-5 pt-3">
        <div className="mb-2 flex gap-[86px] text-[10px] text-faint"><span>0:00</span><span>3:00</span><span>6:00</span><span>9:00</span></div>
        <div className="flex overflow-hidden pr-2">
          {main.map((b, i) => <Brick key={i} color={b.c} width={b.w} height={56} bars={b.bars} minutes={b.m} />)}
        </div>
        <p className="mb-1.5 mt-4 text-[11px] text-muted">② 레이어드 · 빗소리를 아래에 겹쳐요</p>
        <div className="relative h-9 rounded-lg border border-dashed border-line">
          <div className="absolute left-[24%] top-1"><Brick color={TRIGGER_COLOR.rain} width={150} height={26} bars="whisper" minutes={5} /></div>
        </div>
        <span className="playhead-run absolute bottom-2 top-8 w-[2px] rounded bg-pink" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>탭핑 → 바스락 → 귓속말 → 브러싱</span>
        <span className="font-bold text-ink">한 바퀴 13분</span>
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
