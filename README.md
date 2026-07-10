# Screen Region Recorder

本地桌面录屏工具。框选屏幕区域，定时录制，导出 GIF / MP4 / WebM。录制和转码都在本机完成，不依赖远程服务。

## 下载安装

从 [GitHub Releases](https://github.com/kairosbladex/screen-region-recorder/releases/latest) 下载最新安装包：

- **macOS Apple Silicon**：`Screen-Region-Recorder-*-mac-arm64.dmg`
- **Windows x64**：`Screen-Region-Recorder-*-win-x64.exe`

> 安装包为未签名测试版本。Windows SmartScreen 可能提示"Windows 已保护你的电脑"，点击"仍要运行"。macOS Gatekeeper 可能提示无法验证，在系统设置 > 隐私与安全性中点击"仍要打开"。

## 功能

- 全屏透明遮罩拖拽选择录制区域，`Esc` 取消，可重复选择。
- 选择区域时自动隐藏主窗口，避免应用界面出现在录屏中。
- 支持多显示器，区域选择按显示器 ID、DIP 坐标和物理像素坐标分别记录。
- 录制开始前自动隐藏主窗口，录制结束后自动恢复。
- Retina / 缩放屏幕下按实际捕获视频尺寸计算 FFmpeg `crop`，避免裁剪偏移。
- 滑块选择录制时长 1–10 秒，实时显示倒计时。
- 导出格式：GIF（动图，兼容性好）、MP4（通用视频格式）、WebM（现代网页格式）。
- 默认保存到 `~/Downloads/ScreenClips`，文件名包含时间戳、时长和格式。
- macOS：检测屏幕录制权限，权限不足时提供设置入口；Windows：自动处理无需额外授权。
- 对未选择区域、无权限、FFmpeg 不可用、导出失败给出可读错误。

## 开发安装

```bash
cd project-dir
npm install
```

Electron 二进制下载慢时可使用镜像：

```bash
ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/' \
FFMPEG_BINARIES_URL='https://cdn.npmmirror.com/binaries/ffmpeg-static' \
npm install
```

## 启动开发版

```bash
npm run dev
```

打开 Electron 窗口 → 点击"选择区域"拖拽框选 → 选择时长和格式 → 点击"开始录制"。

## 验证

```bash
npm run typecheck
npm test
npm run build
```

一键执行：

```bash
npm run verify
```

当前测试覆盖：

- Retina DIP 到物理像素 crop 换算
- 多屏负坐标换算
- MP4/WebM 编码器安全偶数 crop
- 1–10 秒时长约束
- `Downloads/ScreenClips` 输出文件名和路径生成
- 捕获会话释放、多屏源匹配、导出请求校验和输出路径安全
- macOS 首次屏幕录制授权、录制流及时释放和导出期间并发锁
- FFmpeg 失败时的原子输出与残留文件清理
- 打包使用的 `ffmpeg-static` 对 GIF / MP4 / WebM 的真实转码
- 区域选择拖拽的快速 pointer 事件边界

## 打包安装包

### macOS `.dmg`

```bash
npm run dist:mac
```

输出 `dist/Screen-Region-Recorder-*-mac-arm64.dmg`

### Windows `.exe`

在 Windows 环境执行，不要跨平台交叉打包。`ffmpeg-static` 按安装时的系统下载对应二进制。

```powershell
npm ci
npm run dist:win
```

输出 `dist/Screen-Region-Recorder-*-win-x64.exe`

也可直接使用 `dist/win-unpacked` 目录。

### GitHub Actions

仓库包含 `.github/workflows/build-installers.yml`。推送 `main` 或 `v*` tag 时自动在 macOS 和 Windows runner 上构建并上传安装包。推送 `v*` tag 时自动创建 GitHub Release：

```bash
git switch main
git pull --ff-only origin main
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore(release): bump version"
VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"
```

Release 工作流会拒绝版本号与 tag 不一致，或 tag 指向尚未进入默认分支的提交。

### macOS 签名说明

macOS 安装包会在打包时做 ad-hoc bundle 签名，避免 App bundle 签名结构损坏导致无法启动。它仍不是 Apple Developer ID 公证包，Gatekeeper 可能提示无法验证；首次打开可在系统设置 > 隐私与安全性中点击"仍要打开"。正式分发前需要 Apple Developer 证书、公证配置、Windows 代码签名证书和 CI secrets。

## FFmpeg

推荐本机安装：

```bash
brew install ffmpeg
```

启动时检测顺序：本机 `ffmpeg` → 打包的 `ffmpeg-static`。两者都不可用时"开始录制"禁用或导出时报错。

## macOS 权限

macOS 10.15+ 需要屏幕录制权限：

1. 打开"系统设置"。
2. 进入"隐私与安全性 > 屏幕录制"。
3. 勾选终端或 `Screen Region Recorder`。
4. 重启应用。

开发模式下，macOS 有时把权限归到终端/IDE；授权后仍失败请重启。

## Windows 使用

Windows 自动处理屏幕捕获授权，无需手动设置。首次录制时如系统弹出请求，允许即可。

安装包为 NSIS `.exe`，创建桌面和开始菜单快捷方式。

## 常见问题

### 录制时报"没有屏幕录制权限"（macOS）

按 macOS 权限步骤授权后重启应用。权限状态可能需要应用重启后才刷新。

### 导出时报"未找到 FFmpeg"

```bash
which ffmpeg
ffmpeg -version
```

无输出则 `brew install ffmpeg` 后重启。

### GIF 文件较大

GIF 使用 30 fps 和调色板导出，适合短片段。需要更小体积时选择 MP4 或 WebM。

### 多屏下裁剪不对

重新选择区域再录制。应用记录选择所在显示器的 ID 和坐标；录制期间显示器布局变化可能导致旧区域不匹配。

## 技术结构

- `src/main`：Electron 主进程、窗口、权限、屏幕源、FFmpeg 导出
- `src/preload`：安全暴露 IPC API
- `src/renderer`：React UI、区域选择遮罩、录制服务
- `src/shared`：类型、坐标换算、输出路径、选项约束
- `tests`：Vitest 最小验证脚本
