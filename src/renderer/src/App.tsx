import { AlertTriangle, CheckCircle2, ExternalLink, FolderOpen, MousePointer2, Radio, Settings, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatRegionLabel } from "../../shared/coordinates";
import { DEFAULT_DURATION, EXPORT_FORMATS, MAX_DURATION, MIN_DURATION } from "../../shared/options";
import type { AppInfo, CaptureRegion, ExportFormat, RecordingDuration } from "../../shared/types";
import { recordSelectedRegion, type RecordingPhase, type RecordingProgress } from "./services/screenRecorder";

type AppStatus = "idle" | "selecting" | "recording" | "exporting" | "done" | "error";

export function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [region, setRegion] = useState<CaptureRegion | null>(null);
  const [duration, setDuration] = useState<RecordingDuration>(DEFAULT_DURATION);
  const [format, setFormat] = useState<ExportFormat>("gif");
  const [status, setStatus] = useState<AppStatus>("idle");
  const [message, setMessage] = useState("请选择一个屏幕区域。");
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [progress, setProgress] = useState<RecordingProgress | null>(null);

  const busy = status === "selecting" || status === "recording" || status === "exporting";
  const regionLabel = useMemo(() => formatRegionLabel(region), [region]);

  const refreshAppInfo = useCallback(async () => {
    setAppInfo(await window.screenClip.getAppInfo());
  }, []);

  useEffect(() => {
    void refreshAppInfo();
  }, [refreshAppInfo]);

  async function handleSelectRegion(): Promise<void> {
    setStatus("selecting");
    setMessage("正在等待框选区域。");
    setProgress(null);

    try {
      const result = await window.screenClip.selectRegion();

      if (result.ok && result.region) {
        setRegion(result.region);
        setStatus("idle");
        setMessage("区域已选择，可以开始录制。");
        return;
      }

      setStatus(result.cancelled ? "idle" : "error");
      setMessage(result.error ?? "区域选择失败。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleStartRecording(): Promise<void> {
    if (!region) {
      setStatus("error");
      setMessage("请先选择录制区域。");
      return;
    }

    setLastFile(null);
    setProgress({ elapsedMs: 0, remainingMs: duration * 1000, percent: 0 });

    try {
      const result = await recordSelectedRegion({
        region,
        durationSeconds: duration,
        format,
        onProgress: setProgress,
        onPhase: (phase: RecordingPhase) => {
          setStatus(phase);
          setMessage(phase === "recording" ? "正在录制选中区域。" : "录制完成，正在导出文件。");
        }
      });

      if (!result.ok || !result.filePath) {
        throw new Error(result.error ?? "导出失败。");
      }

      setStatus("done");
      setLastFile(result.filePath);
      setMessage(`已保存：${result.filePath}`);
      await refreshAppInfo();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setProgress(null);
    }
  }

  const isMac = appInfo?.permission.platform === "darwin";
  const permissionWarning = isMac && appInfo.permission.status !== "granted";
  const permissionNeedsSettings =
    isMac && (appInfo.permission.status === "denied" || appInfo.permission.status === "restricted");
  const ffmpegMissing = appInfo?.ffmpeg.available === false;
  const ffmpegMessage = "导出组件不可用。请重新安装完整版本，或先在本机安装 FFmpeg 后重启应用。";
  const formatLabel: Record<string, string> = { gif: "GIF", mp4: "MP4", webm: "WebM" };
  const formatHint: Record<string, string> = { gif: "动图，兼容性好", mp4: "通用视频格式", webm: "现代网页格式" };

  return (
    <main className="app-shell">
      <header className="titlebar">
        <div>
          <h1>Screen Region Recorder</h1>
          <p>框选区域，定时录制，导出 GIF / MP4 / WebM。</p>
        </div>
        <button className="icon-button" type="button" onClick={refreshAppInfo} title="刷新状态" disabled={busy}>
          <Settings size={16} />
        </button>
      </header>

      <section className="status-strip" data-state={status}>
        <StatusIcon status={status} />
        <div>
          <strong>{statusText(status)}</strong>
          <span>{message}</span>
        </div>
      </section>

      <section className="control-grid">
        <div className="panel primary-panel">
          <div className="panel-heading">
            <MousePointer2 size={16} />
            <span>录制区域</span>
          </div>
          <div className="region-readout">{regionLabel}</div>
          {region ? (
            <div className="region-meta">
              坐标 {Math.round(region.bounds.x)}, {Math.round(region.bounds.y)} · 缩放 {region.displayScaleFactor}x
            </div>
          ) : null}
          <button className="command-button" type="button" onClick={handleSelectRegion} disabled={busy}>
            <MousePointer2 size={16} />
            选择区域
          </button>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <Timer size={16} />
            <span>录制时长</span>
          </div>
          <div className="duration-slider">
            <span className="duration-value">{duration}s</span>
            <input
              type="range"
              min={MIN_DURATION}
              max={MAX_DURATION}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={busy}
            />
            <div className="duration-range-labels">
              <span>{MIN_DURATION}s</span>
              <span>{MAX_DURATION}s</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <Radio size={16} />
            <span>导出格式</span>
          </div>
          <div className="format-selector">
            <span className="format-value">{formatLabel[format]}</span>
            <div className="format-segments" role="radiogroup" aria-label="导出格式">
              {EXPORT_FORMATS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={format === item}
                  className={format === item ? "selected" : ""}
                  onClick={() => setFormat(item)}
                  disabled={busy}
                >
                  {formatLabel[item]}
                </button>
              ))}
            </div>
            <span className="format-hint">{formatHint[format]}</span>
          </div>
        </div>
      </section>

      <section className="action-row">
        <button className="record-button" type="button" onClick={handleStartRecording} disabled={busy || !region || ffmpegMissing}>
          <Radio size={17} />
          开始录制
        </button>
        <button className="secondary-button" type="button" onClick={() => window.screenClip.openOutputDir()} disabled={busy}>
          <FolderOpen size={16} />
          打开输出目录
        </button>
        {lastFile ? (
          <button className="secondary-button" type="button" onClick={() => window.screenClip.revealFile(lastFile)} disabled={busy}>
            <ExternalLink size={16} />
            显示文件
          </button>
        ) : null}
      </section>

      {progress ? (
        <section className="progress-panel">
          <div>
            <strong>{Math.ceil(progress.remainingMs / 1000)}s</strong>
            <span>{status === "recording" ? "剩余录制时间" : "正在导出"}</span>
          </div>
          <div className="progress-track">
            <div style={{ width: `${progress.percent * 100}%` }} />
          </div>
        </section>
      ) : null}

      <section className="diagnostics">
        {isMac ? (
          <DiagnosticItem
            kind={permissionWarning ? "warn" : "ok"}
            title="屏幕录制权限"
            text={appInfo?.permission.message ?? "正在检测权限。"}
            action={
              permissionNeedsSettings ? (
                <button type="button" onClick={() => window.screenClip.openScreenSettings()}>
                  打开设置
                </button>
              ) : null
            }
          />
        ) : (
          <DiagnosticItem kind="ok" title="屏幕录制" text={appInfo?.permission.message ?? "正在检测权限。"} />
        )}
        {ffmpegMissing ? <DiagnosticItem kind="warn" title="导出组件" text={ffmpegMessage} /> : null}
        <DiagnosticItem kind="ok" title="输出目录" text={appInfo?.outputDir ?? "正在准备输出目录。"} />
      </section>
    </main>
  );
}

function StatusIcon({ status }: { status: AppStatus }) {
  if (status === "done") {
    return <CheckCircle2 size={20} />;
  }

  if (status === "error") {
    return <AlertTriangle size={20} />;
  }

  return <Radio size={20} />;
}

function statusText(status: AppStatus): string {
  switch (status) {
    case "selecting":
      return "选择区域";
    case "recording":
      return "录制中";
    case "exporting":
      return "导出中";
    case "done":
      return "已完成";
    case "error":
      return "需要处理";
    default:
      return "就绪";
  }
}

function DiagnosticItem({
  kind,
  title,
  text,
  action
}: {
  kind: "ok" | "warn";
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="diagnostic-item" data-kind={kind}>
      <span className="diagnostic-dot" />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      {action}
    </div>
  );
}
