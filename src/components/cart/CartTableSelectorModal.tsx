import React, { useState } from 'react';
import { X, QrCode, Users, Check, Clock } from 'lucide-react';
import type { BoundTableInfo, TableItem } from '../../types';
import { MOCK_DINING_TABLES } from '../../data/mockCart';

export interface CartTableSelectorModalProps {
  isOpen: boolean;
  currentTable: BoundTableInfo | null;
  dinerCount: number;
  onSelectTable: (table: BoundTableInfo, guests: number) => void;
  onClose: () => void;
}

type ZoneFilter = 'all' | 'patio' | 'hall' | 'booth';

export const CartTableSelectorModal: React.FC<CartTableSelectorModalProps> = ({
  isOpen,
  currentTable,
  dinerCount,
  onSelectTable,
  onClose
}) => {
  const [zone, setZone] = useState<ZoneFilter>('all');
  const [guests, setGuests] = useState<number>(dinerCount || 2);
  const [qrInput, setQrInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const filteredTables = MOCK_DINING_TABLES.filter((t) =>
    zone === 'all' ? true : t.zone === zone
  );

  const bindFromTableItem = (t: TableItem) => {
    const isWait = t.status === 'reserved' || t.code.startsWith('W');
    onSelectTable(
      {
        id: t.id,
        code: t.code,
        name: t.name,
        zone: isWait ? 'waiting' : t.zone,
        zoneLabel: t.zoneLabel,
        capacity: t.capacity,
        guests,
        serverName: t.serverName,
        isWaiting: isWait,
        waitingCode: isWait ? t.code : undefined
      },
      guests
    );
    onClose();
  };

  const handleQrBind = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = qrInput.trim().toUpperCase();
    if (!cleaned) return;
    const matched = MOCK_DINING_TABLES.find(
      (t) => t.code.toUpperCase() === cleaned || t.qrCode?.toUpperCase() === cleaned
    );
    if (!matched) {
      setErrorMsg('未识别该桌号或短码（可试填 A1 / B1 / A1-8F3K）');
      return;
    }
    setErrorMsg('');
    setQrInput('');
    bindFromTableItem(matched);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-[430px] bg-white/92 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-[0_24px_56px_-16px_rgba(20,20,19,0.28)] overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-2 bg-white/60">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-black text-[#141413]">堂食选桌与人数确认</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭选桌弹层"
            className="w-8 h-8 rounded-xl hover:bg-[#f4f4f5] flex items-center justify-center text-neutral-500 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {/* 扫码 / 短码快速绑桌 */}
          <form onSubmit={handleQrBind} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => {
                  setQrInput(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                placeholder="扫码或输入桌面短码 (如 A1-8F3K / B1)"
                className="flex-1 h-10 px-3 rounded-xl border border-black/[0.08] bg-[#f5f5f5]/90 focus:bg-white focus:border-emerald-600 font-mono text-xs uppercase outline-none transition"
              />
              <button
                type="submit"
                className="h-10 px-3.5 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold shrink-0 cursor-pointer transition active:scale-95"
              >
                扫码绑桌
              </button>
            </div>
            {errorMsg && <p className="text-[11px] text-red-600 font-medium">{errorMsg}</p>}
          </form>

          {/* 就餐人数选择器 */}
          <div className="flex items-center justify-between gap-2 py-2 border-y border-black/[0.06]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#141413]">
              <Users className="w-4 h-4 text-neutral-500" />
              <span>就餐人数</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGuests(n)}
                  className={`w-8 h-8 rounded-xl font-mono text-xs font-bold cursor-pointer transition ${
                    guests === n
                      ? 'bg-[#141413] text-white'
                      : 'border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-neutral-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 区域筛选 */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#f4f4f5]/90 border border-black/[0.05]">
            {(
              [
                { id: 'all', label: '全部区域' },
                { id: 'patio', label: '外摆区' },
                { id: 'hall', label: '吧台区' },
                { id: 'booth', label: '卡座' }
              ] as const
            ).map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZone(z.id)}
                className={`h-8 rounded-[10px] text-[11px] font-bold cursor-pointer transition ${
                  zone === z.id ? 'bg-white text-[#141413] shadow-2xs' : 'text-neutral-500 hover:text-[#141413]'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* 桌台矩阵 */}
          <div className="grid grid-cols-2 gap-2">
            {filteredTables.map((t) => {
              const isSelected = currentTable?.code === t.code;
              const isWaiting = t.status === 'reserved';
              const isBusy = t.status === 'dining';

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => bindFromTableItem(t)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-[#141413] bg-emerald-50/40'
                      : 'border-black/[0.07] bg-white/85 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-sm font-black text-[#141413]">
                      {t.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        isWaiting
                          ? 'text-amber-700'
                          : isBusy
                            ? 'text-neutral-500'
                            : 'text-emerald-700'
                      }`}
                    >
                      {isWaiting ? '等位号' : isBusy ? '同桌加菜' : '空闲可选'}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#141413] truncate">{t.name}</div>
                    <div className="text-[10px] text-neutral-500 flex items-center justify-between mt-0.5 tabular-nums">
                      <span>{t.zoneLabel} · {t.capacity}人座</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      {isBusy && !isSelected && (
                        <span className="inline-flex items-center gap-0.5 text-neutral-400">
                          <Clock className="w-2.5 h-2.5" />
                          {t.elapsedMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
