import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import { applyFormat } from '../utils/formatUtils'

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

function getTokenRaw(token) {
  if (token.raw) return token.raw
  if (token.type === 'heading') return '#'.repeat(token.depth) + ' ' + token.text + '\n'
  if (token.type === 'paragraph') return token.text + '\n'
  if (token.type === 'code') return '```' + (token.lang || '') + '\n' + token.text + '\n```\n'
  return token.text || ''
}

// 计算在 content 中 token 索引对应的偏移量
function tokenOffset(content, index) {
  const tokens = marked.lexer(content)
  let offset = 0
  for (let i = 0; i < index && i < tokens.length; i++) {
    offset += (tokens[i]?.raw || '').length
  }
  return offset
}

export default function Wysiwyg({ content, onChange, fontSize, lineHeight, theme }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const textareaRef = useRef(null)
  const containerRef = useRef(null)
  const contentRef = useRef(content) // 始终跟踪最新 content
  const pendingInsertIndexRef = useRef(null) // 等 content 更新后在此索引前插入
  const autoEditRef = useRef(false) // 插入后自动编辑新块

  // 同步 content ref
  useEffect(() => {
    contentRef.current = content
  })

  useEffect(() => { initMermaid() }, [])

  const tokens = useMemo(() => {
    try { return marked.lexer(content) } catch { return [] }
  }, [content])

  // mermaid
  useEffect(() => {
    if (!containerRef.current) return
    const els = containerRef.current.querySelectorAll('.mermaid:not(.mermaid-rendered)')
    els.forEach(async (el) => {
      const code = el.textContent
      if (!code) return
      try {
        const { svg } = await mermaid.render('m-' + Math.random().toString(36).slice(2), code)
        el.innerHTML = svg
        el.classList.add('mermaid-rendered')
      } catch { /* ignore */ }
    })
  }, [content])

  // content 更新后处理待插入
  useEffect(() => {
    const insertIndex = pendingInsertIndexRef.current
    if (insertIndex === null) return
    pendingInsertIndexRef.current = null

    // 在最新 content 中计算偏移并插入
    const ct = content
    const offset = tokenOffset(ct, insertIndex)
    const prefix = offset > 0 && ct[offset - 1] !== '\n' ? '\n' : ''
    const suffix = offset < ct.length && ct[offset] !== '\n' ? '\n' : ''
    const newContent = ct.slice(0, offset) + prefix + '\n\n' + suffix + ct.slice(offset)

    // 标记需要自动编辑新块
    autoEditRef.current = offset + prefix.length
    onChange(newContent)
  }, [content])

  // content 更新后自动编辑新插入的块
  useEffect(() => {
    if (autoEditRef.current === false) return
    const targetOffset = autoEditRef.current
    autoEditRef.current = false

    const newTokens = marked.lexer(content)
    let pos = 0
    for (let i = 0; i < newTokens.length; i++) {
      const raw = newTokens[i].raw || ''
      if (pos >= targetOffset && newTokens[i].type !== 'space') {
        setEditingIndex(i)
        setEditText('')
        return
      }
      pos += raw.length
    }
  }, [content])

  // 自动聚焦 + 高度
  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      const ta = textareaRef.current
      ta.focus()
      ta.selectionStart = ta.selectionEnd = ta.value.length
      ta.style.height = 'auto'
      ta.style.height = Math.max(28, ta.scrollHeight) + 'px'
    }
  }, [editingIndex])

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      const ta = textareaRef.current
      ta.style.height = 'auto'
      ta.style.height = Math.max(28, ta.scrollHeight) + 'px'
    }
  }, [editText, editingIndex])

  // 开始编辑
  const startEdit = useCallback((index) => {
    if (editingIndex === index) return
    const token = tokens[index]
    if (!token || token.type === 'space' || token.type === 'hr') return
    setEditingIndex(index)
    setEditText(getTokenRaw(token))
  }, [editingIndex, tokens])

  // 提交编辑
  const commitEdit = useCallback(() => {
    if (editingIndex === null) return
    const token = tokens[editingIndex]
    if (!token) { setEditingIndex(null); return }

    const oldRaw = getTokenRaw(token)
    const newRaw = editText

    // 用 ref 中的最新 content
    const ct = contentRef.current
    const idx = ct.indexOf(oldRaw)

    let newContent
    if (idx === -1) {
      const newTokens = tokens.map((t, i) => i === editingIndex ? { ...t, raw: newRaw } : t)
      newContent = newTokens.map(t => t.raw || '').join('')
    } else {
      newContent = ct.slice(0, idx) + newRaw + ct.slice(idx + oldRaw.length)
    }

    setEditingIndex(null)
    if (newContent !== ct) onChange(newContent)
  }, [editingIndex, editText, tokens, onChange])

  // 格式接口
  useEffect(() => {
    if (editingIndex === null) { delete window.__mdEditorFormat; return }
    window.__mdEditorFormat = (type, value) => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const result = applyFormat(editText, start, end, type, value)
      if (result.content !== editText) {
        setEditText(result.content)
        requestAnimationFrame(() => {
          ta.focus()
          ta.selectionStart = result.selectionStart
          ta.selectionEnd = result.selectionEnd
        })
      }
    }
    return () => { delete window.__mdEditorFormat }
  }, [editingIndex, editText])

  // 快捷键
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.preventDefault(); setEditingIndex(null) }
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); commitEdit() }
  }, [commitEdit])

  // 延迟失焦提交（给 mousedown 时间先执行）
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (textareaRef.current && document.activeElement !== textareaRef.current) {
        commitEdit()
      }
    }, 150)
  }, [commitEdit])

  // 插入新块 —— 核心逻辑
  // 如果正在编辑：先提交 → content 更新后由 useEffect 执行实际插入
  // 如果未编辑：直接插入
  const handleInsert = useCallback((index) => {
    if (editingIndex !== null) {
      // 有正在编辑的块：先提交，标记等待插入
      pendingInsertIndexRef.current = index
      commitEdit()
    } else {
      // 无编辑：直接插入
      const ct = contentRef.current
      const offset = tokenOffset(ct, index)
      const prefix = offset > 0 && ct[offset - 1] !== '\n' ? '\n' : ''
      const suffix = offset < ct.length && ct[offset] !== '\n' ? '\n' : ''
      const newContent = ct.slice(0, offset) + prefix + '\n\n' + suffix + ct.slice(offset)
      autoEditRef.current = offset + prefix.length
      onChange(newContent)
    }
  }, [editingIndex, commitEdit, onChange])

  // 渲染 token
  const renderToken = useCallback((token) => {
    try {
      if (token.type === 'html') return token.text
      if (token.type === 'space') return ''
      return marked.parser([token])
    } catch { return '' }
  }, [])

  // 第一个可渲染 token 的索引
  const firstRealIdx = tokens.findIndex(t => t.type !== 'space' || (t.raw && t.raw.trim()))

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
          const isEditing = editingIndex === index

          if (token.type === 'space' && (!token.raw || !token.raw.trim())) {
            return <div key={index} style={{ height: '0.6em' }} />
          }

          const block = isEditing ? (
            <div key={index} className="wysiwyg-block editing">
              <textarea
                ref={textareaRef}
                className="wysiwyg-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight,
                  fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace',
                }}
              />
            </div>
          ) : token.type === 'hr' ? (
            <div
              key={index}
              className="wysiwyg-block readonly"
              dangerouslySetInnerHTML={{ __html: renderToken(token) }}
            />
          ) : (
            <div
              key={index}
              className="wysiwyg-block"
              onClick={() => startEdit(index)}
              dangerouslySetInnerHTML={{ __html: renderToken(token) }}
            />
          )

          return (
            <div key={index} className="wysiwyg-row">
              <div
                className="wysiwyg-insert-bar"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleInsert(index) }}
              >
                <span className="wysiwyg-plus">+</span>
              </div>
              {block}
            </div>
          )
        })}

        {/* 末尾 + */}
        {content && (
          <div
            className="wysiwyg-insert-bar"
            onMouseDown={(e) => { e.preventDefault(); handleInsert(tokens.length) }}
          >
            <span className="wysiwyg-plus">+</span>
          </div>
        )}
      </div>
    </div>
  )
}
