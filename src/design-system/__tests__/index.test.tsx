// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  Button, Input, Card, CardHeader, CardBody, CardFooter,
  Modal, Tabs, Badge, Avatar, Spinner, Skeleton, Alert, EmptyState,
  Divider, ToastProvider, useToast,
} from '../components'
import { colors, spacing, radius, shadow, motion, fontSize, breakpoints, zIndex } from '../tokens'
import { useState } from 'react'

afterEach(() => cleanup())
beforeEach(() => {
  localStorage.clear()
})

describe('design tokens', () => {
  it('colors 含主色与状态色', () => {
    expect(colors.primary[500]).toBe('#8b5cf6')
    expect(colors.success[500]).toBe('#10b981')
    expect(colors.danger[500]).toBe('#ef4444')
  })

  it('spacing 标准 4px 步进', () => {
    expect(spacing[1]).toBe('0.25rem')
    expect(spacing[4]).toBe('1rem')
    expect(spacing[8]).toBe('2rem')
  })

  it('radius 含 full', () => {
    expect(radius.full).toBe('9999px')
  })

  it('shadow 含 glow', () => {
    expect(shadow.glow).toContain('139, 92, 246')
  })

  it('motion duration & easing', () => {
    expect(motion.duration.fast).toBe('150ms')
    expect(motion.easing.spring).toContain('cubic-bezier')
  })

  it('fontSize 是元组', () => {
    expect(fontSize.base[0]).toBe('1rem')
    expect(fontSize.base[1].lineHeight).toBe('1.5rem')
  })

  it('breakpoints & zIndex', () => {
    expect(breakpoints.md).toBe('768px')
    expect(zIndex.modal).toBeGreaterThan(zIndex.dropdown)
  })
})

describe('Button', () => {
  it('渲染文本', () => {
    render(<Button>点击按钮</Button>)
    expect(screen.getByText('点击按钮')).toBeDefined()
  })

  it('loading 禁用 + 旋转图标', () => {
    render(<Button loading>加载中按钮</Button>)
    const btn = screen.getByRole('button')
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('点击触发 onClick', () => {
    const fn = vi.fn()
    render(<Button onClick={fn}>点击X1</Button>)
    fireEvent.click(screen.getByText('点击X1'))
    expect(fn).toHaveBeenCalledOnce()
  })

  it('disabled 不可点击', () => {
    const fn = vi.fn()
    render(<Button disabled onClick={fn}>禁用X2</Button>)
    fireEvent.click(screen.getByText('禁用X2'))
    expect(fn).not.toHaveBeenCalled()
  })

  it('variant 渲染不同样式', () => {
    const { container } = render(<Button variant="danger">危险X3</Button>)
    expect(container.querySelector('button')?.className).toContain('bg-rose-500')
  })

  it('fullWidth', () => {
    const { container } = render(<Button fullWidth>全宽X4</Button>)
    expect(container.querySelector('button')?.className).toContain('w-full')
  })
})

describe('Input', () => {
  it('双向绑定', () => {
    const Wrapper = () => {
      const [v, setV] = useState('')
      return <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="测试输入框" />
    }
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('测试输入框') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(input.value).toBe('hello')
  })

  it('invalid 状态', () => {
    const { container } = render(<Input invalid placeholder="无效测试" />)
    expect(container.querySelector('input')?.className).toContain('border-rose-500')
  })
})

describe('Modal', () => {
  it('open=false 不渲染', () => {
    const { container } = render(<Modal open={false} onClose={() => {}}>内容X5</Modal>)
    expect(container.firstChild).toBeNull()
  })

  it('open=true 渲染', () => {
    const Wrapper = () => {
      const [o, setO] = useState(true)
      return <Modal open={o} onClose={() => setO(false)} title="模态标题X6">模态内容X6</Modal>
    }
    render(<Wrapper />)
    expect(screen.getByText('模态标题X6')).toBeDefined()
    expect(screen.getByText('模态内容X6')).toBeDefined()
  })

  it('ESC 关闭', () => {
    const fn = vi.fn()
    render(<Modal open onClose={fn}>内容X7</Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(fn).toHaveBeenCalledOnce()
  })

  it('点击 X 关闭', () => {
    const fn = vi.fn()
    const { container } = render(<Modal open onClose={fn} title="标题X8">X</Modal>)
    const xBtn = container.querySelector('button')!
    fireEvent.click(xBtn)
    expect(fn).toHaveBeenCalledOnce()
  })
})

describe('Tabs', () => {
  it('渲染所有 tab', () => {
    const Wrapper = () => {
      const [v, setV] = useState('tab-a')
      return (
        <Tabs
          value={v}
          onChange={setV}
          items={[
            { value: 'tab-a', label: '选项A' },
            { value: 'tab-b', label: '选项B' },
            { value: 'tab-c', label: '选项C' },
          ]}
        />
      )
    }
    render(<Wrapper />)
    expect(screen.getByText('选项A')).toBeDefined()
    expect(screen.getByText('选项B')).toBeDefined()
    expect(screen.getByText('选项C')).toBeDefined()
  })

  it('点击切换', () => {
    const Wrapper = () => {
      const [v, setV] = useState('tab-a')
      return (
        <Tabs
          value={v}
          onChange={setV}
          items={[
            { value: 'tab-a', label: '切换A' },
            { value: 'tab-b', label: '切换B' },
          ]}
        />
      )
    }
    render(<Wrapper />)
    fireEvent.click(screen.getByText('切换B'))
    expect(screen.getByText('切换B').className).toContain('bg-violet-500')
  })
})

describe('Badge', () => {
  it('tone 渲染不同颜色', () => {
    const { container } = render(<Badge tone="success">成功徽章</Badge>)
    expect(container.firstChild?.className).toContain('bg-emerald-100')
  })
})

describe('Avatar', () => {
  it('显示首字母', () => {
    render(<Avatar name="Master" />)
    expect(screen.getByText('M')).toBeDefined()
  })

  it('src 渲染 img', () => {
    const { container } = render(<Avatar name="Zelda" src="https://example.com/a.png" />)
    expect(container.querySelector('img')).toBeDefined()
  })
})

describe('Toast', () => {
  it('useToast 抛错 if no provider', () => {
    function Bad() {
      useToast()
      return null
    }
    expect(() => render(<Bad />)).toThrow()
  })

  it('toast 触发后显示', async () => {
    const fn = vi.fn()
    function Demo() {
      const t = useToast()
      return <button onClick={() => { t.toast({ kind: 'success', message: '通知内容X9' }); fn() }}>触发X9</button>
    }
    render(<ToastProvider><Demo /></ToastProvider>)
    fireEvent.click(screen.getByText('触发X9'))
    expect(fn).toHaveBeenCalledOnce()
    expect(await screen.findByText('通知内容X9')).toBeDefined()
  })
})

describe('utility components', () => {
  it('Divider', () => {
    const { container } = render(<Divider />)
    expect(container.querySelector('[role=separator]')).toBeDefined()
  })

  it('Skeleton', () => {
    const { container } = render(<Skeleton className="w-10" />)
    expect(container.firstChild?.className).toContain('animate-pulse')
  })

  it('Spinner', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('.animate-spin')).toBeDefined()
  })

  it('EmptyState', () => {
    render(<EmptyState title="空状态X10" description="描述X10" />)
    expect(screen.getByText('空状态X10')).toBeDefined()
    expect(screen.getByText('描述X10')).toBeDefined()
  })

  it('Alert 4 种 kind', () => {
    for (const k of ['info', 'success', 'warning', 'error'] as const) {
      const { container } = render(<Alert kind={k} title={`告警-${k}`} />)
      expect(container.firstChild).toBeDefined()
    }
  })

  it('Card 组合', () => {
    render(
      <Card>
        <CardHeader>头部X11</CardHeader>
        <CardBody>身体X11</CardBody>
        <CardFooter>脚部X11</CardFooter>
      </Card>
    )
    expect(screen.getByText('头部X11')).toBeDefined()
    expect(screen.getByText('身体X11')).toBeDefined()
    expect(screen.getByText('脚部X11')).toBeDefined()
  })
})
