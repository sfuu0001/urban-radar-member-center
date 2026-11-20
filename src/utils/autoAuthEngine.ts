/**
 * 自动登录替身：演示项目没有云端会话，恒返回「无需自动登录」。
 * UserAuthModal 打开时的免登检查走这里。
 */
export interface AutoAuthResult {
  ok: boolean;
  uid?: string;
  phone?: string;
  message?: string;
  source?: 'device_token' | 'session' | 'none';
}

export async function performAutoLogin(): Promise<AutoAuthResult> {
  return { ok: false, source: 'none', message: '演示模式：无自动登录' };
}
