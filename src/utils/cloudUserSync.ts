/**
 * 用户会话清理替身。原版会撤销 ObjectURL、清 cookie、通知云端；
 * 演示项目只清本地会话痕迹。
 */
import { safeGetStorage } from './safeStorage';

export async function purgeUserSessionAndLogout(): Promise<void> {
  console.log('[CloudUserSync:demo] 退出登录（本地清理）');
  try {
    localStorage.removeItem('obsidian_session_token');
    localStorage.removeItem('obsidian_user_role');
    // 保留 obsidian_user_profile：这是两个界面的数据源
  } catch {
    /* ignore */
  }
}

/** 界面里判断当前是否有会话（演示项目恒为本地访客） */
export function hasLocalSession(): boolean {
  return Boolean(safeGetStorage<string | null>('obsidian_session_token', null));
}
