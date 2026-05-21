@echo off
chcp 65001 >nul
echo ========================================
echo   Markdown 编辑器 - 右键菜单卸载
echo ========================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

set "PROGID=MarkdownEditor.md"

:: 删除右键菜单
reg delete "HKCU\Software\Classes\SystemFileAssociations\.md\shell\OpenWithMDEditor" /f >nul 2>&1

:: 删除 ProgID 注册
reg delete "HKCU\Software\Classes\%PROGID%" /f >nul 2>&1

:: 从 .md 的 OpenWithProgids 中移除
reg delete "HKCU\Software\Classes\.md\OpenWithProgids" /v "%PROGID%" /f >nul 2>&1

echo [完成] 已卸载！
pause
