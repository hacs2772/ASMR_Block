import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Brick from '../components/brand/Brick';
import AssembleButton from '../components/home/AssembleButton';
import { TRIGGER_COLOR } from '../lib/blocks';

const WORDS = [
  { word: '팅글', en: 'TINGLE', body: '소리를 들을 때 머리나 목덜미가 간질간질, 찌릿해지는 느낌' },
  { word: '트리거', en: 'TRIGGER', body: '팅글을 부르는 소리. 탭핑, 바스락, 귓속말 같은 것' },
  { word: '레이어드', en: 'LAYERED', body: '두 소리를 겹쳐 듣기. 둘째 줄에 깔면 돼요' },
  { word: '노토킹', en: 'NO TALKING', body: '말소리 없이 소리만 들어 있는 ASMR' },
  { word: '탭핑', en: 'TAPPING', body: '손톱이나 손끝으로 물건을 톡톡 두드리는 소리' },
  { word: '입소리', en: 'MOUTH SOUNDS', body: '입 가까이에서 나는 작은 소리. 호불호가 갈려요' },
];

const STEPS = [
  { title: '블록 담기', body: '블록 상점에서 좋아하는 트리거(탭핑·바스락·귓속말…) 블록을 담아요. 무료 블록은 바로, 유료는 30초 맛보기.' },
  { title: '딸깍 쌓기', body: '조합 만들기에서 담은 블록을 눌러 이어 붙여요. 끌어서 순서를 바꾸고, 레이어드로 두 소리를 겹쳐요.' },
  { title: '얼마나 들을까요?', body: '30분~8시간 중 고르고 저장하면, 끊김 없는 완성본이 만들어져 그 시간만큼 반복돼요.' },
  { title: '바로 듣기', body: '만든 조합은 앱 홈 맨 위에 있어요. 마음에 드는 남의 조합은 추천 조합에서 한 번에 담아요.' },
];

/** 팅글 가이드: 처음 온 사람을 위한 설명 · 쓰는 법 · 단어장 (앱의 ? 도움말과 같은 내용) */
function GuidePage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <div className="page max-w-3xl pt-12">
      <p className="eyebrow">팅글 가이드</p>
      <h1 className="text-4xl font-black leading-tight tracking-tight">팅글이 뭐예요?</h1>
      <div className="mt-6 flex pr-2">
        <Brick color={TRIGGER_COLOR.tap} width={110} height={52} bars="tap" minutes={3} />
        <Brick color={TRIGGER_COLOR.crinkle} width={110} height={52} bars="crinkle" minutes={3} />
        <Brick color={TRIGGER_COLOR.whisper} width={110} height={52} bars="whisper" minutes={3} />
      </div>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        ASMR을 들을 때 머리나 목덜미가 간질간질, 찌릿해지는 느낌이에요. 팅글이 오는 소리는 사람마다 달라서,
        좋아하는 소리만 골라 직접 쌓는 게 제일 잘 맞아요. ASMR Block은 소리 하나를 블록 하나로 만들어,
        딸깍 이어 붙이기만 하면 나한테 맞는 ASMR이 되게 했어요.
      </p>

      <h2 className="mt-14 text-2xl font-extrabold">이렇게 써요</h2>
      <ol className="mt-5 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card flex gap-4 p-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink font-extrabold text-white">{i + 1}</span>
            <div>
              <p className="font-bold">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 id="glossary" className="mt-14 scroll-mt-24 text-2xl font-extrabold">ASMR 단어장</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {WORDS.map((w) => (
          <div key={w.word} className="card p-5">
            <p className="font-extrabold">{w.word} <span className="ml-1 text-[11px] font-bold tracking-wider text-faint">{w.en}</span></p>
            <p className="mt-1.5 text-sm text-muted">{w.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex justify-center"><AssembleButton label="나만의 팅글 쌓기" /></div>
    </div>
  );
}

export default GuidePage;
