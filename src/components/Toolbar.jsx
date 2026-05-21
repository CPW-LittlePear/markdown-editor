import { useState, useRef, useEffect } from 'react'

// 内联 SVG 图标
const Icons = {
  // 格式
  bold:         <svg width="16" height="16" viewBox="0 0 16 16"><text x="8" y="13" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" font-family="sans-serif">B</text></svg>,
  italic:       <svg width="16" height="16" viewBox="0 0 16 16"><text x="8" y="13" text-anchor="middle" font-size="13" font-style="italic" fill="currentColor" font-family="serif">I</text></svg>,
  strikethrough:<svg width="16" height="16" viewBox="0 0 16 16"><text x="8" y="11" text-anchor="middle" font-size="11" fill="currentColor" font-family="sans-serif">S</text><line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1.2"/></svg>,
  heading:      <svg width="16" height="16" viewBox="0 0 16 16"><text x="4" y="13" font-size="12" font-weight="700" fill="currentColor" font-family="sans-serif">H</text><text x="11" y="11" font-size="8" fill="currentColor" font-family="sans-serif">1</text></svg>,
  heading2:     <svg width="16" height="16" viewBox="0 0 16 16"><text x="4" y="13" font-size="12" font-weight="700" fill="currentColor" font-family="sans-serif">H</text><text x="11" y="11" font-size="8" fill="currentColor" font-family="sans-serif">2</text></svg>,
  heading3:     <svg width="16" height="16" viewBox="0 0 16 16"><text x="4" y="13" font-size="12" font-weight="700" fill="currentColor" font-family="sans-serif">H</text><text x="11" y="11" font-size="8" fill="currentColor" font-family="sans-serif">3</text></svg>,
  ol:           <svg width="16" height="16" viewBox="0 0 16 16"><text x="2" y="8" font-size="8" fill="currentColor" font-family="sans-serif">1.</text><line x1="10" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1"/><line x1="10" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1"/><line x1="10" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1"/></svg>,
  ul:           <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="3" cy="5" r="1.2" fill="currentColor"/><circle cx="3" cy="8" r="1.2" fill="currentColor"/><circle cx="3" cy="11" r="1.2" fill="currentColor"/><line x1="7" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1"/><line x1="7" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1"/><line x1="7" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1"/></svg>,
  task:         <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1.5" y="2" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="4" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1"/><line x1="4" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1"/></svg>,
  quote:        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 4v5h3v3H3V8M8 4v5h3v3H8V8" stroke="currentColor" strokeWidth="1.2" fill="none"/><line x1="2" y1="4" x2="2" y2="12" stroke="currentColor" strokeWidth="2"/></svg>,
  codeBlock:    <svg width="16" height="16" viewBox="0 0 16 16"><polyline points="5,4 1,8 5,12" stroke="currentColor" strokeWidth="1.2" fill="none"/><polyline points="11,4 15,8 11,12" stroke="currentColor" strokeWidth="1.2" fill="none"/><line x1="7" y1="3" x2="9" y2="13" stroke="currentColor" strokeWidth="0.8"/></svg>,
  link:         <svg width="16" height="16" viewBox="0 0 16 16"><path d="M7 3H4a5 5 0 000 10h3M9 13h3a5 5 0 000-10H9" stroke="currentColor" strokeWidth="1.3" fill="none"/><line x1="9" y1="8" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5"/></svg>,
  image:        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><path d="M1 11l4-4 3 2 3-5 4 7" stroke="currentColor" strokeWidth="1" fill="none"/></svg>,
  hr:           <svg width="16" height="16" viewBox="0 0 16 16"><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2"/><line x1="2" y1="5" x2="6" y2="5" stroke="currentColor" strokeWidth="0.8"/><line x1="2" y1="11" x2="6" y2="11" stroke="currentColor" strokeWidth="0.8"/></svg>,

  // 视图
  columns:      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="0.5" y="1" width="6" height="14" rx="1" stroke="currentColor"/><rect x="9.5" y="1" width="6" height="14" rx="1" stroke="currentColor"/></svg>,
  edit:         <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="1.5" stroke="currentColor"/><line x1="4" y1="5" x2="12" y2="5" stroke="currentColor" strokeWidth="1.2"/><line x1="4" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.2"/><line x1="4" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="1.2"/></svg>,
  preview:      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor"/><path d="M1 8s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z" stroke="currentColor"/></svg>,
  sun:          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor"/><line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5"/><line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1.5"/><line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5"/></svg>,
  moon:         <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 10.5A6 6 0 015.5 3 5 5 0 1013 10.5z" stroke="currentColor" fill="currentColor" fillOpacity="0.2"/></svg>,
  undo:         <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 3L1 7l4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 7h9a4 4 0 010 8H8" stroke="currentColor" strokeLinecap="round"/></svg>,
  redo:         <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 3l4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 7H6a4 4 0 000 8h2" stroke="currentColor" strokeLinecap="round"/></svg>,
  trash:        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4l.7 10h4.6l.7-10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  copy:         <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="10" height="10" rx="1.5" stroke="currentColor"/><path d="M2 12V3a1 1 0 011-1h8" stroke="currentColor" strokeLinecap="round"/></svg>,
  fontSizeAA:   <svg width="14" height="14" viewBox="0 0 14 14"><text x="0" y="12" font-size="12" fill="currentColor" font-family="sans-serif" font-weight="700">A</text></svg>,
  chevron:      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  downloadMd:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12v2h12v-2" stroke="currentColor" strokeLinecap="round"/></svg>,
  downloadHtml: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12v2h12v-2" stroke="currentColor" strokeLinecap="round"/><circle cx="1.5" cy="1.5" r="1" fill="currentColor"/><circle cx="14.5" cy="1.5" r="1" fill="currentColor"/><circle cx="8" cy="1.5" r="1" fill="currentColor"/></svg>,
}

// 分隔线小组件
function Separator() {
  return <div className="tb-separator" />
}

export default function Toolbar({
  viewMode, setViewMode,
  theme, setTheme,
  fontSize, setFontSize,
  lineHeight, setLineHeight,
  content,
  onClear, onCopy, onUndo, onRedo,
  onExportMd, onExportHtml,
  onFormat,
}) {
  const [showExport, setShowExport] = useState(false)
  const [showFont, setShowFont] = useState(false)
  const exportRef = useRef(null)
  const fontRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false)
      if (fontRef.current && !fontRef.current.contains(e.target)) setShowFont(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const btnClass = (active) => `tb-btn${active ? ' active' : ''}`

  return (
    <div className="toolbar">
      {/* ===== 格式按钮组 ===== */}
      <div className="tb-group">
        <button className="tb-btn" title="加粗 (Ctrl+B)" onClick={() => onFormat('bold')}>
          {Icons.bold}
        </button>
        <button className="tb-btn" title="斜体 (Ctrl+I)" onClick={() => onFormat('italic')}>
          {Icons.italic}
        </button>
        <button className="tb-btn" title="删除线 (Ctrl+Shift+X)" onClick={() => onFormat('strikethrough')}>
          {Icons.strikethrough}
        </button>
      </div>

      <Separator />

      <div className="tb-group">
        <button className="tb-btn" title="一级标题 (H1)" onClick={() => onFormat('heading1')}>
          {Icons.heading}
        </button>
        <button className="tb-btn" title="二级标题 (H2)" onClick={() => onFormat('heading2')}>
          {Icons.heading2}
        </button>
        <button className="tb-btn" title="三级标题 (H3)" onClick={() => onFormat('heading3')}>
          {Icons.heading3}
        </button>
      </div>

      <Separator />

      <div className="tb-group">
        <button className="tb-btn" title="无序列表 (Ctrl+Shift+U)" onClick={() => onFormat('unorderedList')}>
          {Icons.ul}
        </button>
        <button className="tb-btn" title="有序列表 (Ctrl+Shift+O)" onClick={() => onFormat('orderedList')}>
          {Icons.ol}
        </button>
        <button className="tb-btn" title="任务列表" onClick={() => onFormat('taskList')}>
          {Icons.task}
        </button>
      </div>

      <Separator />

      <div className="tb-group">
        <button className="tb-btn" title="引用 (Ctrl+Shift+Q)" onClick={() => onFormat('blockquote')}>
          {Icons.quote}
        </button>
        <button className="tb-btn" title="代码块 (Ctrl+Shift+K)" onClick={() => onFormat('codeBlock')}>
          {Icons.codeBlock}
        </button>
        <button className="tb-btn" title="链接 (Ctrl+K)" onClick={() => onFormat('link')}>
          {Icons.link}
        </button>
        <button className="tb-btn" title="图片" onClick={() => onFormat('image')}>
          {Icons.image}
        </button>
        <button className="tb-btn" title="分割线" onClick={() => onFormat('horizontalRule')}>
          {Icons.hr}
        </button>
      </div>

      <div className="tb-spacer" />

      {/* ===== 操作按钮组 ===== */}
      <div className="tb-group">
        <button className="tb-btn" title="撤回 (Ctrl+Z)" onClick={onUndo}>
          {Icons.undo}
        </button>
        <button className="tb-btn" title="重做 (Ctrl+Y)" onClick={onRedo}>
          {Icons.redo}
        </button>
      </div>

      <Separator />

      <div className="tb-group">
        <button className="tb-btn" title="复制 Markdown 源码" onClick={onCopy}>
          {Icons.copy}
        </button>
        <button className="tb-btn" title="清空内容" onClick={onClear}>
          {Icons.trash}
        </button>
      </div>

      <div className="tb-spacer" />

      {/* ===== 视图 + 设置 ===== */}
      <div className="tb-group">
        <button className={btnClass(viewMode === 'split')} title="双栏模式" onClick={() => setViewMode('split')}>
          {Icons.columns}
        </button>
        <button className={btnClass(viewMode === 'edit')} title="仅编辑" onClick={() => setViewMode('edit')}>
          {Icons.edit}
        </button>
        <button className={btnClass(viewMode === 'preview')} title="仅预览" onClick={() => setViewMode('preview')}>
          {Icons.preview}
        </button>
      </div>

      <Separator />

      <div className="tb-group">
        <div className="tb-dropdown" ref={fontRef}>
          <button className="tb-btn" title="字体大小 / 行高" onClick={() => setShowFont(!showFont)}>
            {Icons.fontSizeAA}
            <span className="tb-chevron">{Icons.chevron}</span>
          </button>
          {showFont && (
            <div className="tb-dropdown-menu font-menu">
              <div className="menu-label">字体大小</div>
              <div className="menu-row">
                <button className="menu-btn" onClick={() => setFontSize(Math.max(12, fontSize - 2))}>A-</button>
                <span className="menu-val">{fontSize}px</span>
                <button className="menu-btn" onClick={() => setFontSize(Math.min(24, fontSize + 2))}>A+</button>
              </div>
              <div className="menu-divider" />
              <div className="menu-label">行高</div>
              <div className="menu-row">
                <button className="menu-btn" onClick={() => setLineHeight(Math.max(1.2, +(lineHeight - 0.2).toFixed(1)))}>-</button>
                <span className="menu-val">{lineHeight}</span>
                <button className="menu-btn" onClick={() => setLineHeight(Math.min(3.0, +(lineHeight + 0.2).toFixed(1)))}>+</button>
              </div>
            </div>
          )}
        </div>

        <button className="tb-btn" title="切换主题" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? Icons.moon : Icons.sun}
        </button>

        <div className="tb-dropdown" ref={exportRef}>
          <button className="tb-btn" title="导出" onClick={() => setShowExport(!showExport)}>
            {Icons.downloadMd}
            <span className="tb-chevron">{Icons.chevron}</span>
          </button>
          {showExport && (
            <div className="tb-dropdown-menu">
              <button className="menu-item" onClick={() => { onExportMd(); setShowExport(false) }}>
                {Icons.downloadMd}<span>导出 .md 文件</span>
              </button>
              <button className="menu-item" onClick={() => { onExportHtml(); setShowExport(false) }}>
                {Icons.downloadHtml}<span>导出 HTML 文件</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
