/**
 * Agentuto Design System Tokens — "Calm Lab Notebook"
 * Grounded in Constitution Art. 7 and .agents/skills/design-system/SKILL.md
 * 
 * Provides single source of truth for:
 * 1. Semantic physical quantity colors (consistent across all 17 sandboxes)
 * 2. Typography scale (Body >= 14px, Labels >= 12px)
 * 3. UI chrome surfaces, borders, and state accents
 */

export const TOKENS = {
  // --- Physical Quantity Color Roles (Constitution Art. 7.2) ---
  qty: {
    // Electric field vectors, field lines, and electrostatic flux
    electricField: '#38bdf8', // Sky Blue (E-field)
    // Magnetic field vectors, induction loops, and flux lines
    magneticField: '#a855f7', // Purple / Violet (B-field)
    // Kinematic velocity vectors and speed indicators
    velocity: '#10b981',      // Emerald Green (v)
    // Net force vectors, gravitational pull, and Coulomb forces
    force: '#ef4444',         // Bright Red (F)
    // Acceleration vectors
    acceleration: '#f97316',  // Amber / Orange (a)
    // Waveforms, phases, and frequencies
    wave: '#6366f1',          // Indigo / Blue
  },

  // --- Energy Partition Color Roles ---
  energy: {
    kinetic: '#6366f1',       // Indigo (Kinetic Energy K)
    potential: '#10b981',     // Emerald (Potential Energy U)
    thermal: '#f59e0b',       // Amber (Thermal / Ohmic Heat Dissipation)
    total: '#e2e8f0',         // Slate Light (Mechanical Total E)
  },

  // --- Charge & Polarity Roles ---
  charge: {
    positive: '#ef4444',      // Red (+)
    negative: '#3b82f6',      // Blue (-)
    neutral: '#94a3b8',       // Muted Slate (0)
  },

  // --- Empirical & Analytical Trace Roles ---
  trace: {
    primary: '#38bdf8',       // Active measured telemetry curve (Sky Blue)
    secondary: '#f43f5e',     // Comparison or input trace (Rose)
    reference: '#94a3b8',     // Analytical theoretical / ghost curve (Slate)
  },

  // --- UI Chrome & Surface Roles ---
  ui: {
    background: '#0a0a0a',   // Deep neutral-950 base
    surface: 'rgba(18, 18, 18, 0.75)',       // Translucent glass panel
    surfaceSubtle: 'rgba(23, 23, 23, 0.60)', // Lighter glass
    border: 'rgba(255, 255, 255, 0.10)',     // Calm subtle border
    borderHover: 'rgba(255, 255, 255, 0.20)',
    accent: '#6366f1',        // Academic Indigo accent
    accentHover: '#4f46e5',
    text: '#f8fafc',          // Primary high-contrast text (Slate 50)
    textMuted: '#94a3b8',     // Secondary descriptive text (Slate 400)
    textSubtle: '#64748b',    // Tertiary metadata / chip text (Slate 500)
  },

  // --- State & Status Indicators ---
  state: {
    recording: '#f43f5e',     // Recording dot active (Rose)
    warning: '#f59e0b',       // Warning / non-isolated boundary (Amber)
    success: '#10b981',       // Equilibrium / match verified (Emerald)
    idle: '#64748b',          // Inactive / paused
  },

  // --- Typography Scale (Constitution Art. 7.3: Body >= 14px, Labels >= 12px) ---
  typography: {
    fontSans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    size: {
      xs: '12px',    // Readability floor for chips, axis ticks, and secondary tags
      sm: '14px',    // Standard body text, descriptions, slider labels
      base: '16px',  // Primary interactive titles and headings
      lg: '18px',    // Section headers
      xl: '20px',    // Modal headers and hero titles
    },
    weight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // --- Safe Area & HUD Dimensions ---
  layout: {
    panelWidthLeft: '320px',
    panelWidthRight: '280px',
    headerHeight: '64px',
    bottomBarHeight: '60px',
    safePadding: '16px',
  },
} as const;

export type DesignTokens = typeof TOKENS;
