import { useRef, useEffect, useMemo, useState } from 'react'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import mermaid from 'mermaid'

// 初始化 mermaid（只需一次）
let mermaidInit = false
function initMermaid() {
  if (mermaidInit) return
  mermaidInit = true
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  })
}

/**
 * 创建 marked 实例，配置代码高亮
 */
function createMarked() {
  return new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value
          } catch {
            // fall through
          }
        }
        return hljs.highlightAuto(code).value
      },
    })
  )
}

/**
 * 简单 KaTeX 渲染（不依赖 katex 库，仅支持基础公式）
 * 支持 $...$ 行内公式 和 $$...$$ 块级公式
 */
function renderMath(text) {
  // 不需要加载 katex 库也能处理基本公式
  // 将 LaTeX 公式包裹在合理的 span 中，在真实场景可加载 katex 渲染
  // 此处做轻量处理：保留公式文本并用 CSS 做基础样式
  const hasMath = /\$\$[\s\S]*?\$\$/.test(text) || /\$[^$`\n]+?\$/.test(text)
  if (!hasMath) return text

  // 块级公式 $$...$$
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    return `<div class="math-block">${escapeHtml(formula.trim())}</div>`
  })
  // 行内公式 $...$
  result = result.replace(/\$([^$`\n]+?)\$/g, (_, formula) => {
    return `<span class="math-inline">${escapeHtml(formula.trim())}</span>`
  })
  return result
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return str.replace(/[&<>"']/g, (c) => map[c])
}

/**
 * Markdown 预览组件
 */
export default function Preview({ content, fontSize, lineHeight, theme }) {
  const previewRef = useRef(null)
  const mermaidRef = useRef({}) // 缓存已渲染的 mermaid 图表
  const [mermaidKey, setMermaidKey] = useState(0)

  // 初始化 mermaid
  useEffect(() => { initMermaid() }, [])

  // 解析 Markdown
  const html = useMemo(() => {
    if (!content) return ''
    const marked = createMarked()
    // 先处理 mermaid 代码块 —— 标记它们，不让 marked 当做普通代码块处理
    const mermaidBlocks = []
    let processedContent = content.replace(/```mermaid\n([\s\S]*?)\n```/g, (_, code) => {
      const id = `__MERMAID_${mermaidBlocks.length}__`
      mermaidBlocks.push(code.trim())
      return id
    })

    // 渲染数学公式
    processedContent = renderMath(processedContent)

    // Markdown 解析
    let rendered = marked.parse(processedContent)

    // 还原 mermaid 代码块为占位 div
    mermaidBlocks.forEach((code, i) => {
      rendered = rendered.replace(`__MERMAID_${i}__`,
        `<div class="mermaid-container"><div class="mermaid" data-mermaid-id="${i}">${escapeHtml(code)}</div></div>`)
    })

    return rendered
  }, [content])

  // mermaid 渲染（在 DOM 更新后执行）
  useEffect(() => {
    if (!previewRef.current) return
    const mermaidEls = previewRef.current.querySelectorAll('.mermaid')
    if (mermaidEls.length === 0) return

    let cancelled = false
    const renderPromises = []

    mermaidEls.forEach(async (el) => {
      const id = el.getAttribute('data-mermaid-id')
      const code = el.textContent
      if (!code) return
      // 跳过已渲染的
      if (mermaidRef.current[id] === code) return
      mermaidRef.current[id] = code

      try {
        const { svg } = await mermaid.render(`mermaid-svg-${id}-${Date.now()}`, code)
        if (!cancelled) {
          el.innerHTML = svg
          el.classList.add('mermaid-rendered')
        }
      } catch (err) {
        console.warn('Mermaid 渲染失败:', err)
        if (!cancelled) {
          el.innerHTML = `<pre class="mermaid-error">Mermaid 语法错误: ${escapeHtml(err.message || '')}</pre>`
        }
      }
    })

    return () => { cancelled = true }
  }, [html, mermaidKey])

  return (
    <div className={`preview-pane ${theme}`}>
      <div
        ref={previewRef}
        className="preview-content markdown-body"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!content && (
        <div className="preview-placeholder">预览内容将在此显示</div>
      )}
    </div>
  )
}
