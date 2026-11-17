/** @type {import('tailwindcss').Config} */
// 색은 앱(mobile/src/theme.ts)과 같은 값 (B안 장난감 블록). 화면에서 색 숫자를 직접 쓰지 않고 이 이름으로 씀
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        // B안 "진짜 장난감 블록": 푸른 밤 바탕 + 레고 판(카드) + 트리거 색이 주인공, 분홍은 재생·담기 같은 주요 버튼
        night: '#0C0F15',        // 바탕
        card: '#161B25',          // 레고 판 (카드)
        'card-active': '#1C2230',
        line: '#262D3C',
        'line-strong': '#343C4F',
        plate: '#0E1218',         // 한 단계 깊은 판 (편집 보드·입력 칸)
        slate: '#3A4357',         // 회색 블록 버튼
        paper: '#F3EADB',         // 종이 가격표
        pink: { DEFAULT: '#F7609A', soft: 'rgba(247,96,154,0.14)', text: '#FF85AF' },
        ink: '#F2F3F7',
        muted: '#A4AABA',
        faint: '#6B7286',
        danger: '#FF6F6F',
        success: '#3FCF8E',
        warn: '#E9BC55',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif'],
        // 제목·블록 버튼 글씨 (두툼한 도현체, 굵기는 하나뿐이라 가짜 굵게를 막음, global.css)
        display: ['"Do Hyeon"', 'Pretendard Variable', 'Pretendard', 'Apple SD Gothic Neo', 'sans-serif'],
      },
      maxWidth: { page: '1160px' },
    },
  },
  plugins: [],
};
