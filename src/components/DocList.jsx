import { useState, useRef, useEffect } from 'react'

// 格式化时间为相对时间
function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DocList({
  docs,
  activeId,
  collapsed,
  onToggle,
  onNew,
  onSwitch,
  onDelete,
  onRename,
  theme,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const startRename = (doc) => {
    setEditingId(doc.id)
    setEditTitle(doc.title)
  }

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <div className={`doclist ${collapsed ? 'collapsed' : ''} ${theme}`}>
      {/* 折叠手柄 */}
      <div className="doclist-toggle" onClick={onToggle} title={collapsed ? '展开文档列表' : '收起文档列表'}>
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path
            d={collapsed ? 'M5 3l4 4-4 4' : 'M9 3l-4 4 4 4'}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {!collapsed && (
        <div className="doclist-body">
          {/* 新建按钮 */}
          <button className="doclist-new-btn" onClick={onNew}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>新建文档</span>
          </button>

          {/* 文档列表 */}
          <div className="doclist-items">
            {docs.length === 0 ? (
              <div className="doclist-empty">还没有文档</div>
            ) : (
              docs.map(doc => (
                <div
                  key={doc.id}
                  className={`doclist-item ${doc.id === activeId ? 'active' : ''}`}
                  onClick={() => onSwitch(doc.id)}
                >
                  <div className="doclist-item-main">
                    {editingId === doc.id ? (
                      <input
                        ref={inputRef}
                        className="doclist-rename-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={confirmRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="doclist-item-title"
                        onDoubleClick={(e) => { e.stopPropagation(); startRename(doc) }}
                      >
                        {doc.title}
                      </span>
                    )}
                    <span className="doclist-item-time">{formatTime(doc.updatedAt)}</span>
                  </div>
                  <button
                    className="doclist-delete-btn"
                    title="删除文档"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`确定删除「${doc.title}」吗？此操作不可撤销。`)) {
                        onDelete(doc.id)
                      }
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
