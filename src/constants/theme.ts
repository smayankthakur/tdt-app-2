/**
 * Brand tokens taken from thedivinetarotonline.com
 * (background #0B0B0F, gold/coral gradients, purple meta theme colour,
 *  Cinzel + Playfair Display + Inter fonts).
 */
export const Colors = {
  bg: '#0B0B0F',
  bgElevated: '#15131D',
  card: '#1B1826',
  cardBorder: 'rgba(244, 197, 66, 0.22)',
  text: '#EAEAF0',
  textMuted: '#A9A6B8',
  textDim: '#6F6B80',
  gold: '#F4C542',
  goldBright: '#FFD700',
  goldSoft: '#FFE4A8',
  coral: '#FF4D4D',
  purple: '#6D28D9',
  purpleDeep: '#2A1454',
  success: '#4ADE80',
  danger: '#F87171',
} as const;

/** Gradients used on the website's buttons and highlights */
export const Gradients = {
  primary: ['#FF4D4D', '#F4C542', '#FFE4A8'] as const,
  gold: ['#FACC15', '#F97316'] as const,
  night: ['#0B0B0F', '#1A1030', '#0B0B0F'] as const,
  cardBack: ['#2A1454', '#4C1D95', '#2A1454'] as const,
  purpleGlow: ['rgba(109,40,217,0.45)', 'rgba(11,11,15,0)'] as const,
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

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;
