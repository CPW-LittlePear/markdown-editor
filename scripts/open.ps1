# Markdown Editor - 通过右键菜单打开 .md 文件
# 用法：powershell -File open.ps1 "C:\path\to\file.md"

param(
    [string]$FilePath
)

if (-not $FilePath -or -not (Test-Path $FilePath)) {
    Write-Host "文件不存在: $FilePath"
    exit 1
}

# 编辑器 HTML 路径（相对于脚本所在目录）
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EditorPath = Join-Path $ScriptDir "..\dist\index.html"

if (-not (Test-Path $EditorPath)) {
    Write-Host "编辑器文件不存在: $EditorPath"
    Write-Host "请先运行 npm run build 构建项目"
    exit 1
}

# 读取 .md 文件内容
$Content = Get-Content -Path $FilePath -Raw -Encoding UTF8

# Base64 编码
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($Content)
$Base64 = [Convert]::ToBase64String($Bytes)

# 将 Base64 中的 +/= 替换为 URL 安全字符
$UrlSafe = $Base64.Replace('+', '-').Replace('/', '_').Replace('=', '')

# 转为绝对 file:// URL
$EditorUri = "file:///" + ($EditorPath -replace '\\', '/')

# 构造完整 URL
$FullUrl = "$EditorUri#data=$UrlSafe"

# 用默认浏览器打开
Start-Process $FullUrl
