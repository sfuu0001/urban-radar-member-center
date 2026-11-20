/**
 * 设备码反查替身：原版查云端 device_identity 表；
 * 演示项目无云端，按前缀规则本地自洽返回。
 */
export async function findUuidByDeviceCode(code: string): Promise<string | null> {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) return null;
  return `cust_demo_${normalized.toLowerCase()}`;
}
