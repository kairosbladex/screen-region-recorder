# Release Workflow 实施计划

## 1. 修改 `.github/workflows/build-installers.yml`

完整内容如下（直接覆盖原文件）：

```yaml
name: Build and Release

on:
  workflow_dispatch:
  push:
    branches:
      - main
      - master
    tags:
      - 'v*'
  pull_request:

jobs:
  build:
    name: Build ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: macos-latest
            dist_script: dist:mac
          - os: windows-latest
            dist_script: dist:win

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npm run verify

      - run: npm run ${{ matrix.dist_script }}

      - uses: actions/upload-artifact@v4
        with:
          name: installer-${{ matrix.os }}
          path: |
            dist/*.dmg
            dist/*.exe
          if-no-files-found: warn

  release:
    name: Create Release
    needs: [build]
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          pattern: installer-*
          merge-multiple: true

      - uses: softprops/action-gh-release@v2
        with:
          files: |
            *.dmg
            *.exe
          generate_release_notes: true
          draft: false
          prerelease: false
```

## 2. 修改 `README.md`

在"安装"章节之后、"启动开发版"之前插入以下内容：

```
## 直接下载安装

从 GitHub Releases 下载最新安装包：

https://github.com/kairosbladex/screen-region-recorder/releases/latest

- **Windows**：下载 `Screen-Region-Recorder-*-win-x64.exe`，双击安装。
- **macOS**：下载 `Screen-Region-Recorder-*-mac-arm64.dmg`，打开后将应用拖入 Applications 文件夹。

> 当前安装包是不签名的测试版本，适合自用或开发验证。Windows SmartScreen 可能提示"Windows 已保护你的电脑"，点击"仍要运行"即可。macOS Gatekeeper 可能提示应用无法验证，在系统设置 > 隐私与安全性中点击"仍要打开"。
```

## 验证

```bash
npm run verify
```
