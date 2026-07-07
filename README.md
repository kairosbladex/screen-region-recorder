# Screen Region Recorder

一个本地桌面录屏工具。启动后框选屏幕矩形区域，选择 5 秒、10 秒或 15 秒录制，并导出为 GIF、MP4 或 WebM。录制和转码都在本机完成，不依赖远程服务。

## 功能

- 全屏透明遮罩拖拽选择录制区域，`Esc` 取消，可重复选择。
- 支持多显示器，区域选择按显示器 ID、DIP 坐标和物理像素坐标分别记录。
- Retina / 缩放屏幕下按实际捕获视频尺寸计算 FFmpeg `crop`，避免裁剪偏移。
- 支持 5 秒、10 秒、15 秒定时录制。
- 支持 GIF、MP4、WebM 导出。
- 默认保存到 `~/Downloads/ScreenClips`，文件名包含时间戳、时长和格式。
- macOS 下检测屏幕录制权限，权限不足时提供清晰提示和设置入口。
- 对未选择区域、无权限、FFmpeg 不可用、导出失败给出可读错误。

## 安装

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

## 打包

```bash
npm run dist
```

当前 `electron-builder` 配置使用 macOS `dir` 目标，输出未压缩 `.app` 目录，便于本地调试。`ffmpeg-static` 会作为打包资源保留；运行时优先使用本机 `ffmpeg`，找不到时尝试使用打包资源。

当前本地打包默认不签名，适合自用和开发验证。需要正式分发时，请补充 Apple Developer 证书、notarization 和对应的 `electron-builder` 签名配置。

## FFmpeg

推荐本机安装 FFmpeg：

```bash
brew install ffmpeg
```

工具启动时会检测：

1. 本机 `ffmpeg`，例如 `/opt/homebrew/bin/ffmpeg`。
2. 打包资源中的 `ffmpeg-static`。

两者都不可用时，“开始录制”会禁用或导出时报错。

## macOS 权限

macOS 10.15+ 需要屏幕录制权限：

1. 打开“系统设置”。
2. 进入“隐私与安全性 > 屏幕录制”。
3. 勾选当前运行的 Electron 应用或打包后的 `Screen Region Recorder`。
4. 退出并重新启动应用。

开发模式下，macOS 有时会把权限归到启动它的终端、IDE 或 Electron 进程名下；如果授权后仍失败，请重启应用，并确认授权对象是否正确。

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
