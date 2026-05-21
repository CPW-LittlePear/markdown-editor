import { useRef, useEffect, useCallback } from 'react'
import { applyFormat } from '../utils/formatUtils'

/**
 * Markdown 编辑器组件
 * 核心功能：实时输入、快捷键、粘贴图片、自动保存、格式化工具栏
 */

export default function Editor({
  content,
  onChange,
  fontSize,
  lineHeight,
  theme,
}) {
  const textareaRef = useRef(null)
  const undoStackRef = useRef([])
  const redoStackRef = useRef([])
  const isUndoRedoRef = useRef(false)
  const lastContentRef = useRef(content)
  const savedSelectionRef = useRef({ start: 0, end: 0 })

  // 记录编辑历史（用于撤回/重做）
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }
    if (content !== lastContentRef.current) {
      undoStackRef.current.push(lastContentRef.current)
      if (undoStackRef.current.length > 100) undoStackRef.current.shift()
      redoStackRef.current = []
      lastContentRef.current = content
    }
  }, [content])

  // 粘贴图片处理：从剪贴板读取图片并转为 base64 data URL
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result
          const imgMd = `![image](${dataUrl})`
          const ta = textareaRef.current
          if (!ta) return
          const start = ta.selectionStart
          const end = ta.selectionEnd
          const newContent = content.slice(0, start) + imgMd + content.slice(end)
          onChange(newContent)
          requestAnimationFrame(() => {
            ta.focus()
            ta.selectionStart = ta.selectionEnd = start + imgMd.length
          })
        }
        reader.readAsDataURL(blob)
        break
      }
    }
  }, [content, onChange])

  // 键盘快捷键处理
  const handleKeyDown = useCallback((e) => {
    const ctrl = e.ctrlKey || e.metaKey

    // Ctrl+B 加粗
    if (ctrl && e.key === 'b') {
      e.preventDefault()
      window.__mdEditorFormat?.('bold')
      return
    }
    // Ctrl+I 斜体
    if (ctrl && e.key === 'i') {
      e.preventDefault()
      window.__mdEditorFormat?.('italic')
      return
    }
    // Ctrl+Shift+X 删除线
    if (ctrl && e.shiftKey && e.key === 'x') {
      e.preventDefault()
      window.__mdEditorFormat?.('strikethrough')
      return
    }
    // Ctrl+K 链接
    if (ctrl && e.key === 'k') {
      e.preventDefault()
      window.__mdEditorFormat?.('link')
      return
    }
    // Ctrl+` 行内代码
    if (ctrl && e.key === '`') {
      e.preventDefault()
      window.__mdEditorFormat?.('inlineCode')
      return
    }
    // Ctrl+Shift+K 代码块
    if (ctrl && e.shiftKey && e.key === 'k') {
      e.preventDefault()
      window.__mdEditorFormat?.('codeBlock')
      return
    }
    // Ctrl+Shift+Q 引用
    if (ctrl && e.shiftKey && e.key === 'q') {
      e.preventDefault()
      window.__mdEditorFormat?.('blockquote')
      return
    }

    // Ctrl+Z 撤回
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      if (undoStackRef.current.length > 0) {
        const prev = undoStackRef.current.pop()
        redoStackRef.current.push(content)
        isUndoRedoRef.current = true
        lastContentRef.current = prev
        onChange(prev)
      }
      return
    }
    // Ctrl+Y 或 Ctrl+Shift+Z 重做
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      if (redoStackRef.current.length > 0) {
        const next = redoStackRef.current.pop()
        undoStackRef.current.push(content)
        isUndoRedoRef.current = true
        lastContentRef.current = next
        onChange(next)
      }
      return
    }
    // Tab 插入缩进
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newContent = content.slice(0, start) + '    ' + content.slice(end)
      onChange(newContent)
      requestAnimationFrame(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = start + 4
      })
      return
    }
  }, [content, onChange])

  // 对外暴露的撤回/重做
  useEffect(() => {
    window.__mdEditorUndo = () => {
      if (undoStackRef.current.length > 0) {
        const prev = undoStackRef.current.pop()
        redoStackRef.current.push(content)
        isUndoRedoRef.current = true
        lastContentRef.current = prev
        onChange(prev)
      }
    }
    window.__mdEditorRedo = () => {
      if (redoStackRef.current.length > 0) {
        const next = redoStackRef.current.pop()
        undoStackRef.current.push(content)
        isUndoRedoRef.current = true
        lastContentRef.current = next
        onChange(next)
      }
    }

    // 格式化接口
    window.__mdEditorFormat = (type, value) => {
      const ta = textareaRef.current
      if (!ta) return
      // 优先用实时选区，失焦时用保存的选区
      const hasFocus = document.activeElement === ta
      const start = hasFocus ? ta.selectionStart : savedSelectionRef.current.start
      const end = hasFocus ? ta.selectionEnd : savedSelectionRef.current.end
      const result = applyFormat(content, start, end, type, value)
      if (result.content !== content) {
        isUndoRedoRef.current = false
        lastContentRef.current = content
        undoStackRef.current.push(content)
        redoStackRef.current = []
        onChange(result.content)
        requestAnimationFrame(() => {
          ta.focus()
          ta.selectionStart = result.selectionStart
          ta.selectionEnd = result.selectionEnd
        })
      }
    }

    return () => {
      delete window.__mdEditorUndo
      delete window.__mdEditorRedo
      delete window.__mdEditorFormat
    }
  }, [content, onChange])

  return (
    <div className={`editor-pane ${theme}`}>
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          savedSelectionRef.current = {
            start: e.target.selectionStart,
            end: e.target.selectionEnd,
          }
        }}
        placeholder="开始输入 Markdown..."
        spellCheck={false}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
        }}
      />
    </div>
  )
}
