// ─────────────────────────────────────────────────────────────
//  NotaFácil · Design System v3
//  Azul Pizarra #2D5FA8 · Fondo blanco · Escudo Pio XII
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // Header / acento principal
  primary:      '#2D5FA8',
  primaryDark:  '#254E8F',
  primaryLight: '#3D72C4',

  // Fondos
  bg:           '#F8FAFC',   // fondo de listas / páginas
  surface:      '#FFFFFF',   // cards y filas
  surfaceAlt:   '#F1F5F9',   // filas alternas (SIEMPRE contrasta con texto oscuro)

  // Texto — SIEMPRE oscuro sobre fondos blancos/claros
  text1:        '#0F172A',   // texto principal — negro pizarra
  text2:        '#475569',   // texto secundario
  text3:        '#94A3B8',   // texto tenue / hints

  // Texto sobre header azul
  textOnPrimary:       '#FFFFFF',
  textOnPrimaryMuted:  'rgba(255,255,255,0.65)',

  // Bordes
  border:       '#E2E8F0',
  borderMid:    '#CBD5E1',

  // Semánticos
  success:      '#059669',
  successBg:    '#D1FAE5',
  successText:  '#065F46',
  danger:       '#DC2626',
  dangerBg:     '#FEE2E2',
  dangerText:   '#991B1B',
  warning:      '#D97706',
  warningBg:    '#FEF3C7',
  warningText:  '#92400E',
  info:         '#2563EB',
  infoBg:       '#DBEAFE',
  infoText:     '#1E40AF',

  // Colores de materias (barras laterales) — vivos sobre blanco
  materias: [
    '#F59E0B', // ámbar
    '#2D5FA8', // azul pizarra
    '#059669', // verde
    '#7C3AED', // violeta suave
    '#DC2626', // rojo
    '#0891B2', // cian
    '#D97706', // naranja
    '#4F46E5', // índigo
  ],
};

export const Typography = {
  xs:        11,
  sm:        13,
  base:      15,
  md:        17,
  lg:        20,
  xl:        24,
  xxl:       30,
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
  black:     '900' as const,
  tight:    -0.5,
  wide:      0.5,
  wider:     1,
  widest:    2,
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, full: 999,
};

export const Shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const materiaColor = (i: number) => Colors.materias[i % Colors.materias.length];

// SVG del escudo Pio XII para usar en headers
export const ESCUDO_SVG = `
<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 8 L185 38 L185 118 Q185 178 100 212 Q15 178 15 118 L15 38 Z" fill="white" stroke="white" stroke-width="2"/>
  <path d="M100 18 L175 44 L175 116 Q175 170 100 202 Q25 170 25 116 L25 44 Z" fill="none" stroke="white" stroke-width="3"/>
  <ellipse cx="100" cy="108" rx="38" ry="20" fill="none" stroke="white" stroke-width="2"/>
  <line x1="100" y1="70" x2="100" y2="88" stroke="white" stroke-width="2.5"/>
  <line x1="82" y1="78" x2="100" y2="88" stroke="white" stroke-width="2"/>
  <line x1="118" y1="78" x2="100" y2="88" stroke="white" stroke-width="2"/>
  <rect x="70" y="125" width="60" height="8" rx="1" fill="white"/>
  <rect x="65" y="133" width="70" height="5" rx="1" fill="white" opacity="0.7"/>
  <rect x="62" y="138" width="76" height="4" rx="1" fill="white" opacity="0.5"/>
  <text x="100" y="64" text-anchor="middle" font-size="8" fill="white" font-family="serif" letter-spacing="0.5">INSTITUCIÓN EDUCATIVA</text>
  <text x="100" y="76" text-anchor="middle" font-size="11" fill="white" font-family="serif" font-weight="bold">PIO XII</text>
  <text x="100" y="170" text-anchor="middle" font-size="8" fill="white" font-family="serif" font-style="italic">Ciencia y Progreso</text>
</svg>`;
