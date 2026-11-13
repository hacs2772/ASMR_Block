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
