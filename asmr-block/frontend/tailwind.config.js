/** @type {import('tailwindcss').Config} */
// 색은 앱(mobile/src/theme.ts)과 같은 "어두운 밤 바탕 + 분홍 하나". 화면에서 색 숫자를 직접 쓰지 않고 이 이름으로 씀
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        night: '#0A0A0F',        // 바탕
        card: '#13131A',
        'card-active': '#1B1B24',
        line: '#22222C',
        'line-strong': '#31313D',
        plate: '#0E0E14',         // 레고 바닥판
        pink: { DEFAULT: '#F7609A', soft: 'rgba(247,96,154,0.14)', text: '#FF85AF' },
        ink: '#ECECF1',
        muted: '#A1A1AE',
        faint: '#686875',
        danger: '#FF6F6F',
        success: '#3FCF8E',
        warn: '#E9BC55',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif'],
      },
      maxWidth: { page: '1160px' },
    },
  },
  plugins: [],
};
