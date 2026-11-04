// Colour helpers for theme values. Pure (no React Native imports).

/**
 * Splits a theme colour into an opaque colour and its alpha, so a component
 * can tint with the colour and apply the alpha separately:
 * `rgba(r,g,b,a)` → `rgb(r,g,b)` and a; `#rrggbbaa` → `#rrggbb` and aa/255.
 * Any other colour is returned as is, with alpha 1.
 */
export function splitAlpha(color: string): { rgb: string; alpha: number } {
  const c = color.trim();
  const rgba = /^rgba\(([^)]*)\)$/i.exec(c);
  if (rgba) {
    const [r, g, b, a] = rgba[1].split(',').map((v) => Number(v.trim()));
    return { rgb: `rgb(${r},${g},${b})`, alpha: Number.isFinite(a) ? a : 1 };
  }
  const hex8 = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(c);
  if (hex8) return { rgb: `#${hex8[1]}`, alpha: parseInt(hex8[2], 16) / 255 };
  return { rgb: c, alpha: 1 };
}
