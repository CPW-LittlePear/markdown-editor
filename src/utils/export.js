/**
 * 导出工具：导出 .md 源文件、导出 HTML
 */

/**
 * 触发浏览器下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 获取当前时间戳字符串，用于文件名
 * @returns {string} 如 "2026-05-21-0845"
 */
function getTimestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

/**
 * 导出 .md 源文件
 * @param {string} content - Markdown 文本
 */
export function exportMarkdown(content) {
  downloadFile(content, `markdown-${getTimestamp()}.md`, 'text/markdown;charset=utf-8')
}

/**
 * 导出 HTML 文件（包含样式）
 * @param {string} htmlContent - 渲染后的 HTML 片段
 * @param {string} rawMd - 原始 Markdown（备用）
 */
export function exportHTML(htmlContent, rawMd) {
  const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body {
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 60px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 16px;
      line-height: 1.8;
      color: #333;
      background: #fff;
    }
    @media (prefers-color-scheme: dark) {
      body { color: #ccc; background: #1e1e1e; }
    }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace; font-size: 14px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    img { max-width: 100%; }
    blockquote { border-left: 4px solid #42b883; padding-left: 16px; color: #666; margin: 16px 0; }
    h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 8px; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 6px; }
    a { color: #42b883; text-decoration: none; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`
  downloadFile(fullHTML, `markdown-${getTimestamp()}.html`, 'text/html;charset=utf-8')
}
