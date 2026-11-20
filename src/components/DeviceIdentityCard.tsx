import React, { useEffect, useState } from 'react';
import { Smartphone, Link2, Copy, Check } from 'lucide-react';
import {
  peekLocalParticipantId,
  getLocalDeviceCode,
  adoptServerDeviceUuid
} from '../utils/identityBinding';
import { findUuidByDeviceCode } from '../utils/deviceIdentity';
import { wbCloud } from '../utils/wbCloud';

/**
 * 设备身份卡片
 * - 展示脱敏后的本机标识与 6 位设备码（云端不可用时自动回退本地生成码）
 * - 支持输入其他设备的 6 位码进行跨端身份对齐
 */
export const DeviceIdentityCard: React.FC = () => {
  const [pid, setPid] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const inSession = (() => {
    try {
      const raw = globalThis.localStorage?.getItem('obsidian_current_bound_table') || '';
      if (!raw) return false;
      return String(raw).length > 2;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    const myPid = peekLocalParticipantId();
    const fallbackCode = getLocalDeviceCode();
    if (myPid) setPid(myPid);
    setDeviceCode(fallbackCode);

    if (!myPid) return;
    void (async () => {
      try {
        const { data } = await wbCloud.database
          .from('devices')
          .select('device_code')
          .eq('device_uuid', myPid)
          .limit(1);
        const code = String(
          (data?.[0] as { device_code?: string } | undefined)?.device_code || ''
        );
        if (code) setDeviceCode(code);
      } catch {
        /* 保持本地设备码兜底 */
      }
    })();
  }, []);

  const masked = pid ? `${pid.slice(0, 5)}****${pid.slice(-4)}` : '尚未生成';

  const handleBind = async () => {
    if (inSession) {
      setMsg('已在同桌就餐中，暂不支持对齐');
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
        setMsg('未找到该设备码，请确认输入正确');
        return;
      }
      const ok = adoptServerDeviceUuid(target);
      if (!ok) {
        setMsg('对齐失败，请重试');
        return;
      }
      setPid(target);
      setDeviceCode(code);
      setInput('');
      setMsg('已对齐为同一身份');
    } catch {
      setMsg('对齐失败，请检查网络');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (!deviceCode) return;
    void navigator.clipboard?.writeText(deviceCode).catch(() => {});
    setCopied(true);
    setMsg('设备码已复制');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section
      data-purpose="device-identity"
      className="w-full bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(15,23,42,0.06)] p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-100 text-[#0f172a] flex items-center justify-center">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-extrabold text-[#0f172a] leading-snug">同桌设备身份</h3>
            <p className="text-[11px] text-neutral-400">同台跨浏览器点餐对齐识别码</p>
          </div>
        </div>
        <span className="font-mono text-[11px] text-neutral-400 tabular-nums">{masked}</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-neutral-50 border border-black/[0.06] rounded-xl px-3.5 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-neutral-400">本机码</span>
          <span className="font-mono text-base font-black tracking-[0.28em] text-[#0f172a] tabular-nums">
            {deviceCode || 'DEMO01'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="复制设备码"
          title="复制设备码"
          className="w-11 h-11 rounded-xl border border-black/[0.08] bg-white hover:bg-neutral-50 text-neutral-700 flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="border-t border-black/[0.05] pt-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 6))}
            placeholder={inSession ? '就餐中不可对齐' : '输入另一台设备的 6 位码'}
            disabled={inSession}
            className="flex-1 h-10 bg-neutral-50 border border-black/[0.07] rounded-xl px-3 font-mono text-xs tracking-widest outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:bg-neutral-100 disabled:text-neutral-400"
          />
          <button
            type="button"
            onClick={handleBind}
            disabled={busy || input.length !== 6 || inSession}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shrink-0 ${
              busy || input.length !== 6 || inSession
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : 'bg-[#0f172a] hover:bg-neutral-800 text-white cursor-pointer active:scale-95'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{busy ? '对齐中' : '对齐'}</span>
          </button>
        </div>
        {msg && <p className="text-[11px] text-emerald-700 font-medium mt-2">{msg}</p>}
      </div>
    </section>
  );
};
