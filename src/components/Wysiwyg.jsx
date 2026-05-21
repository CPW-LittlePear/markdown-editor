import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js'
import mermaid from 'mermaid'

let mermaidInit = false
function initMermaid() {
  if (mermaidInit) return
  mermaidInit = true
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
}

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
 * - 失焦或 Ctrl+Enter → 提交修改
 */
export default function Wysiwyg({ content, onChange, fontSize, lineHeight, theme }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const textareaRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => { initMermaid() }, [])

  // marked.lexer 解析为 token 数组（保留 raw 原始文本）
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

  // 自动聚焦 + 自适应高度
  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      const ta = textareaRef.current
      ta.focus()
      ta.selectionStart = ta.selectionEnd = ta.value.length
      // 自适应高度
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
    }
  }, [editingIndex])

  // 编辑文本变化时自适应高度
  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      const ta = textareaRef.current
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
    }
  }, [editText, editingIndex])

  // 获取 token 的原始 Markdown 文本
  const getTokenRaw = useCallback((token) => {
    if (token.raw) return token.raw
    // fallback: 用 text + type 重建简易 raw
    if (token.type === 'heading') return '#'.repeat(token.depth) + ' ' + token.text + '\n'
    if (token.type === 'paragraph') return token.text + '\n'
    if (token.type === 'code') return '```' + (token.lang || '') + '\n' + token.text + '\n```\n'
    return token.text || ''
  }, [])

  // 开始编辑
  const startEdit = useCallback((index) => {
    if (editingIndex === index) return
    const token = tokens[index]
    if (!token || token.type === 'space' || token.type === 'hr') return
    setEditingIndex(index)
    setEditText(getTokenRaw(token))
  }, [editingIndex, tokens, getTokenRaw])

  // 提交编辑
  const commitEdit = useCallback(() => {
    if (editingIndex === null) return
    // 直接替换原 content 中该 token 对应的原始文本
    const token = tokens[editingIndex]
    if (!token) { setEditingIndex(null); return }

    const oldRaw = getTokenRaw(token)
    const newRaw = editText

    // 在原 content 中查找并替换
    const idx = content.indexOf(oldRaw)
    if (idx === -1) {
      // fallback: 用 tokens raw 拼接重建
      const newTokens = tokens.map((t, i) => i === editingIndex ? { ...t, raw: newRaw } : t)
      const newContent = newTokens.map(t => t.raw || '').join('')
      if (newContent !== content) onChange(newContent)
    } else {
      const before = content.slice(0, idx)
      const after = content.slice(idx + oldRaw.length)
      const newContent = before + newRaw + after
      if (newContent !== content) onChange(newContent)
    }

    setEditingIndex(null)
  }, [editingIndex, editText, tokens, content, onChange, getTokenRaw])

  // 快捷键
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setEditingIndex(null)
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      commitEdit()
    }
  }, [commitEdit])

  // 渲染单个 token 为 HTML
  const renderToken = useCallback((token) => {
    try {
      if (token.type === 'html') return token.text
      if (token.type === 'space') return ''
      return marked.parser([token])
    } catch {
      return ''
    }
  }, [])

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

        {tokens.map((token, index) => {
          // 空 token 不渲染
          if (token.type === 'space' && (!token.raw || !token.raw.trim())) {
            return <div key={index} style={{ height: '0.6em' }} />
          }

          const isEditing = editingIndex === index

          if (isEditing) {
            return (
              <div key={index} className="wysiwyg-block editing">
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

          // 分割线不可编辑
          if (token.type === 'hr') {
            return (
              <div
                key={index}
                className="wysiwyg-block readonly"
                dangerouslySetInnerHTML={{ __html: renderToken(token) }}
              />
            )
          }

          return (
            <div
              key={index}
              className="wysiwyg-block"
              onClick={() => startEdit(index)}
              dangerouslySetInnerHTML={{ __html: renderToken(token) }}
            />
          )
        })}
      </div>
    </div>
  )
}
