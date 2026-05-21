import { useState, useEffect, useCallback, useRef } from 'react'
import Toolbar from './components/Toolbar'
import DocList from './components/DocList'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Wysiwyg from './components/Wysiwyg'
import {
  loadDocs, createDoc, updateDoc, deleteDoc, renameDoc,
  getDoc, getActiveDocId, setActiveDocId,
  loadSettings, saveSettings, extractTitle,
  setWorkspace, getWorkspace,
} from './utils/storage'
import { exportMarkdown, exportHTML } from './utils/export'
import './App.css'

const DEFAULT_CONTENT = `# 欢迎使用 Markdown 编辑器

一个**轻量、极简**的在线 Markdown 编辑器，支持多文档管理。

---

## 功能一览

| 功能 | 状态 |
|------|------|
| Markdown 全语法 | ✅ |
| 代码高亮 | ✅ |
| 表格编辑 | ✅ |
| 格式工具栏 | ✅ |
| 多文档管理 | ✅ |
| 数学公式 | ✅ |
| Mermaid 图表 | ✅ |
| 主题切换 | ✅ |
`

export default function App() {
  // 初始化工作区（URL ?ws=xxx）
  const wsParam = new URLSearchParams(window.location.search).get('ws')
  if (wsParam) setWorkspace(wsParam)
  const currentWs = getWorkspace()

  const savedSettings = loadSettings()

  // ---- 文档状态 ----
  const [docs, setDocs] = useState(() => loadDocs())
  const [activeId, setActiveIdState] = useState(() => {
    const saved = getActiveDocId()
    const allDocs = loadDocs()
    return allDocs.find(d => d.id === saved) ? saved : (allDocs[0]?.id || null)
  })
  const [content, setContent] = useState(() => {
    const doc = activeId ? getDoc(activeId) : null
    return doc ? doc.content : ''
  })

  // 视图/主题
  const [viewMode, setViewMode] = useState(savedSettings.viewMode || 'split')
  const [theme, setTheme] = useState(savedSettings.theme || 'light')
  const [fontSize, setFontSize] = useState(savedSettings.fontSize || 16)
  const [lineHeight, setLineHeight] = useState(savedSettings.lineHeight || 1.8)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const switchingRef = useRef(false)
  const saveTimerRef = useRef(null)
  const initialized = useRef(false)

  // ---- 初始化 ----
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // 检测 URL hash 中的外部文件数据（右键打开 .md 文件时传入）
    const hash = window.location.hash
    if (hash.startsWith('#data=')) {
      try {
        const urlSafe = hash.slice(6)
        // 还原 Base64：URL 安全字符转回标准 Base64
        const base64 = urlSafe.replace(/-/g, '+').replace(/_/g, '/')
        // 补齐 padding
        const padding = base64.length % 4
        const padded = padding ? base64 + '='.repeat(4 - padding) : base64
        const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))
        const decoder = new TextDecoder('utf-8')
        const decoded = decoder.decode(bytes)

        if (decoded.trim()) {
          const doc = createDoc(extractTitle(decoded), decoded)
          setDocs([doc])
          setActiveIdState(doc.id)
          setContent(doc.content)
          // 清除 hash 防止刷新重复加载
          window.history.replaceState(null, '', window.location.pathname)
          return
        }
      } catch (e) {
        console.warn('解析外部文件失败:', e)
      }
      window.history.replaceState(null, '', window.location.pathname)
    }

    // 正常初始化
    const allDocs = loadDocs()
    if (allDocs.length === 0) {
      const doc = createDoc(extractTitle(DEFAULT_CONTENT), DEFAULT_CONTENT)
      setDocs([doc])
      setActiveIdState(doc.id)
      setContent(doc.content)
    } else {
      const active = getActiveDocId()
      if (!allDocs.find(d => d.id === active)) {
        setActiveDocId(allDocs[0].id)
        setActiveIdState(allDocs[0].id)
        setContent(allDocs[0].content)
      }
    }
  }, [])

  // ---- 自动保存 ----
  useEffect(() => {
    if (!activeId || switchingRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const updated = updateDoc(activeId, content)
      if (updated) {
        setDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
      }
    }, 600)
    return () => clearTimeout(saveTimerRef.current)
  }, [content, activeId])

  // 保存设置
  useEffect(() => {
    saveSettings({ theme, fontSize, lineHeight, viewMode })
  }, [theme, fontSize, lineHeight, viewMode])

  // ---- 文档操作 ----

  const switchToDoc = useCallback((id) => {
    if (id === activeId) return
    // 先保存当前文档
    if (activeId && content.trim()) updateDoc(activeId, content)
    switchingRef.current = true
    const doc = getDoc(id)
    if (doc) {
      setActiveIdState(id)
      setActiveDocId(id)
      setContent(doc.content)
    }
    setDocs(loadDocs())
    requestAnimationFrame(() => { switchingRef.current = false })
  }, [activeId, content])

  const handleNewDoc = useCallback(() => {
    if (activeId && content.trim()) updateDoc(activeId, content)
    const doc = createDoc()
    switchingRef.current = true
    setDocs(loadDocs())
    setActiveIdState(doc.id)
    setContent('')
    requestAnimationFrame(() => { switchingRef.current = false })
  }, [activeId, content])

  const handleDeleteDoc = useCallback((id) => {
    deleteDoc(id)
    const remaining = loadDocs()
    setDocs(remaining)
    if (id === activeId) {
      if (remaining.length > 0) {
        switchingRef.current = true
        setActiveIdState(remaining[0].id)
        setActiveDocId(remaining[0].id)
        setContent(remaining[0].content)
        requestAnimationFrame(() => { switchingRef.current = false })
      } else {
        const doc = createDoc()
        switchingRef.current = true
        setDocs([doc])
        setActiveIdState(doc.id)
        setContent('')
        requestAnimationFrame(() => { switchingRef.current = false })
      }
    }
  }, [activeId])

  const handleRenameDoc = useCallback((id, newTitle) => {
    const updated = renameDoc(id, newTitle)
    if (updated) {
      setDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
    }
  }, [])

  // ---- 工具栏操作 ----
  const handleClear = useCallback(() => {
    if (window.confirm('确定要清空当前文档内容吗？')) setContent('')
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = content
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }, [content])

  const handleUndo = useCallback(() => { window.__mdEditorUndo?.() }, [])
  const handleRedo = useCallback(() => { window.__mdEditorRedo?.() }, [])
  const handleFormat = useCallback((type, value) => { window.__mdEditorFormat?.(type, value) }, [])

  const handleExportMd = useCallback(() => { exportMarkdown(content) }, [content])
  const handleExportHtml = useCallback(() => {
    const previewEl = document.querySelector('.preview-content')
    exportHTML(previewEl ? previewEl.innerHTML : '<p>内容为空</p>', content)
  }, [content])

  // Ctrl+S 全局快捷键
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleExportMd()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleExportMd])

  const layoutClass = `app layout-${viewMode} theme-${theme}`

  return (
    <div className={layoutClass}>
      <Toolbar
        viewMode={viewMode} setViewMode={setViewMode}
        theme={theme} setTheme={setTheme}
        fontSize={fontSize} setFontSize={setFontSize}
        lineHeight={lineHeight} setLineHeight={setLineHeight}
        content={content}
        onClear={handleClear} onCopy={handleCopy}
        onUndo={handleUndo} onRedo={handleRedo}
        onExportMd={handleExportMd} onExportHtml={handleExportHtml}
        onFormat={handleFormat}
      />

      <div className="main-area">
        <DocList
          docs={docs}
          activeId={activeId}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNew={handleNewDoc}
          onSwitch={switchToDoc}
          onDelete={handleDeleteDoc}
          onRename={handleRenameDoc}
          theme={theme}
          workspace={currentWs}
        />

        <div className="content-area">
          {viewMode === 'wysiwyg' ? (
            <Wysiwyg
              content={content}
              onChange={setContent}
              fontSize={fontSize}
              lineHeight={lineHeight}
              theme={theme}
            />
          ) : (
            <>
              {(viewMode === 'split' || viewMode === 'preview') && (
                <Preview content={content} fontSize={fontSize} lineHeight={lineHeight} theme={theme} />
              )}
              {(viewMode === 'split' || viewMode === 'edit') && (
                <Editor
                  content={content}
                  onChange={setContent}
                  fontSize={fontSize}
                  lineHeight={lineHeight}
                  theme={theme}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
