/**
 * Markdown 格式化工具
 * 支持选中文字包裹 / 无选中时作用于当前行
 *
 * 返回值：{ content, selectionStart, selectionEnd }
 */

/**
 * 获取光标所在行的起始、结束位置
 */
export function getCurrentLine(content, pos) {
  const start = content.lastIndexOf('\n', pos - 1) + 1
  const end = content.indexOf('\n', pos)
  return { start, end: end === -1 ? content.length : end }
}

/**
 * 获取选区覆盖的所有行（多行操作时用）
 */
export function getLineRange(content, start, end) {
  const lineStart = content.lastIndexOf('\n', start - 1) + 1
  const lineEnd = content.indexOf('\n', end)
  return { start: lineStart, end: lineEnd === -1 ? content.length : lineEnd }
}

/**
 * 包裹选中文本（无选中时包裹占位文本）
 * prefix/suffix: 包裹符号，如 '**'/'**'
 * placeholder: 无选中时的默认文本
 * cursorOffset: 包裹后光标相对 prefix 末尾的偏移
 */
function wrap(content, start, end, prefix, suffix, placeholder = '文字', cursorOffset) {
  const hasSelection = start !== end
  const selected = hasSelection ? content.slice(start, end) : placeholder
  const wrapped = prefix + selected + suffix
  const newContent = content.slice(0, start) + wrapped + content.slice(end)

  const prefixLen = prefix.length
  const selLen = selected.length
  // 默认光标选中包裹内的文字
  const cs = start + prefixLen
  const ce = start + prefixLen + selLen

  return { content: newContent, selectionStart: cs, selectionEnd: ce }
}

/**
 * 为每行添加/移除前缀（用于列表/引用/标题）
 * toggle: 如果所有行已有前缀则移除
 */
function prefixLines(content, start, end, prefix, toggle = true) {
  const { start: lineStart, end: lineEnd } = getLineRange(content, start, Math.max(start, end))
  const block = content.slice(lineStart, lineEnd)
  const lines = block.split('\n')

  // 检查是否全部行已有该前缀
  const allPrefixed = toggle && lines.every(l => l.startsWith(prefix) || l.trim() === '')
  const prefixLen = prefix.length

  const newLines = allPrefixed
    ? lines.map(l => l.startsWith(prefix) ? l.slice(prefixLen) : l)
    : lines.map(l => {
        // 已有其他标题前缀时替换
        if (l.match(/^(#{1,6}\s)/)) {
          return prefix + l.replace(/^#{1,6}\s/, '')
        }
        return prefix + l
      })

  const newBlock = newLines.join('\n')
  const newContent = content.slice(0, lineStart) + newBlock + content.slice(lineEnd)

  // 光标保持
  const offset = newBlock.length - block.length
  return {
    content: newContent,
    selectionStart: start + (allPrefixed ? -prefixLen : prefixLen),
    selectionEnd: Math.max(start, end) + offset,
  }
}

/**
 * 主入口：根据 formatType 应用格式
 */
export function applyFormat(content, start, end, type) {
  switch (type) {
    // ---- 行内格式 (包裹) ----
    case 'bold':
      return wrap(content, start, end, '**', '**', '加粗')

    case 'italic':
      return wrap(content, start, end, '*', '*', '斜体')

    case 'strikethrough':
      return wrap(content, start, end, '~~', '~~', '删除线')

    case 'inlineCode':
      return wrap(content, start, end, '`', '`', '代码')

    // ---- 块级格式 (前缀每行) ----
    case 'heading1':
      return prefixLines(content, start, end, '# ')

    case 'heading2':
      return prefixLines(content, start, end, '## ')

    case 'heading3':
      return prefixLines(content, start, end, '### ')

    case 'heading4':
      return prefixLines(content, start, end, '#### ')

    case 'orderedList':
      return prefixLines(content, start, end, '1. ')

    case 'unorderedList':
      return prefixLines(content, start, end, '- ')

    case 'taskList':
      return prefixLines(content, start, end, '- [ ] ')

    case 'blockquote':
      return prefixLines(content, start, end, '> ')

    // ---- 链接 ----
    case 'link': {
      if (start !== end) {
        const text = content.slice(start, end)
        const md = `[${text}](url)`
        const newContent = content.slice(0, start) + md + content.slice(end)
        return {
          content: newContent,
          selectionStart: start + text.length + 3,
          selectionEnd: start + text.length + 6, // 选中 "url"
        }
      }
      // 无选中：插入空链接
      const md = '[链接文字](url)'
      const newContent = content.slice(0, start) + md + content.slice(end)
      return {
        content: newContent,
        selectionStart: start + 1,
        selectionEnd: start + 5, // 选中 "链接文字"
      }
    }

    // ---- 图片 ----
    case 'image': {
      if (start !== end) {
        const alt = content.slice(start, end)
        const md = `![${alt}](url)`
        const newContent = content.slice(0, start) + md + content.slice(end)
        return {
          content: newContent,
          selectionStart: start + alt.length + 4,
          selectionEnd: start + alt.length + 7,
        }
      }
      const md = '![图片](url)'
      const newContent = content.slice(0, start) + md + content.slice(end)
      return {
        content: newContent,
        selectionStart: start + 2,
        selectionEnd: start + 4,
      }
    }

    // ---- 代码块 ----
    case 'codeBlock': {
      if (start !== end) {
        const code = content.slice(start, end)
        const md = `\`\`\`\n${code}\n\`\`\``
        const newContent = content.slice(0, start) + md + content.slice(end)
        return {
          content: newContent,
          selectionStart: start + 4,
          selectionEnd: start + 4 + code.length,
        }
      }
      // 无选中：插入空代码块
      const md = '```\n\n```'
      const newContent = content.slice(0, start) + md + content.slice(end)
      return {
        content: newContent,
        selectionStart: start + 4,
        selectionEnd: start + 4,
      }
    }

    // ---- 分割线 ----
    case 'horizontalRule': {
      const prefix = start > 0 && content[start - 1] !== '\n' ? '\n' : ''
      const suffix = end < content.length && content[end] !== '\n' ? '\n' : ''
      const md = `${prefix}---${suffix}`
      const newContent = content.slice(0, start) + md + content.slice(end)
      const cursor = start + md.length
      return { content: newContent, selectionStart: cursor, selectionEnd: cursor }
    }

    default:
      return { content, selectionStart: start, selectionEnd: end }
  }
}
