/**
 * Brand tokens — mystical near-black, warm gold, coral CTA gradient and one
 * deep-violet "Cards Ka Message" panel (matches thedivinetarotonline.com).
 */
export const Colors = {
  bg: '#0B0710',
  bgDeep: '#070409',
  bgElevated: '#140E1C',
  card: '#17111F',
  cardBorder: 'rgba(233, 196, 106, 0.22)',
  glass: 'rgba(20, 14, 28, 0.55)',
  text: '#F1ECF5',
  textMuted: '#ABA3B8',
  textDim: '#6E6680',
  gold: '#E9C46A',
  goldBright: '#F6D98B',
  goldSoft: '#FBE7B5',
  coral: '#F0866A',
  violet: '#5B2A9E',
  violetDeep: '#2A1250',
  success: '#5BD38A',
  danger: '#F0717A',
} as const;

export const Gradients = {
  /** Warm-gold → coral call-to-action */
  cta: ['#F6D98B', '#E9C46A', '#F0866A'] as const,
  /** Gold → violet icon tiles */
  tile: ['#E9C46A', '#B67BD6', '#5B2A9E'] as const,
  goldRing: ['#FBE7B5', '#E9C46A', '#C98A3E'] as const,
  night: ['#0B0710', '#120A1E', '#070409'] as const,
  violetPanel: ['#3B1A6E', '#2A1250', '#170A2E'] as const,
  cardBack: ['#2A1250', '#4A2286', '#2A1250'] as const,
  heroFade: ['rgba(11,7,16,0)', 'rgba(11,7,16,0.55)', '#0B0710'] as const,
};

/** Font family names registered in src/app/_layout.tsx */
export const Fonts = {
  display: 'Cinzel_700Bold',
  displayRegular: 'Cinzel_400Regular',
  serif: 'PlayfairDisplay_600SemiBold',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const Radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Height reserved at the bottom of tab screens for the floating glass tab bar */
export const TAB_BAR_SPACE = 116; // bar + the active bubble that rises above it
