/**
 * 设备指纹替身：返回稳定的假指纹（演示项目不做真实硬件采样）。
 * 字段形状与原实现保持一致，UserAuthModal 的展示逻辑无需改动。
 */
export interface DeviceHardwareDetails {
  hardwareHash?: string;
  gpuRenderer?: string;
  canvasHash: string;
  webglVendor: string;
  webglRenderer: string;
  audioDspHash: string;
  screen: { width: number; height: number; depth: number };
  hardware: { cores: number; memoryGB: number; platform: string; languages: string[] };
  timezone: string;
  collectedAt: string;
}

const fake = (seed: string, len = 16): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let out = '';
  let v = h >>> 0;
  while (out.length < len) {
    out += v.toString(16).padStart(8, '0');
    v = Math.imul(v ^ (v >>> 7), 0x2545f491) >>> 0;
  }
  return out.slice(0, len);
};

export async function collectDeviceHardwareDetails(): Promise<DeviceHardwareDetails> {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  const scr = typeof screen !== 'undefined' ? screen : ({ width: 430, height: 932, colorDepth: 24 } as Screen);
  const seed = `${scr.width}x${scr.height}|${nav.platform || 'demo'}|${nav.language || 'zh-CN'}`;
  return {
    hardwareHash: getDemoDeviceHash(),
    gpuRenderer: 'Demo Renderer',
    canvasHash: fake(seed + '|canvas'),
    webglVendor: 'Demo Vendor',
    webglRenderer: 'Demo Renderer',
    audioDspHash: fake(seed + '|audio'),
    screen: { width: scr.width, height: scr.height, depth: scr.colorDepth },
    hardware: {
      cores: (nav as { hardwareConcurrency?: number }).hardwareConcurrency ?? 4,
      memoryGB: (nav as { deviceMemory?: number }).deviceMemory ?? 4,
      platform: nav.platform || 'demo',
      languages: [nav.language || 'zh-CN']
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    collectedAt: new Date().toISOString()
  };
}

/** 简化的设备哈希（原版由多维特征派生） */
export function getDemoDeviceHash(): string {
  return `HW-DEMO-${fake('demo-device-seed', 12).toUpperCase()}`;
}
