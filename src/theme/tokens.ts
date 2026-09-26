/**
 * デザイントークン。色・余白・角丸・文字サイズはここからだけ取る（生の色コードを画面に書かない）。
 * 下敷きは docs/design/wireframe-v3.html の :root。ライト固定（requirements.md 非スコープ）
 */

export const color = {
  bg: "#EEF2EF",
  surface: "#FFFFFF",
  panel: "#F7F9F7",
  ink: "#17211C",
  muted: "#65716A",
  line: "#D7DFDA",
  brand: "#2B6D50",
  brandSoft: "#E6F2EB",
  onBrand: "#FFFFFF",
  danger: "#AA3131",
  dangerSoft: "#FFF1F1",
  warn: "#7C5312",
  warnSoft: "#FFF7E8",
  info: "#285F8C",
  infoSoft: "#EDF5FB",
  star: "#BB7A13",
  backdrop: "rgba(15,24,18,0.35)",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const text = {
  caption: 12,
  body: 15,
  label: 13,
  title: 17,
  heading: 22,
} as const;

/** タップ領域（iOS HIG の 44pt） */
export const HIT_SIZE = 44;
