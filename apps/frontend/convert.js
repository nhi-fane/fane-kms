const hslToRgb = (h, s, l) => {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
};

const colors = {
  bgDark: [222, 47, 7],
  bgCard: [217, 33, 13],
  textMain: [210, 40, 98],
  textMuted: [215, 20, 65],
  accentPurple: [260, 89, 65],
  accentBlue: [200, 90, 50],
  accentOrange: [24, 95, 55],
  accentRed: [348, 83, 47],
  accentGreen: [142, 71, 45]
};

for (let [k, v] of Object.entries(colors)) {
  const [r, g, b] = hslToRgb(...v);
  console.log(`${k}: '${r} ${g} ${b}',`);
}