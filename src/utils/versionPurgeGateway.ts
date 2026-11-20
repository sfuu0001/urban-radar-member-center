/**
 * 版本清理网关替身：主项目里它负责发版后清本地脏数据；
 * 抽出的界面没有发版语境，这里只提供同名的构建版本常量与「本地强刷」动作
 * （强刷 = 清 sessionStorage 后整页刷新，保留用户档案）。
 */
import { safeGetStorage } from './safeStorage';

export const ACTIVE_BUILD_VERSION = 'member-center-demo-1.0.0';
export const ACTIVE_BUILD_TIMESTAMP = new Date().toISOString();
export const STORAGE_VERSION_KEY = 'URBAN_RADAR_ACTIVE_BUILD_VERSION';

/** 「本地强刷」按钮（ProfilePageView 底部）在演示项目里的行为 */
export async function manualForceCloudPurgeAndReload(): Promise<void> {
  try {
    sessionStorage.clear();
    localStorage.setItem(STORAGE_VERSION_KEY, ACTIVE_BUILD_VERSION);
  } catch {
    /* ignore */
  }
  window.location.reload();
}

/** 供界面展示当前本地版本戳 */
export function getLocalVersionStamp(): string {
  return safeGetStorage<string>(STORAGE_VERSION_KEY, ACTIVE_BUILD_VERSION);
}
