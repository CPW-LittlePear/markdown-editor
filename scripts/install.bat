@echo off
chcp 65001 >nul
echo ========================================
echo   Markdown 编辑器 - 右键菜单安装
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    echo 右键此文件 → "以管理员身份运行"
    pause
    exit /b 1
)

:: 获取脚本所在目录的绝对路径
set "SCRIPT_DIR=%~dp0"
set "PS_PATH=%SCRIPT_DIR%open.ps1"

:: 注册 .md 文件类型的 OpenWithProgids（让"打开方式"里出现我们的编辑器）
:: 创建文件类型 ProgID
set "PROGID=MarkdownEditor.md"
reg add "HKCU\Software\Classes\%PROGID%" /ve /d "Markdown Editor" /f >nul
reg add "HKCU\Software\Classes\%PROGID%\shell\open" /ve /d "用 Markdown 编辑器打开" /f >nul
reg add "HKCU\Software\Classes\%PROGID%\shell\open\command" /ve /d "powershell.exe -ExecutionPolicy Bypass -File \"%PS_PATH%\" \"%%1\"" /f >nul

:: 关联到 .md 扩展名
reg add "HKCU\Software\Classes\.md\OpenWithProgids" /v "%PROGID%" /d "" /f >nul

:: 添加右键菜单（针对所有 .md 文件）
reg add "HKCU\Software\Classes\SystemFileAssociations\.md\shell\OpenWithMDEditor" /ve /d "用 Markdown 编辑器打开" /f >nul
reg add "HKCU\Software\Classes\SystemFileAssociations\.md\shell\OpenWithMDEditor\command" /ve /d "powershell.exe -ExecutionPolicy Bypass -File \"%PS_PATH%\" \"%%1\"" /f >nul

echo [完成] 安装成功！
echo 现在可以右键 .md 文件 → "用 Markdown 编辑器打开"
echo.
echo 安装路径：%PS_PATH%
echo.
pause
