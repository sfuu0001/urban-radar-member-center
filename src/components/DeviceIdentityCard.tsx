import React, { useEffect, useState } from 'react';
import { Smartphone, Link2, Copy } from 'lucide-react';
import { peekLocalParticipantId } from '../utils/identityBinding';
import { findUuidByDeviceCode } from '../utils/deviceIdentity';
import { wbCloud } from '../utils/wbCloud';

/**
 * 设备身份卡片（阶段四配套 UI，2026-10-09）
 * ----------------------------------------------------------------------------
 * 解决两件事：
 *   ① 让本机身份**可见** —— 显示脱敏后的 uuid 与 6 位设备码，现场比对两台设备
 *      是不是同一个身份时不用再翻控制台。
 *   ② 提供**人工纠偏**入口 —— 自动撞车判定做不到 100%（两台同型号手机先后使用
 *      间隔 >30s 会被判成同一台），这时输入另一台设备显示的 6 位码，即可把本端
 *      身份强制对齐到那台设备。
 *
 * 安全约束：对齐动作会改写本机身份，因此**只允许在未加入任何桌台时执行** ——
 * 否则换 id 会让自己变成那桌的陌生人（本项目历史反复踩过的身份漂移坑）。
 */
export const DeviceIdentityCard: React.FC = () => {
  const [pid, setPid] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  /**
   * 是否已绑定桌台。对齐会改写本机身份，一旦已是某桌成员，换 id 会让自己在那桌
   * 变成陌生人 —— 因此就餐中直接禁用对齐（文案与行为必须一致，不能只是提示）。
   */
  const inSession = (() => {
    try {
      const raw = globalThis.localStorage?.getItem('obsidian_current_bound_table') || '';
      if (!raw) return false;
      return String(raw).length > 2; // 非空的绑定记录即视为在桌
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    const myPid = peekLocalParticipantId();
    if (!myPid) return;
    setPid(myPid);
    void (async () => {
      try {
        const { data } = await wbCloud.database
          .from('devices')
          .select('device_code')
          .eq('device_uuid', myPid)
          .limit(1);
        const code = String((data?.[0] as { device_code?: string } | undefined)?.device_code || '');
        if (code) setDeviceCode(code);
      } catch {
        /* 云端不可用时只显示 uuid，不影响页面 */
      }
    })();
  }, []);

  /** 脱敏：cust_local_xxxxxxxx… → cust_****xxxx */
  const masked = pid ? `${pid.slice(0, 5)}****${pid.slice(-4)}` : '尚未生成';

  const handleBind = async () => {
    if (inSession) {
      setMsg('已在同桌就餐中，暂不支持对齐（避免把自己变成陌生人）');
      return;
    }
    const code = String(input || '').trim().toUpperCase();
    if (code.length !== 6) {
      setMsg('请输入 6 位设备码');
      return;
    }
    if (code === deviceCode) {
      setMsg('这就是本机，无需对齐');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const target = await findUuidByDeviceCode(code);
      if (!target) {
        setMsg('未找到该设备码，请确认对方已打开过本页面');
        return;
      }
      const { adoptServerDeviceUuid } = await import('../utils/identityBinding');
      const ok = adoptServerDeviceUuid(target);
      if (!ok) {
        setMsg('对齐失败，请重试');
        return;
      }
      setMsg('已对齐，正在刷新…');
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setMsg('对齐失败，请检查网络');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-purpose="device-identity" className="w-full">
      <h3 className="text-base font-black tracking-tight text-neutral-900 mb-2">同桌身份</h3>
      <div className="bg-white/72 backdrop-blur-xl rounded-2xl ring-1 ring-black/[0.07] shadow-[0_12px_32px_-16px_rgba(17,24,39,0.3),inset_0_1px_0_rgba(255,255,255,0.85)] p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-bold text-neutral-900 tracking-tight">本机设备码</span>
          <span className="ml-auto font-mono text-[10px] text-neutral-400">{masked}</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-white/70 ring-1 ring-black/[0.08] rounded-lg px-3 py-2">
            <span className="font-mono text-lg font-black tracking-[0.3em] text-neutral-900">
              {deviceCode || '------'}
            </span>
          </div>
          {deviceCode && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(deviceCode).catch(() => {});
                setMsg('设备码已复制');
              }}
              className="p-2 rounded-lg border border-neutral-200 text-neutral-600 active:scale-95 transition"
              title="复制设备码"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="border-t border-neutral-100 pt-2.5">
          <p className="text-[10px] text-neutral-500 mb-2 leading-relaxed">
            同一台手机换浏览器打开时，若被认成两台设备，输入另一台显示的 6 位码即可对齐为同一人。
            <span className="text-neutral-400">（已在同桌就餐中时不支持对齐）</span>
          </p>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 6))}
              placeholder={inSession ? '就餐中不可对齐' : '输入 6 位设备码'}
              disabled={inSession}
              className="flex-1 bg-white/70 ring-1 ring-black/[0.08] rounded-lg px-3 py-2 font-mono text-sm tracking-widest outline-none focus:bg-white focus:ring-black/25 disabled:bg-black/[0.05] disabled:text-neutral-400"
            />
            <button
              type="button"
              onClick={handleBind}
              disabled={busy || input.length !== 6 || inSession}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                busy || input.length !== 6
                  ? 'bg-black/[0.06] text-neutral-400 cursor-not-allowed'
                  : 'bg-[#14181C] text-white shadow-[0_6px_16px_-9px_rgba(20,24,28,0.7)] active:scale-95'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              {busy ? '对齐中' : '对齐'}
            </button>
          </div>
          {msg && <p className="text-[10px] text-neutral-500 mt-1.5">{msg}</p>}
        </div>
      </div>
    </section>
  );
};
