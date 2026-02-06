/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // 카테고리 색상
        'category-nature': '#22C55E',
        'category-object': '#3B82F6',
        'category-body': '#A855F7',
        'category-food': '#F97316',
        'category-environment': '#78716C',
        // 브랜드 색상
        'primary': '#6366F1',
        'primary-dark': '#4F46E5',
        'secondary': '#EC4899',
      },
      fontFamily: {
        'sans': ['Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
