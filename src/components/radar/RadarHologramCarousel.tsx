import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  SlidersHorizontal,
  ArrowLeftRight,
  Compass
} from 'lucide-react';
import type { ComputedFleetTruck } from '../../types/radar';

export interface RadarHologramCarouselProps {
  trucks: ComputedFleetTruck[];
  baselineTruckId: string;
  onSetBaseline: (truckId: string) => void;
  onOpenDetails: (truck: ComputedFleetTruck) => void;
  onOpenPrepOrder: (truck: ComputedFleetTruck) => void;
  onOpenTransfer: (truck: ComputedFleetTruck) => void;
  onOpenSchedule: (truck: ComputedFleetTruck) => void;
}

export const RadarHologramCarousel: React.FC<RadarHologramCarouselProps> = ({
  trucks,
  baselineTruckId,
  onSetBaseline,
  onOpenDetails,
  onOpenPrepOrder,
  onOpenTransfer,
  onOpenSchedule
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (trucks.length === 0) {
    return (
      <div className="bg-white/82 backdrop-blur-md rounded-2xl border border-black/[0.06] p-8 text-center space-y-1.5">
        <div className="text-xs font-bold text-[#141413]">全息矩阵暂无匹配站台</div>
        <p className="text-[11px] text-neutral-500">请重置筛选或搜索关键词</p>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, trucks.length - 1);
  const truck = trucks[safeIndex];
  const isBaseline = truck.id === baselineTruckId;

  const goPrev = () => setActiveIndex((idx) => (idx - 1 + trucks.length) % trucks.length);
  const goNext = () => setActiveIndex((idx) => (idx + 1) % trucks.length);

  return (
    <section
      aria-label="全息矩阵旋转木马视图"
      className="space-y-3"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (delta > 45) goPrev();
        else if (delta < -45) goNext();
      }}
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-xs font-black text-[#141413]">全息矩阵 · 单站聚焦</span>
        <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
          {safeIndex + 1} / {trucks.length}
        </span>
      </div>

      {/* 主聚焦全息卡片 */}
      <article className="bg-white/88 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_14px_38px_-14px_rgba(20,20,19,0.16)] overflow-hidden">
        <div className="obsidian-mesh text-white p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
                <span className="font-mono font-bold text-amber-300">{truck.code}</span>
                <span aria-hidden="true">·</span>
                <span>{truck.district}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    truck.radarStatus === 'service'
                      ? 'text-emerald-300 font-bold'
                      : truck.radarStatus === 'collaborative'
                        ? 'text-amber-300 font-bold'
                        : 'text-neutral-400 font-bold'
                  }
                >
                  {truck.radarStatusLabel}
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white mt-0.5 truncate">
                {truck.name}
              </h3>
              <div className="text-[11px] text-neutral-300 mt-0.5 truncate">{truck.location}</div>
            </div>

            <button
              type="button"
              onClick={() => onOpenSchedule(truck)}
              className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-neutral-100 inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Clock className="w-3 h-3 text-amber-300" />
              <span>{truck.effectiveHours}</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-xl bg-white/[0.08] border border-white/10 p-2">
              <div className="text-[10px] font-mono text-neutral-400">DIST</div>
              <div className="font-mono text-xs font-black text-white tabular-nums mt-0.5">
                {isBaseline ? '基准' : `${truck.distanceKm}km`}
              </div>
              <div className="text-[9px] text-neutral-300 truncate">{truck.bearingLabel}</div>
            </div>
            <div className="rounded-xl bg-white/[0.08] border border-white/10 p-2">
              <div className="text-[10px] font-mono text-neutral-400">QUEUE</div>
              <div className="font-mono text-xs font-black text-white tabular-nums mt-0.5">
                {truck.queueOrders} 单
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.08] border border-white/10 p-2">
              <div className="text-[10px] font-mono text-neutral-400">OPEN</div>
              <div className="font-mono text-xs font-black text-emerald-300 tabular-nums mt-0.5">
                {truck.isOpen ? `${truck.remainingOpenHours}h` : '打烊'}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.08] border border-white/10 p-2">
              <div className="text-[10px] font-mono text-neutral-400">MIN</div>
              <div className="font-mono text-xs font-black text-white tabular-nums mt-0.5">
                ¥{truck.minDeliveryAmount}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 space-y-3">
          <div className="text-xs text-neutral-600 leading-relaxed">
            {truck.latestChefNotice.message}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenDetails(truck)}
              className="flex-1 h-9 px-3 rounded-xl border border-black/[0.08] bg-white hover:bg-[#f4f4f5] text-[11px] font-bold text-[#141413] inline-flex items-center justify-center gap-1 cursor-pointer transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>时空细则</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPrepOrder(truck)}
              disabled={!truck.isOpen}
              className="flex-1 h-9 px-3 rounded-xl bg-[#141413] hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-[11px] font-bold inline-flex items-center justify-center cursor-pointer transition disabled:cursor-not-allowed"
            >
              呼叫备餐
            </button>

            {truck.radarStatus === 'collaborative' && (
              <button
                type="button"
                onClick={() => onOpenTransfer(truck)}
                className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white hover:bg-[#f4f4f5] text-[11px] font-bold text-[#141413] inline-flex items-center gap-1 cursor-pointer transition"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                <span>协同转单</span>
              </button>
            )}

            {!isBaseline && (
              <button
                type="button"
                onClick={() => onSetBaseline(truck.id)}
                className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white hover:bg-[#f4f4f5] text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1 cursor-pointer transition"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>设为基准</span>
              </button>
            )}
          </div>
        </div>
      </article>

      {/* 左右箭头与圆点导航 */}
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={goPrev}
          aria-label="上一台餐车"
          className="w-9 h-9 rounded-xl bg-white/85 backdrop-blur-md border border-black/[0.07] hover:bg-white flex items-center justify-center text-[#141413] cursor-pointer transition active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {trucks.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`切换至 ${t.code} ${t.district}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === safeIndex ? 'w-5 bg-[#141413]' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          aria-label="下一台餐车"
          className="w-9 h-9 rounded-xl bg-white/85 backdrop-blur-md border border-black/[0.07] hover:bg-white flex items-center justify-center text-[#141413] cursor-pointer transition active:scale-95"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
