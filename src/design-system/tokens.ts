/**
 * Versa · Design Tokens (v19.0)
 *
 * 设计原则:
 * - 单一来源 (SSOT) — 所有 UI 共享同一套 token
 * - 主题感知 — 同时支持 light/dark
 * - 可扩展 — 颜色/间距/字号/阴影/动效分类
 */

export const colors = {
  // 主色
  primary: { 50: '#f5f3ff', 100: '#ede9fe', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 900: '#4c1d95' },
  // 中性
  ink: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' },
  // 强调
  nova: { 50: '#fef3f2', 500: '#ef4444', 600: '#dc2626' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 500: '#8b5cf6', 600: '#7c3aed' },
  // 状态
  success: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669' },
  warning: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706' },
  danger: { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626' },
  info: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb' },
} as const

export const spacing = {
  px: '1px',
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  '5xl': ['3rem', { lineHeight: '1' }],
} as const

export const radius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const

export const shadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  glow: '0 0 20px rgba(139, 92, 246, 0.3)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const

export const motion = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
  max: 9999,
} as const

export type ColorToken = keyof typeof colors
export type SpacingToken = keyof typeof spacing
export type RadiusToken = keyof typeof radius
export type ShadowToken = keyof typeof shadow

/** 反查 token (用于调试) */
export function resolveToken<T extends Record<string, any>>(tokens: T, key: keyof T): string | T[keyof T] {
  return tokens[key] as any
}
