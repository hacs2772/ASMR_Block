/** "#RRGGBB" 색을 흰색(amount>0) 또는 검은색(amount<0) 쪽으로 섞음 */
export function shade(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n.padEnd(6, '0').slice(0, 6);
  const target = amount > 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amount));
  const channel = (i: number) => {
    const v = parseInt(full.slice(i, i + 2), 16);
    return Math.round(v + (target - v) * t).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/** 밝은 색이면 true (그 위 글자는 어둡게): 바스락 초록·긁기 노랑처럼 흰 글자가 잘 안 보이는 색 (웹 lib/blocks.js isLightColor와 같음) */
export function isLightColor(hex: string): boolean {
  const n = hex.replace('#', '').padEnd(6, '0');
  const lin = (i: number) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4) > 0.33;
}
