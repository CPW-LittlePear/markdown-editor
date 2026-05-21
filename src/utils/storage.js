/**
 * localStorage 工具：多文档管理 + 设置持久化 + workspace 隔离
 *
 * 数据结构（按 workspace 前缀隔离）：
 *   ws:<workspace>:docs: [{ id, title, content, updatedAt, createdAt }]
 *   ws:<workspace>:active: activeDocId
 *   ws:<workspace>:settings: { theme, fontSize, lineHeight, viewMode }
 *
 * 不同 workspace（通过 URL ?ws=xxx 指定）的数据完全隔离
 */

let _workspace = 'default'

// 初始化当前工作区
export function setWorkspace(name) {
  _workspace = String(name || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'default'
}

export function getWorkspace() {
  return _workspace
}

function key(base) {
  return `ws:${_workspace}:${base}`
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 从 Markdown 内容提取第一个 H1 作为标题
export function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : '未命名文档'
}

// ---- 文档操作 ----

export function loadDocs() {
  try {
    const raw = localStorage.getItem(key('docs'))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveDocs(docs) {
  try {
    localStorage.setItem(key('docs'), JSON.stringify(docs))
  } catch { /* ignore */ }
}

export function getActiveDocId() {
  try {
    return localStorage.getItem(key('active')) || null
  } catch {
    return null
  }
}

export function setActiveDocId(id) {
  try {
    localStorage.setItem(key('active'), id)
  } catch { /* ignore */ }
}

export function createDoc(title = '未命名文档', content = '') {
  const docs = loadDocs()
  const now = new Date().toISOString()
  const doc = { id: uid(), title, content, updatedAt: now, createdAt: now }
  docs.unshift(doc)
  saveDocs(docs)
  setActiveDocId(doc.id)
  return doc
}

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

export function renameDoc(id, newTitle) {
  const docs = loadDocs()
  const doc = docs.find(d => d.id === id)
  if (!doc) return null
  doc.title = newTitle
  doc.updatedAt = new Date().toISOString()
  saveDocs(docs)
  return doc
}

export function deleteDoc(id) {
  let docs = loadDocs()
  docs = docs.filter(d => d.id !== id)
  saveDocs(docs)
}

export function getDoc(id) {
  const docs = loadDocs()
  return docs.find(d => d.id === id) || null
}

// ---- 用户设置 ----

export function saveSettings(settings) {
  try {
    localStorage.setItem(key('settings'), JSON.stringify(settings))
  } catch { /* ignore */ }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(key('settings'))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}
