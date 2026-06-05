/**
 * Versa · Design System 组件库 (v19.0)
 *
 * 基础组件:
 * - Button / IconButton
 * - Input / Textarea / Select
 * - Card / Panel
 * - Modal / Drawer
 * - Tabs / Accordion
 * - Toast (provider)
 * - Tooltip
 * - Badge / Tag / Chip
 * - Avatar / AvatarGroup
 * - Skeleton / Spinner
 * - Divider / Stack / HStack / VStack / Spacer
 * - Alert
 */
import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { X, Check, AlertTriangle, Info, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

// ==================== 基础工具 ====================

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
}
export function Divider({ className, orientation = 'horizontal', ...rest }: DividerProps) {
  return (
    <div
      role="separator"
      className={cn(
        'bg-ink-200 dark:bg-ink-700',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
      {...rest}
    />
  )
}

export function Stack({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2', className)} {...rest} />
}
export function HStack({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-row items-center gap-2', className)} {...rest} />
}
export function VStack({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2', className)} {...rest} />
}
export function Spacer() {
  return <div className="flex-1" />
}

// ==================== Button ====================

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft' | 'link' | 'danger'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  solid: 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm',
  outline: 'border border-ink-300 dark:border-ink-600 hover:bg-ink-100 dark:hover:bg-ink-800',
  ghost: 'hover:bg-ink-100 dark:hover:bg-ink-800',
  soft: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200',
  link: 'text-violet-500 hover:underline underline-offset-4',
  danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'text-xs px-2 py-0.5 rounded-md gap-1',
  sm: 'text-sm px-3 py-1 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2 rounded-xl gap-2',
  lg: 'text-base px-5 py-2.5 rounded-xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'solid', size = 'md', loading, leftIcon, rightIcon, fullWidth, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

// ==================== Input / Textarea ====================

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leftIcon?: ReactNode }>(
  function Input({ className, invalid, leftIcon, ...rest }, ref) {
    if (leftIcon) {
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{leftIcon}</span>
          <input
            ref={ref}
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-ink-900 border outline-none transition-colors text-sm',
              invalid
                ? 'border-rose-500 focus:border-rose-600'
                : 'border-ink-200 dark:border-ink-700 focus:border-violet-500',
              className
            )}
            {...rest}
          />
        </div>
      )
    }
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-3 py-2 rounded-xl bg-white dark:bg-ink-900 border outline-none transition-colors text-sm',
          invalid
            ? 'border-rose-500 focus:border-rose-600'
            : 'border-ink-200 dark:border-ink-700 focus:border-violet-500',
          className
        )}
        {...rest}
      />
    )
  }
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2 rounded-xl bg-white dark:bg-ink-900 border outline-none transition-colors text-sm resize-y',
          invalid
            ? 'border-rose-500 focus:border-rose-600'
            : 'border-ink-200 dark:border-ink-700 focus:border-violet-500',
          className
        )}
        {...rest}
      />
    )
  }
)

// ==================== Card / Panel ====================

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50 shadow-sm',
        className
      )}
      {...rest}
    />
  )
}
export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 border-b border-ink-200/50 dark:border-ink-800/50', className)} {...rest} />
}
export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...rest} />
}
export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 border-t border-ink-200/50 dark:border-ink-800/50', className)} {...rest} />
}

// ==================== Modal / Drawer ====================

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
const MODAL_SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className={cn('w-full bg-white dark:bg-ink-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]', MODAL_SIZES[size])}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-ink-200/50 dark:border-ink-800/50">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="p-4 border-t border-ink-200/50 dark:border-ink-800/50 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  )
}

// ==================== Tabs ====================

export interface TabsProps<T extends string> {
  value: T
  onChange: (v: T) => void
  items: { value: T; label: ReactNode; badge?: ReactNode }[]
  variant?: 'pill' | 'underline'
}
export function Tabs<T extends string>({ value, onChange, items, variant = 'pill' }: TabsProps<T>) {
  return (
    <div className={cn('flex gap-1', variant === 'underline' ? 'border-b border-ink-200 dark:border-ink-800' : '')}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            'text-sm font-medium transition-colors flex items-center gap-1.5',
            variant === 'pill'
              ? cn('px-3 py-1.5 rounded-lg', value === it.value ? 'bg-violet-500 text-white' : 'hover:bg-ink-100 dark:hover:bg-ink-800')
              : cn('px-4 py-2 border-b-2 -mb-px', value === it.value ? 'border-violet-500 text-violet-500' : 'border-transparent text-ink-500')
          )}
        >
          {it.label}
          {it.badge}
        </button>
      ))}
    </div>
  )
}

// ==================== Toast ====================

export type ToastKind = 'info' | 'success' | 'warning' | 'error'
export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
  duration?: number
}
interface ToastContextValue {
  toast: (t: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}
const ToastCtx = createContext<ToastContextValue | null>(null)

const TOAST_ICONS: Record<ToastKind, any> = { info: Info, success: Check, warning: AlertTriangle, error: AlertCircle }
const TOAST_COLORS: Record<ToastKind, string> = {
  info: 'border-blue-500/30 bg-blue-50 dark:bg-blue-950/30',
  success: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30',
  warning: 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/30',
  error: 'border-rose-500/30 bg-rose-50 dark:bg-rose-950/30',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback((id: string) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const toast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = 'tst_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const item = { id, ...t }
    setItems((xs) => [...xs, item])
    setTimeout(() => dismiss(id), t.duration ?? 3000)
  }, [dismiss])
  return (
    <ToastCtx.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {items.map((t) => {
          const Icon = TOAST_ICONS[t.kind]
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-md shadow-lg text-sm animate-in slide-in-from-right min-w-[200px] max-w-md',
                TOAST_COLORS[t.kind]
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="p-0.5 rounded hover:bg-black/10">
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastContextValue {
  const v = useContext(ToastCtx)
  if (!v) throw new Error('useToast must be used within ToastProvider')
  return v
}

// ==================== Badge / Tag ====================

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300',
  primary: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  danger: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
}
export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', BADGE_TONES[tone], className)}>
      {children}
    </span>
  )
}

// ==================== Avatar ====================

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  const initial = name.trim().charAt(0).toUpperCase()
  return src ? (
    <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size])} />
  ) : (
    <div className={cn('rounded-full bg-gradient-to-br from-violet-500 to-nova-500 text-white flex items-center justify-center font-semibold', sizes[size])}>
      {initial}
    </div>
  )
}

// ==================== Spinner / Skeleton ====================

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 className="animate-spin text-violet-500" style={{ width: size, height: size }} />
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-ink-200/60 dark:bg-ink-800/60', className)} />
}

// ==================== Alert ====================

export type AlertKind = 'info' | 'success' | 'warning' | 'error'
const ALERT_STYLES: Record<AlertKind, { wrap: string; icon: any }> = {
  info: { wrap: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30 text-blue-900 dark:text-blue-200', icon: Info },
  success: { wrap: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-200', icon: Check },
  warning: { wrap: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30 text-amber-900 dark:text-amber-200', icon: AlertTriangle },
  error: { wrap: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30 text-rose-900 dark:text-rose-200', icon: AlertCircle },
}
export function Alert({ kind = 'info', title, children, onClose }: { kind?: AlertKind; title?: ReactNode; children?: ReactNode; onClose?: () => void }) {
  const { wrap, icon: Icon } = ALERT_STYLES[kind]
  return (
    <div className={cn('flex gap-3 p-3 rounded-xl border', wrap)} role="alert">
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold text-sm">{title}</div>}
        {children && <div className="text-sm opacity-90">{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="p-0.5 rounded hover:bg-black/10">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ==================== Empty ====================

export function EmptyState({ icon: Icon, title, description, action }: { icon?: any; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-ink-400" />
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
