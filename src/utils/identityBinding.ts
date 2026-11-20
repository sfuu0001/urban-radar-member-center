/**
 * 身份绑定替身：本设备码（同桌点餐用的 6 位码）。
 * 原版从 localStorage 的 participantId 派生；演示项目直接生成并固化一个。
 */
const KEY = 'demo_local_participant_id';
const UUID_KEY = 'demo_local_participant_uuid';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    localStorage.setItem(KEY, code);
    return code;
  } catch {
    return 'DEMO01';
  }
}

/** 本设备 participantId（界面只读展示用） */
export function peekLocalParticipantId(): string | null {
  try {
    const adopted = localStorage.getItem(UUID_KEY);
    if (adopted) return adopted;
  } catch {
    /* ignore */
  }
  return `cust_demo_${makeCode().toLowerCase()}`;
}

/** 本设备 6 位码（同桌对齐用） */
export function getLocalDeviceCode(): string {
  return makeCode();
}

/** 对齐到指定设备 UUID 并持久化本机设备码 */
export function adoptServerDeviceUuid(targetUuid: string): boolean {
  const clean = String(targetUuid || '').trim();
  if (!clean) return false;
  try {
    localStorage.setItem(UUID_KEY, clean);
    const tailMatch = clean.match(/([a-z0-9]{6})$/i);
    if (tailMatch) {
      localStorage.setItem(KEY, tailMatch[1].toUpperCase());
    }
    return true;
  } catch {
    return false;
  }
}
