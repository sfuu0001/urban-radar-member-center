/**
 * 身份绑定替身：本设备码（同桌点餐用的 6 位码）。
 * 原版从 localStorage 的 participantId 派生；演示项目直接生成并固化一个。
 */
const KEY = 'demo_local_participant_id';

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
  return `cust_demo_${makeCode().toLowerCase()}`;
}

/** 本设备 6 位码（同桌对齐用） */
export function getLocalDeviceCode(): string {
  return makeCode();
}
