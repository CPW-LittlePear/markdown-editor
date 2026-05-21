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

function getTokenRaw(token) {
  if (token.raw) return token.raw
  if (token.type === 'heading') return '#'.repeat(token.depth) + ' ' + token.text + '\n'
  if (token.type === 'paragraph') return token.text + '\n'
  if (token.type === 'code') return '```' + (token.lang || '') + '\n' + token.text + '\n```\n'
  return token.text || ''
}

export default function Wysiwyg({ content, onChange, fontSize, lineHeight, theme }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const [pendingInsert, setPendingInsert] = useState(null) // 待插入位置(offset)
  const textareaRef = useRef(null)
  const containerRef = useRef(null)
  const pendingInsertRef = useRef(null) // 用 ref 避免 stale closure

  useEffect(() => { initMermaid() }, [])

  // 解析 token
  const tokens = useMemo(() => {
    try { return marked.lexer(content) } catch { return [] }
  }, [content])

  // mermaid 渲染
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

  // 插入新块后自动进入编辑态
  useEffect(() => {
    if (pendingInsert === null) return
    const newTokens = marked.lexer(content)
    // 找 newTokens 中第一个可编辑的非空 token 作为插入的新块
    // pendingInsert 是原 content 中的插入位置
    // 计算新块在新 tokens 中的位置
    let pos = 0
    let targetIdx = -1
    for (let i = 0; i < newTokens.length; i++) {
      const raw = newTokens[i].raw || ''
      if (pos >= pendingInsert && newTokens[i].type !== 'space') {
        targetIdx = i
        break
      }
      pos += raw.length
    }
    // 如果找到了，设为编辑态
    if (targetIdx >= 0) {
      setEditingIndex(targetIdx)
      setEditText('')
    }
    setPendingInsert(null)
  }, [content, pendingInsert])

  // 对外暴露插入接口
  useEffect(() => {
    pendingInsertRef.current = (offset) => setPendingInsert(offset)
  }, [])

  // 自动聚焦 + 自适应高度
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
    const idx = content.indexOf(oldRaw)

    let newContent
    if (idx === -1) {
      const newTokens = tokens.map((t, i) => i === editingIndex ? { ...t, raw: newRaw } : t)
      newContent = newTokens.map(t => t.raw || '').join('')
    } else {
      newContent = content.slice(0, idx) + newRaw + content.slice(idx + oldRaw.length)
    }

    setEditingIndex(null)
    if (newContent !== content) onChange(newContent)
  }, [editingIndex, editText, tokens, content, onChange])

  // 快捷键
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.preventDefault(); setEditingIndex(null) }
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); commitEdit() }
  }, [commitEdit])

  // 插入新块
  const handleInsert = useCallback((index) => {
    // 计算该 token 在 content 中的偏移量
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += (tokens[i]?.raw || '').length
    }
    // 在 offset 处插入空行
    const prefix = offset > 0 && content[offset - 1] !== '\n' ? '\n' : ''
    const suffix = offset < content.length && content[offset] !== '\n' ? '\n' : ''
    const newContent = content.slice(0, offset) + prefix + ' ' + suffix + content.slice(offset)
    pendingInsertRef.current(offset)
    onChange(newContent)
  }, [content, tokens, onChange])

  // 渲染单个 token
  const renderToken = useCallback((token) => {
    try {
      if (token.type === 'html') return token.text
      if (token.type === 'space') return ''
      return marked.parser([token])
    } catch { return '' }
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

        {/* 第一个块之前也显示插入按钮 */}
        {tokens.length > 0 && tokens[0].type !== 'space' && (
          <div className="wysiwyg-insert-bar" onClick={() => handleInsert(0)}>
            <span className="wysiwyg-plus">+</span>
          </div>
        )}

        {tokens.map((token, index) => {
          const isEditing = editingIndex === index

          // 空 token
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
              {/* 每行之前显示插入按钮 */}
              <div className="wysiwyg-insert-bar" onClick={(e) => { e.stopPropagation(); handleInsert(index) }}>
                <span className="wysiwyg-plus">+</span>
              </div>
              {block}
            </div>
          )
        })}

        {/* 末尾插入按钮 */}
        {content && (
          <div className="wysiwyg-insert-bar" onClick={() => handleInsert(tokens.length)}>
            <span className="wysiwyg-plus">+</span>
          </div>
        )}
      </div>
    </div>
  )
}
