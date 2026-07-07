import { shell, systemPreferences } from "electron";
import type { PermissionInfo, ScreenPermissionStatus } from "../shared/types";

const SCREEN_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

export function getScreenPermissionInfo(): PermissionInfo {
  if (process.platform !== "darwin") {
    return {
      platform: process.platform,
      status: "granted",
      canOpenSettings: false,
      message: "当前平台不需要单独检测 macOS 屏幕录制权限。"
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

  return {
    platform: process.platform,
    status,
    canOpenSettings: true,
    message: "macOS 尚未允许本应用录制屏幕。请在系统设置 > 隐私与安全性 > 屏幕录制 中允许本应用，授权后重启应用。"
  };
}

export async function openScreenRecordingSettings(): Promise<void> {
  if (process.platform === "darwin") {
    await shell.openExternal(SCREEN_SETTINGS_URL);
  }
}
