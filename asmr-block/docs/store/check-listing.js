/**
 * 스토어 글 글자 수 확인: docs/store/listing.md의 칸마다 한도 안인지 (node docs/store/check-listing.js)
 * 구글 플레이: 이름 30 · 간단한 설명 80 · 자세한 설명 4000 / 앱스토어: 이름 30 · 부제목 30 · 홍보 문구 170 · 키워드 100 · 설명 4000
 */
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, 'listing.md'), 'utf8');
const [ko, en] = md.split('## English');
const len = (s) => [...s].length;
const inline = (part, label) => {
  const m = part.match(new RegExp(`${label}[^\\n]*: \`([^\`]+)\``));
  return m ? m[1] : null;
};
const block = (part, heading) => {
  const i = part.indexOf(heading);
  if (i < 0) return null;
  const m = part.slice(i).match(/```\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
};

const rules = [
  ['구글 플레이 이름', (p) => inline(p, '- (?:구글 플레이|Google Play)'), 30],
  ['앱스토어 이름', (p) => inline(p, '- (?:앱스토어 이름|App Store name)'), 30],
  ['앱스토어 부제목', (p) => inline(p, '- (?:앱스토어 부제목|App Store subtitle)'), 30],
  ['간단한 설명', (p) => block(p, p === ko ? '### 간단한 설명' : '### Short description'), 80],
  ['홍보 문구', (p) => block(p, p === ko ? '### 홍보 문구' : '### Promotional text'), 170],
  ['키워드', (p) => block(p, p === ko ? '### 키워드' : '### Keywords'), 100],
  ['자세한 설명', (p) => block(p, p === ko ? '### 자세한 설명' : '### Full description'), 4000],
  ['새로운 기능', (p) => block(p, p === ko ? '### 새로운 기능' : "### What's new"), 500],
];

let bad = 0;
for (const [name, part] of [['한국어', ko], ['English', en]]) {
  for (const [label, get, max] of rules) {
    const text = get(part);
    if (text == null) { console.log(`✗ ${name} ${label}: 못 찾음`); bad++; continue; }
    const n = len(text);
    const ok = n <= max;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${name} ${label}: ${n}/${max}`);
  }
}
process.exit(bad ? 1 : 0);
