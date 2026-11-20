import React from 'react';
import { ArrowLeft, Copy, Trash2, Truck, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import type { DiningMode } from '../../types';

export interface CartHeaderSectionProps {
  itemCount: number;
  diningMode: DiningMode;
  onChangeDiningMode: (mode: DiningMode) => void;
  onBack: () => void;
  onCopyList: () => void;
  onRequestClear: () => void;
  stickyClassName?: string;
}

const MODE_TABS: ReadonlyArray<{
  id: DiningMode;
  label: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  { id: 'delivery', label: '外卖', Icon: Truck },
  { id: 'dine_in', label: '堂食', Icon: UtensilsCrossed },
  { id: 'pickup', label: '自提', Icon: ShoppingBag }
];

export const CartHeaderSection: React.FC<CartHeaderSectionProps> = ({
  itemCount,
  diningMode,
  onChangeDiningMode,
  onBack,
  onCopyList,
  onRequestClear,
  stickyClassName = ''
}) => {
  return (
    <>
      <header
        className={`w-full bg-white/85 backdrop-blur-md border-b border-black/[0.06] px-3 py-2 ${stickyClassName}`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="返回菜单"
              title="返回菜单"
              className="w-10 h-10 rounded-xl bg-white/90 border border-black/[0.08] shadow-[0_1px_2px_rgba(20,20,19,0.04)] hover:bg-neutral-50 flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-[18px] h-[18px] text-[#141413]" strokeWidth={2.1} />
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-[16px] font-black tracking-tight text-[#141413] leading-none whitespace-nowrap">
                餐车选购清单
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-mono font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                {itemCount}件
              </span>
            </div>
          </div>

          {/* 紧凑毛玻璃工具槽 */}
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#f4f4f5]/90 backdrop-blur-sm border border-black/[0.05] shrink-0">
            <button
              type="button"
              onClick={onCopyList}
              disabled={itemCount === 0}
              title="复制清单发送好友"
              aria-label="复制清单"
              className="w-9 h-9 rounded-[10px] hover:bg-white/90 disabled:opacity-40 text-neutral-700 flex items-center justify-center transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRequestClear}
              disabled={itemCount === 0}
              title="清空清单"
              aria-label="清空清单"
              className="h-9 px-2.5 rounded-[10px] hover:bg-white/90 hover:text-red-600 disabled:opacity-40 text-[11px] font-bold text-neutral-600 inline-flex items-center gap-1 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空</span>
            </button>
          </div>
        </div>
      </header>

      {/* 紧凑三选一履约切换条（内容自适应宽度，毛玻璃胶囊槽） */}
      <div className="self-start w-fit mx-3.5 mt-2.5">
        <div
          role="tablist"
          aria-label="履约方式切换"
          className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#f4f4f5]/85 backdrop-blur-md border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(20,20,19,0.08)]"
        >
          {MODE_TABS.map(({ id, label, Icon }) => {
            const active = diningMode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeDiningMode(id)}
                className={`h-8 px-3 rounded-[10px] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  active
                    ? 'bg-[#141413] text-white shadow-[0_2px_8px_-2px_rgba(20,20,19,0.3)]'
                    : 'text-neutral-600 hover:text-[#141413] hover:bg-white/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-400' : 'text-neutral-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
