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

export default function Wysiwyg({ content, onChange, fontSize, lineHeight, theme }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const textareaRef = useRef(null)
  const containerRef = useRef(null)
  const pendingInsertRef = useRef(null) // { offset: number } — edita 提交后自动在此插入
  const editBeforeInsertRef = useRef(null) // 记录点击+时正在编辑的旧内容，等content更新后执行

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

  // content 更新后，检查是否有待处理的插入
  useEffect(() => {
    const pending = pendingInsertRef.current
    if (!pending) return
    pendingInsertRef.current = null

    // 在 newTokens 中找插入位置之后的第一个可编辑 token
    const newTokens = marked.lexer(content)
    let pos = 0
    let targetIdx = -1
    for (let i = 0; i < newTokens.length; i++) {
      const raw = newTokens[i].raw || ''
      if (pos >= pending.offset && newTokens[i].type !== 'space') {
        targetIdx = i
        break
      }
      pos += raw.length
    }
    if (targetIdx >= 0) {
      setEditingIndex(targetIdx)
      setEditText('')
    }
  }, [content])

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
  const commitEdit = useCallback((callback) => {
    if (editingIndex === null) {
      callback?.()
      return
    }
    const token = tokens[editingIndex]
    if (!token) { setEditingIndex(null); callback?.(); return }

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
    if (newContent !== content) {
      onChange(newContent)
      // 等 content 更新后执行回调
      if (callback) {
        // 用 setTimeout 等 React 更新
        setTimeout(callback, 0)
      }
    } else {
      callback?.()
    }
  }, [editingIndex, editText, tokens, content, onChange])

  // 编辑态暴露格式化接口
  useEffect(() => {
    if (editingIndex === null) {
      delete window.__mdEditorFormat
      return
    }
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

  // 插入新块（先提交当前编辑，再插入）
  const handleInsert = useCallback((index) => {
    // 计算基于当前 content 和 tokens 的偏移量
    const currentTokens = marked.lexer(content)
    let offset = 0
    for (let i = 0; i < index && i < currentTokens.length; i++) {
      offset += (currentTokens[i]?.raw || '').length
    }
    const prefix = offset > 0 && content[offset - 1] !== '\n' ? '\n' : ''
    const suffix = offset < content.length && content[offset] !== '\n' ? '\n' : ''

    const doInsert = () => {
      const latestContent = content // from closure, but commitEdit just updated it
      // 直接用当前 content 计算
      const ct = latestContent
      let off = 0
      const tk = marked.lexer(ct)
      for (let i = 0; i < index && i < tk.length; i++) {
        off += (tk[i]?.raw || '').length
      }
      const pf = off > 0 && ct[off - 1] !== '\n' ? '\n' : ''
      const sf = off < ct.length && ct[off] !== '\n' ? '\n' : ''
      const newContent = ct.slice(0, off) + pf + '\n\n' + sf + ct.slice(off)
      pendingInsertRef.current = { offset: off + pf.length }
      onChange(newContent)
    }

    // 如果正在编辑，先提交
    if (editingIndex !== null) {
      commitEdit(doInsert)
    } else {
      doInsert()
    }
  }, [content, editingIndex, onChange, commitEdit])

  // 渲染单个 token
  const renderToken = useCallback((token) => {
    try {
      if (token.type === 'html') return token.text
      if (token.type === 'space') return ''
      return marked.parser([token])
    } catch { return '' }
  }, [])

  // 失焦提交（不拦截插入回调）
  const handleBlur = useCallback(() => {
    // 延迟执行，让点击+的事件先触发
    setTimeout(() => {
      if (textareaRef.current && document.activeElement !== textareaRef.current) {
        // 只有真的失焦才提交（没有 pending 插入时）
        if (!pendingInsertRef.current) {
          commitEdit()
        }
      }
    }, 100)
  }, [commitEdit])

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
              <div className="wysiwyg-insert-bar" onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleInsert(index)
              }}>
                <span className="wysiwyg-plus">+</span>
              </div>
              {block}
            </div>
          )
        })}

        {/* 末尾插入按钮 */}
        {content && (
          <div className="wysiwyg-insert-bar" onMouseDown={(e) => {
            e.preventDefault()
            handleInsert(tokens.length)
          }}>
            <span className="wysiwyg-plus">+</span>
          </div>
        )}
      </div>
    </div>
  )
}
