/**
 * localStorage 工具：多文档管理 + 设置持久化
 *
 * 数据结构：
 *   md-editor-docs: [{ id, title, content, updatedAt, createdAt }]
 *   md-editor-active: activeDocId
 *   md-editor-settings: { theme, fontSize, lineHeight, viewMode }
 */

const DOCS_KEY = 'md-editor-docs'
const ACTIVE_KEY = 'md-editor-active'
const SETTINGS_KEY = 'md-editor-settings'

// 生成唯一 ID
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 从 Markdown 内容提取第一个 H1 作为标题
export function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : '未命名文档'
}

/**
 * 读取所有文档列表
 */
export function loadDocs() {
  try {
    const raw = localStorage.getItem(DOCS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

/**
 * 保存所有文档列表
 */
function saveDocs(docs) {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs))
  } catch { /* ignore */ }
}

/**
 * 获取当前活动文档 ID
 */
export function getActiveDocId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null
  } catch {
    return null
  }
}

/**
 * 设置当前活动文档 ID
 */
export function setActiveDocId(id) {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch { /* ignore */ }
}

/**
 * 创建新文档，返回新文档对象
 */
export function createDoc(title = '未命名文档', content = '') {
  const docs = loadDocs()
  const now = new Date().toISOString()
  const doc = { id: uid(), title, content, updatedAt: now, createdAt: now }
  docs.unshift(doc)
  saveDocs(docs)
  setActiveDocId(doc.id)
  return doc
}

/**
 * 更新文档内容（自动更新 updatedAt 和标题）
 */
export function updateDoc(id, content) {
  const docs = loadDocs()
  const doc = docs.find(d => d.id === id)
  if (!doc) return null
  doc.content = content
  doc.updatedAt = new Date().toISOString()
  doc.title = extractTitle(content)
  saveDocs(docs)
  return doc
}

/**
 * 手动重命名文档
 */
export function renameDoc(id, newTitle) {
  const docs = loadDocs()
  const doc = docs.find(d => d.id === id)
  if (!doc) return null
  doc.title = newTitle
  doc.updatedAt = new Date().toISOString()
  saveDocs(docs)
  return doc
}

/**
 * 删除文档
 */
export function deleteDoc(id) {
  let docs = loadDocs()
  docs = docs.filter(d => d.id !== id)
  saveDocs(docs)
}

/**
 * 获取指定文档
 */
export function getDoc(id) {
  const docs = loadDocs()
  return docs.find(d => d.id === id) || null
}

// ---- 用户设置 ----

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch { /* ignore */ }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}
