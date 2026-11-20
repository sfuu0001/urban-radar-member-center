import React from 'react';
import { MapPin, Navigation, Edit3, Store, QrCode, Zap, Clock } from 'lucide-react';
import type { BoundTableInfo, DiningMode, UserAddress } from '../../types';
import { CURRENT_TRUCK_SUMMARY } from '../../data/mockCart';

export interface CartDeliveryCardProps {
  diningMode: DiningMode;
  selectedAddress: UserAddress | null;
  boundTable: BoundTableInfo | null;
  dinerCount: number;
  isVIPActive: boolean;
  onChangeAddress: () => void;
  onOpenTableSelector: () => void;
}

export const CartDeliveryCard: React.FC<CartDeliveryCardProps> = ({
  diningMode,
  selectedAddress,
  boundTable,
  dinerCount,
  isVIPActive,
  onChangeAddress,
  onOpenTableSelector
}) => {
  return (
    <section
      aria-label="配送与履约路径详情"
      className="bg-white/82 backdrop-blur-md rounded-2xl border border-black/[0.06] shadow-[0_6px_24px_-12px_rgba(20,20,19,0.1)] p-3.5 space-y-3"
    >
      {/* Card Top Line */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/[0.06]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider shrink-0">
            {diningMode === 'delivery'
              ? '配送路径'
              : diningMode === 'pickup'
                ? '餐车自提'
                : '堂食餐位'}
          </span>
          <span aria-hidden="true" className="text-neutral-300">
            ·
          </span>
          <span className="text-xs font-bold text-[#141413] truncate">
            {CURRENT_TRUCK_SUMMARY.name}
          </span>
        </div>

        {isVIPActive && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg obsidian-mesh text-[10px] font-bold text-amber-300 whitespace-nowrap shrink-0 border border-white/10">
            <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
            <span>VIP 优先制作</span>
          </span>
        )}
      </div>

      {/* Mode Specific Body */}
      {diningMode === 'delivery' && (
        <div className="relative pl-6 space-y-3.5">
          {/* Vertical Route Rail */}
          <span
            aria-hidden="true"
            className="absolute left-[9px] top-3 bottom-7 w-px border-l border-dashed border-neutral-300"
          />

          {/* Origin Truck Point */}
          <div className="relative flex items-start justify-between gap-2">
            <span
              aria-hidden="true"
              className="absolute -left-6 top-0.5 w-5 h-5 rounded-md bg-[#f4f4f5] border border-black/[0.08] text-[#141413] flex items-center justify-center"
            >
              <Navigation className="w-2.5 h-2.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-neutral-500">起送点 · 餐车实时停泊</div>
              <div className="text-xs font-bold text-[#141413] mt-0.5 tabular-nums">
                {CURRENT_TRUCK_SUMMARY.location} · 直距 {CURRENT_TRUCK_SUMMARY.distanceMeters}m
              </div>
            </div>
            <div className="text-[11px] font-mono text-emerald-700 font-bold shrink-0 tabular-nums">
              约 {CURRENT_TRUCK_SUMMARY.etaMinutes}m
            </div>
          </div>

          {/* Destination Receiver Address */}
          <div className="relative flex items-start justify-between gap-2.5 pt-2.5 border-t border-black/[0.05]">
            <span
              aria-hidden="true"
              className="absolute -left-6 top-3 w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-2xs"
            >
              <MapPin className="w-3 h-3" />
            </span>

            {selectedAddress ? (
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-emerald-700">
                    [{selectedAddress.tag}]
                  </span>
                  <span className="text-xs font-extrabold text-[#141413] break-words">
                    {selectedAddress.address}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-600">
                  {selectedAddress.detail}
                </div>
                <div className="text-[11px] text-neutral-400 tabular-nums">
                  {selectedAddress.name} · {selectedAddress.phone} · 备注：放前台即可
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-500">尚未选择收货地址，请点击右侧修改</div>
            )}

            <button
              type="button"
              onClick={onChangeAddress}
              className="h-8 px-2.5 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-[11px] font-bold text-[#141413] inline-flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3 h-3 text-neutral-500" />
              <span>修改</span>
            </button>
          </div>
        </div>
      )}

      {diningMode === 'pickup' && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#f4f4f5] border border-black/[0.06] text-[#141413] flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="text-xs font-extrabold text-[#141413]">
                {CURRENT_TRUCK_SUMMARY.location} · 1 号取餐口
              </div>
              <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{CURRENT_TRUCK_SUMMARY.pickupWindow} · 凭取餐核对码到车直接领取</span>
              </div>
              <div className="text-[11px] text-neutral-400 tabular-nums">
                直距餐车 {CURRENT_TRUCK_SUMMARY.distanceMeters}m · 无需收货地址
              </div>
            </div>
          </div>
        </div>
      )}

      {diningMode === 'dine_in' && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                boundTable
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <QrCode className="w-4 h-4" />
            </div>
            {boundTable ? (
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-[#141413] tabular-nums">
                    {boundTable.code} 号桌
                  </span>
                  <span className="text-xs font-semibold text-neutral-600">
                    {boundTable.zoneLabel}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 tabular-nums">
                  {boundTable.name} · 当前 {dinerCount} 位就餐 · {boundTable.serverName || '主理人派餐'}
                </div>
              </div>
            ) : (
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-extrabold text-amber-800">
                  尚未绑定堂食桌台
                </div>
                <div className="text-[11px] text-neutral-500">
                  请先扫码或选择桌台，以便餐车精准派餐
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenTableSelector}
            className={`h-9 px-3 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer ${
              boundTable
                ? 'border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-[#141413]'
                : 'bg-[#141413] hover:bg-neutral-800 text-white'
            }`}
          >
            {boundTable ? '换桌 / 改人数' : '立即选桌'}
          </button>
        </div>
      )}
    </section>
  );
};
