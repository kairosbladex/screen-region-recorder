# Screen Region Recorder

一个本地桌面录屏工具。启动后框选屏幕矩形区域，选择 5 秒、10 秒或 15 秒录制，并导出为 GIF、MP4 或 WebM。录制和转码都在本机完成，不依赖远程服务。

## 下载安装

从 GitHub Releases 下载最新安装包：

https://github.com/kairosbladex/screen-region-recorder/releases/latest

- **macOS Apple Silicon**：下载 `Screen-Region-Recorder-*-mac-arm64.dmg`，打开后将应用拖入 Applications 文件夹。
- **Windows x64**：下载 `Screen-Region-Recorder-*-win-x64.exe`，双击安装。

> 当前安装包是不签名的测试版本，适合自用或开发验证。Windows SmartScreen 可能提示"Windows 已保护你的电脑"，点击"仍要运行"即可。macOS Gatekeeper 可能提示应用无法验证，在系统设置 > 隐私与安全性中点击"仍要打开"。

## 功能

- 全屏透明遮罩拖拽选择录制区域，`Esc` 取消，可重复选择。
- 支持多显示器，区域选择按显示器 ID、DIP 坐标和物理像素坐标分别记录。
- Retina / 缩放屏幕下按实际捕获视频尺寸计算 FFmpeg `crop`，避免裁剪偏移。
- 支持 5 秒、10 秒、15 秒定时录制。
- 支持 GIF、MP4、WebM 导出。
- 默认保存到 `~/Downloads/ScreenClips`，文件名包含时间戳、时长和格式。
- macOS 下检测屏幕录制权限，权限不足时提供清晰提示和设置入口。
- 对未选择区域、无权限、FFmpeg 不可用、导出失败给出可读错误。

## 开发安装

```bash
cd /Users/wangxiaolin/GitHub/screen-region-recorder
npm install
```

如果 Electron 二进制下载很慢，可使用镜像：

```bash
ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/' npm install
```

## 启动开发版

```bash
npm run dev
```

开发版会打开 Electron 窗口。点击“选择区域”后拖拽框选；回到主窗口后选择时长和格式，点击“开始录制”。

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

当前最小测试覆盖：

- Retina DIP 到物理像素 crop 换算。
- 多屏负坐标换算。
- MP4/WebM 编码器安全偶数 crop。
- 5/10/15 秒时长约束。
- `Downloads/ScreenClips` 输出文件名和路径生成。

## 打包安装包

```bash
npm run dist
```

`npm run dist` 默认等同于 `npm run dist:mac`，会在 macOS 上生成 `.dmg`。

### macOS `.dmg`

```bash
npm run dist:mac
```

输出文件位于 `dist/`，文件名类似：

```text
Screen-Region-Recorder-0.1.3-mac-arm64.dmg
```

### Windows `.exe`

请在 Windows 环境执行，不要在 macOS 上交叉打包 Windows 安装包。`ffmpeg-static` 会按安装依赖时的系统下载二进制文件；在 macOS 上打 Windows 包可能会把 macOS 版 FFmpeg 带进 Windows 安装包。

```powershell
npm ci
npm run dist:win
```

输出文件位于 `dist/`，文件名类似：

```text
Screen-Region-Recorder-0.1.3-win-x64.exe
```

`npm run dist:all` 会直接退出并提示使用 CI 矩阵，避免误用单一系统生成错误平台的 FFmpeg。

### GitHub Actions

仓库包含 `.github/workflows/build-installers.yml`。手动触发或在 `main` / `master` 分支推送后，会分别在：

- `macos-latest`：运行 `npm ci`、安装 FFmpeg/ffprobe、`npm run verify`、`npm run dist:mac`，上传 `.dmg`。
- `windows-latest`：运行 `npm ci`、安装 FFmpeg/ffprobe、`npm run verify`、`npm run dist:win`，上传 `.exe`。

这是推荐的双平台打包方式，可以确保每个平台都安装并打包对应系统的 FFmpeg。

推送 `v*` tag 时，workflow 会在两个平台打包成功后创建 GitHub Release，并上传 `.dmg` / `.exe` 安装包：

```bash
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore(release): bump version"
git tag v0.1.4
git push origin main v0.1.4
```

### 未签名说明

当前安装包是不签名的测试版本，适合自用、开发验证或小范围客户试用。Windows SmartScreen 和 macOS Gatekeeper 可能提示风险。正式分发前需要补充 Apple Developer 证书、公证配置、Windows 代码签名证书和对应 CI secrets。

## FFmpeg

推荐本机安装 FFmpeg：

```bash
brew install ffmpeg
```

工具启动时会检测：

1. 本机 `ffmpeg`，例如 `/opt/homebrew/bin/ffmpeg`。
2. 打包资源中的 `ffmpeg-static`。

两者都不可用时，“开始录制”会禁用或导出时报错。

打包版本会优先使用本机 `ffmpeg`，找不到时使用安装包随附的 `ffmpeg-static`。Windows `.exe` 必须在 Windows 环境或 CI 的 `windows-latest` runner 中构建，才能随附 Windows 版 `ffmpeg.exe`。

## macOS 权限

macOS 10.15+ 需要屏幕录制权限：

1. 打开“系统设置”。
2. 进入“隐私与安全性 > 屏幕录制”。
3. 勾选当前运行的 Electron 应用或打包后的 `Screen Region Recorder`。
4. 退出并重新启动应用。

开发模式下，macOS 有时会把权限归到启动它的终端、IDE 或 Electron 进程名下；如果授权后仍失败，请重启应用，并确认授权对象是否正确。

## Windows 使用

Windows 不需要打开 macOS 屏幕录制设置。首次录制时，如果系统或安全软件弹出屏幕捕获相关提示，请允许应用继续录制。

安装包为 NSIS `.exe`，默认创建桌面和开始菜单快捷方式。录制输出仍保存到当前用户的 `Downloads/ScreenClips`。

## 常见问题

### 录制时报“没有屏幕录制权限”

按上面的 macOS 权限步骤授权后重启应用。Electron 官方的屏幕录制权限状态可能需要应用重启后才刷新。

### 导出时报“未找到 FFmpeg”

先执行：

```bash
which ffmpeg
ffmpeg -version
```

如果没有输出，执行 `brew install ffmpeg` 后重启应用。

### GIF 文件较大

GIF 使用 12 fps 和调色板导出，适合短片段。需要更小体积时优先选择 MP4 或 WebM。

### 多屏下裁剪不对

请重新选择区域再录制。应用会记录选择所在显示器的 ID 和坐标；如果录制期间显示器布局发生变化，旧区域可能不再对应原来的屏幕。

## 技术结构

- `src/main`：Electron 主进程、窗口、权限、屏幕源、FFmpeg 导出。
- `src/preload`：安全暴露 IPC API。
- `src/renderer`：React UI、区域选择遮罩、录制服务。
- `src/shared`：类型、坐标换算、输出路径、选项约束。
- `tests`：Vitest 最小验证脚本。
