import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js'
import mermaid from 'mermaid'

// 初始化 mermaid / highlight
let mermaidInit = false
function initMermaid() {
  if (mermaidInit) return
  mermaidInit = true
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
}

// 为代码块设置高亮
marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  langPrefix: 'hljs language-',
})

/**
 * Typora 风格 WYSIWYG 组件
 * - 只显示渲染后的预览
 * - 点击块 → 原地变为编辑态，显示 Markdown 原始符号
 * - 失焦 → 提交修改，重新渲染
 */
export default function Wysiwyg({ content, onChange, fontSize, lineHeight, theme }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const textareaRef = useRef(null)
  const containerRef = useRef(null)

  // 初始化 mermaid
  useEffect(() => { initMermaid() }, [])

  // 用 marked.lexer 拆分为 token 数组
  const tokens = useMemo(() => {
    try {
      return marked.lexer(content)
    } catch {
      return []
    }
  }, [content])

  // mermaid 渲染
  useEffect(() => {
    if (!containerRef.current) return
    const mermaidEls = containerRef.current.querySelectorAll('.mermaid:not(.mermaid-rendered)')
    mermaidEls.forEach(async (el) => {
      const code = el.textContent
      if (!code) return
      try {
        const { svg } = await mermaid.render('mermaid-' + Math.random().toString(36).slice(2), code)
        el.innerHTML = svg
        el.classList.add('mermaid-rendered')
      } catch { /* ignore */ }
    })
  }, [content])

  // 当 editingIndex 变化时，自动聚焦 textarea
  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      const ta = textareaRef.current
      ta.focus()
      // 光标放到末尾
      ta.selectionStart = ta.selectionEnd = ta.value.length
    }
  }, [editingIndex])

  // 开始编辑某个块
  const startEdit = useCallback((index) => {
    if (editingIndex === index) return
    const token = tokens[index]
    if (!token) return
    setEditingIndex(index)
    setEditText(token.raw || token.text || '')
  }, [editingIndex, tokens])

  // 提交编辑
  const commitEdit = useCallback(() => {
    if (editingIndex === null) return
    // 替换编辑块的 raw 并重建全文
    const newTokens = tokens.map((t, i) => {
      if (i === editingIndex) {
        // 确保 raw 以换行结尾（与 marked lexer 一致）
        const raw = editText.endsWith('\n') ? editText : editText + '\n'
        return { ...t, raw, text: editText.trim() }
      }
      return t
    })
    const newContent = newTokens.map(t => t.raw || '').join('')
    setEditingIndex(null)
    if (newContent !== content) {
      onChange(newContent)
    }
  }, [editingIndex, editText, tokens, content, onChange])

  // 快捷键
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setEditText(tokens[editingIndex]?.raw || '')
      setEditingIndex(null)
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      commitEdit()
    }
  }, [editingIndex, tokens, commitEdit])

  // 渲染单个 token 为 HTML
  const renderToken = useCallback((token) => {
    try {
      if (token.type === 'html') return token.text
      return marked.parser([token])
    } catch {
      return ''
    }
  }, [])

  // 过滤空 token
  const visibleTokens = tokens.filter(t => t.type !== 'space' || (t.raw && t.raw.trim()))

  return (
    <div className={`wysiwyg-pane ${theme}`}>
      <div
        ref={containerRef}
        className="wysiwyg-content markdown-body"
        style={{ fontSize: `${fontSize}px`, lineHeight }}
      >
        {!content && (
          <div className="wysiwyg-placeholder" onClick={() => onChange('# 开始写作\n')}>
            点击此处开始写作...
          </div>
        )}

        {visibleTokens.map((token, i) => {
          const isEditing = editingIndex === i

          if (isEditing) {
            return (
              <div key={i} className="wysiwyg-block editing">
                <textarea
                  ref={textareaRef}
                  className="wysiwyg-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight,
                    fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace',
                  }}
                />
              </div>
            )
          }

          // 不可编辑的类型直接用 HTML
          if (token.type === 'hr') {
            return (
              <div
                key={i}
                className="wysiwyg-block"
                onClick={() => startEdit(i)}
                dangerouslySetInnerHTML={{ __html: renderToken(token) }}
              />
            )
          }

          // 正常渲染块，点击开始编辑
          return (
            <div
              key={i}
              className="wysiwyg-block"
              onClick={() => startEdit(i)}
              dangerouslySetInnerHTML={{ __html: renderToken(token) }}
            />
          )
        })}
      </div>
    </div>
  )
}
