import React from 'react';
import { Clock, ChefHat, MapPin } from 'lucide-react';
import type { ComputedFleetTruck, NetworkTelemetrySnapshot } from '../../types/radar';

export interface RadarBaselineDeckProps {
  baselineTruck: ComputedFleetTruck;
  activeTrucksCount: number;
  avgFleetDistanceKm: number;
  zeroQueueRatioPercent: number;
  networkTelemetry: NetworkTelemetrySnapshot;
  onOpenSchedule: (truck: ComputedFleetTruck) => void;
  onOpenPrepOrder: (truck: ComputedFleetTruck) => void;
  onOpenDetails: (truck: ComputedFleetTruck) => void;
}

export const RadarBaselineDeck: React.FC<RadarBaselineDeckProps> = ({
  baselineTruck,
  activeTrucksCount,
  avgFleetDistanceKm,
  zeroQueueRatioPercent,
  networkTelemetry,
  onOpenSchedule,
  onOpenPrepOrder,
  onOpenDetails
}) => {
  const statusTone =
    baselineTruck.radarStatus === 'service'
      ? 'text-emerald-300'
      : baselineTruck.radarStatus === 'collaborative'
        ? 'text-amber-300'
        : 'text-neutral-400';

  return (
    <section
      aria-label="基准指挥台"
      className="obsidian-mesh rounded-2xl border border-white/10 shadow-black-card text-white p-3.5 space-y-3"
    >
      {/* 顶部标题行 + 营业时间流转入口 */}
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenDetails(baselineTruck)}
          className="min-w-0 text-left group cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300">
            <span className="font-mono text-amber-300 font-bold">{baselineTruck.code}</span>
            <span aria-hidden="true">·</span>
            <span>基准指挥台</span>
            <span aria-hidden="true">·</span>
            <span className={statusTone}>{baselineTruck.radarStatusLabel}</span>
          </div>
          <h2 className="text-sm font-black tracking-tight text-white mt-0.5 truncate group-hover:text-emerald-300 transition">
            {baselineTruck.name}
          </h2>
          <div className="text-[11px] text-neutral-300/90 mt-0.5 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">
              {baselineTruck.district} · {baselineTruck.effectiveHours}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenSchedule(baselineTruck)}
          title="查看营业时间流转"
          className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-neutral-100 inline-flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer"
        >
          <Clock className="w-3 h-3 text-amber-300" />
          <span>时段流转</span>
        </button>
      </div>

      {/* 四项核心指标 */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="rounded-xl bg-white/[0.07] border border-white/10 px-2 py-2">
          <div className="text-[10px] font-mono text-neutral-400">QUEUE</div>
          <div className="font-mono text-sm font-black text-white tabular-nums mt-0.5">
            {baselineTruck.queueOrders}
            <span className="text-[10px] font-semibold text-neutral-300 ml-0.5">单</span>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.07] border border-white/10 px-2 py-2">
          <div className="text-[10px] font-mono text-neutral-400">OPEN</div>
          <div className="font-mono text-sm font-black text-emerald-300 tabular-nums mt-0.5">
            {baselineTruck.isOpen ? `${baselineTruck.remainingOpenHours}h` : '休整'}
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.07] border border-white/10 px-2 py-2">
          <div className="text-[10px] font-mono text-neutral-400">MIN</div>
          <div className="font-mono text-sm font-black text-white tabular-nums mt-0.5">
            ¥{baselineTruck.minDeliveryAmount}
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.07] border border-white/10 px-2 py-2">
          <div className="text-[10px] font-mono text-neutral-400">RADIUS</div>
          <div className="font-mono text-sm font-black text-white tabular-nums mt-0.5">
            {baselineTruck.coverageRadiusKm}
            <span className="text-[10px] font-semibold text-neutral-300 ml-0.5">km</span>
          </div>
          <div className="text-[9px] font-mono text-neutral-400 tabular-nums leading-tight">
            {baselineTruck.coverageAreaKm2}km²
          </div>
        </div>
      </div>

      {/* 主厨通告行 + 呼叫备餐 */}
      <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 flex items-center justify-between gap-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <ChefHat className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-200 leading-snug line-clamp-2">
            {baselineTruck.latestChefNotice.message}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenPrepOrder(baselineTruck)}
          disabled={!baselineTruck.isOpen}
          className="h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-neutral-400 text-[#141413] text-[11px] font-black whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          呼叫备餐
        </button>
      </div>

      {/* 底部实时指标 */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-neutral-300/90 tabular-nums pt-0.5">
        <span>在岗 {activeTrucksCount} 台</span>
        <span aria-hidden="true">·</span>
        <span>均距 {avgFleetDistanceKm}km</span>
        <span aria-hidden="true">·</span>
        <span>
          时效 {networkTelemetry.rttMs}ms
          {networkTelemetry.source === 'navigator.connection' ? '' : ' (预估)'}
        </span>
        <span aria-hidden="true">·</span>
        <span>零排队 {zeroQueueRatioPercent}%</span>
      </div>
    </section>
  );
};
