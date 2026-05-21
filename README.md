# Markdown 轻量编辑器

纯前端 Markdown 在线编辑器，对标 Typora 简洁风格，支持离线运行。

## 快速使用

### 方式一：直接打开（推荐）

```bash
# 构建后，直接用浏览器打开 dist/index.html 即可
# 无需任何服务器，完全离线可用
```

### 方式二：开发模式

```bash
npm install
npm run dev
# 浏览器打开 http://localhost:5173
```

### 方式三：构建生产版本

```bash
npm install
npm run build
# 产物在 dist/index.html，单个文件，直接双击打开
```

## 功能清单

| 功能 | 说明 |
|------|------|
| Markdown 全语法 | 标题、加粗、斜体、删除线、引用、列表、分割线、链接、图片 |
| 代码高亮 | 支持多种编程语言（highlight.js） |
| 表格 | 完整表格渲染 |
| 实时预览 | 编辑区输入，右侧即时刷新 |
| 粘贴图片 | Ctrl+V 粘贴图片自动转 base64 插入 |
| 撤回/重做 | Ctrl+Z / Ctrl+Y |
| 本地自动保存 | 刷新页面内容不丢失（localStorage） |
| 导出 .md | 一键下载 Markdown 源文件 |
| 导出 HTML | 一键下载带样式的 HTML 文件 |
| 主题切换 | 浅色 / 深色模式 |
| 字体/行高 | 工具栏可调节 |
| 数学公式 | 支持 $...$ 行内公式和 $$...$$ 块级公式 |
| Mermaid 图表 | 支持流程图、时序图等 |
| 三种视图 | 双栏 / 仅编辑 / 仅预览 |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z | 撤回 |
| Ctrl+Y | 重做 |
| Ctrl+S | 导出 .md |
| Tab | 插入缩进 |

## 技术栈

- **框架**：React 18 + Vite
- **Markdown 解析**：marked.js
- **代码高亮**：highlight.js
- **图表**：mermaid
- **样式**：原生 CSS（CSS 变量支持主题切换）
- **打包**：vite-plugin-singlefile（单 HTML 输出）

## 项目结构

```
md-editor/
├── index.html          # 入口 HTML
├── package.json        # 依赖配置
├── vite.config.js      # Vite 配置（含单文件打包）
├── README.md           # 本文件
├── dist/               # 构建产物
│   └── index.html      # 可直接打开使用
└── src/
    ├── main.jsx        # React 入口
    ├── App.jsx         # 主组件（状态管理、布局）
    ├── App.css         # 全局样式（含 Typora 风格）
    ├── components/
    │   ├── Toolbar.jsx # 工具栏组件
    │   ├── Editor.jsx  # 编辑器组件
    │   └── Preview.jsx # 预览组件
    └── utils/
        ├── storage.js  # 本地存储工具
        └── export.js   # 导出工具
```

## 二次开发

项目结构清晰，组件职责分明：

- `App.jsx` — 全局状态 + 布局
- `Toolbar.jsx` — 工具栏按钮和下拉菜单
- `Editor.jsx` — 编辑区（textarea + 快捷键 + 粘贴处理）
- `Preview.jsx` — 预览区（marked 渲染 + 代码高亮 + mermaid + 公式）
- `App.css` — CSS 变量系统，修改 `:root` 和 `.theme-dark` 即可调整主题色

添加新功能建议：
- 新按钮 → `Toolbar.jsx`
- 新解析特性 → `Preview.jsx`
- 新设置项 → `App.jsx` state + `storage.js`
