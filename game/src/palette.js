// Central design tokens shared by the renderer and CSS custom properties.
// Lighting derives most in-world variation from these seven structural shades
// plus one high-contrast accent.
export const PALETTE = {
  canvas: '#dfe2d5',
  surface: '#39434d',
  hairline: '#9d9887',
  ink: '#f6f4ef',
  muted: '#b7bfc8',
  accent: '#ff771d',
  sky: '#dfe2d5',
  floor: '#a89578',
  floorDark: '#9c8a6e',
  concrete: '#8b8578',
  concreteDark: '#5d636b',
  olive: '#6d734b',
  oliveLight: '#8e925f',
  khaki: '#b1a374',
  uniformDark: '#39424a',
  uniformLight: '#8a8f70',
  tracer: '#fff6d6',
};

export function shade(name) {
  return PALETTE[name];
}
