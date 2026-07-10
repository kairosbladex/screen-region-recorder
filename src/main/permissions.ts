import { shell, systemPreferences } from "electron";
import type { PermissionInfo, ScreenPermissionStatus } from "../shared/types";

const SCREEN_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

export function getScreenPermissionInfo(): PermissionInfo {
  if (process.platform !== "darwin") {
    if (process.platform === "win32") {
      return {
        platform: process.platform,
        status: "granted",
        canOpenSettings: false,
        message: "Windows 由系统处理屏幕捕获授权，无需额外设置。"
      };
    }

    return {
      platform: process.platform,
      status: "granted",
      canOpenSettings: false,
      message: "当前平台无需手动授权屏幕录制。"
    };
  }

  const status = systemPreferences.getMediaAccessStatus("screen") as ScreenPermissionStatus;

  if (status === "granted") {
    return {
      platform: process.platform,
      status,
      canOpenSettings: true,
      message: "屏幕录制权限已授权。"
    };
  }

  if (status === "not-determined" || status === "unknown") {
    return {
      platform: process.platform,
      status,
      canOpenSettings: true,
      message: "首次录制时 macOS 会请求屏幕录制权限；请在系统提示中允许。"
    };
  }

  return {
    platform: process.platform,
    status,
    canOpenSettings: true,
    message: "macOS 尚未允许本应用录制屏幕。请在系统设置 > 隐私与安全性 > 屏幕录制 中允许本应用，授权后重启应用。"
  };
}

export function canAttemptScreenCapture(status: ScreenPermissionStatus): boolean {
  return status !== "denied" && status !== "restricted";
}

export async function openScreenRecordingSettings(): Promise<void> {
  if (process.platform === "darwin") {
    await shell.openExternal(SCREEN_SETTINGS_URL);
  }
}
