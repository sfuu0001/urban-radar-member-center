import React, { useState } from 'react';
import {
  ChevronDown,
  MoreHorizontal,
  Compass,
  ArrowLeftRight,
  RefreshCw,
  MessageSquare,
  SlidersHorizontal
} from 'lucide-react';
import type { ComputedFleetTruck, RadarSortMode } from '../../types/radar';

const SORT_LABELS: Record<RadarSortMode, string> = {
  distance: '时空近序',
  queue: '排队升序',
  open_time: '余量最长',
  min_order: '起送最低'
};

export interface RadarFleetListSectionProps {
  trucks: ComputedFleetTruck[];
  allTrucks: ComputedFleetTruck[];
  baselineTruckId: string;
  sortMode: RadarSortMode;
  avgFleetDistanceKm: number;
  onSetBaseline: (truckId: string) => void;
  onOpenDetails: (truck: ComputedFleetTruck) => void;
  onOpenPrepOrder: (truck: ComputedFleetTruck) => void;
  onOpenTransfer: (truck: ComputedFleetTruck) => void;
  onOpenSchedule: (truck: ComputedFleetTruck) => void;
  onRefreshTruck: (truck: ComputedFleetTruck) => void;
  onEnterCoopRoom: (truck: ComputedFleetTruck) => void;
}

export const RadarFleetListSection: React.FC<RadarFleetListSectionProps> = ({
  trucks,
  allTrucks,
  baselineTruckId,
  sortMode,
  avgFleetDistanceKm,
  onSetBaseline,
  onOpenDetails,
  onOpenPrepOrder,
  onOpenTransfer,
  onOpenSchedule,
  onRefreshTruck,
  onEnterCoopRoom
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const serviceCount = allTrucks.filter((t) => t.radarStatus === 'service').length;
  const collabCount = allTrucks.filter((t) => t.radarStatus === 'collaborative').length;
  const standbyCount = allTrucks.filter((t) => t.radarStatus === 'standby').length;
  const zeroQueueCount = allTrucks.filter((t) => t.isOpen && t.queueOrders === 0).length;
  const avgTicket = Math.round(
    allTrucks.reduce((sum, t) => sum + t.avgTicketPrice, 0) / Math.max(1, allTrucks.length)
  );

  return (
    <section aria-label="车队矩阵" className="space-y-2.5">
      {/* 矩阵顶栏 */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-xs font-black text-[#141413]">车队矩阵</h2>
        <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
          {trucks.length} 站 · {SORT_LABELS[sortMode]}
        </span>
      </div>

      {/* 空搜索/筛选提示 */}
      {trucks.length === 0 ? (
        <div className="bg-white/82 backdrop-blur-md rounded-2xl border border-black/[0.06] p-8 text-center space-y-1.5">
          <div className="text-xs font-bold text-[#141413]">未匹配到符合条件的餐车</div>
          <p className="text-[11px] text-neutral-500">请清空搜索关键词或切换状态筛选标签</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {trucks.map((truck) => {
            const isExpanded = expandedId === truck.id;
            const isBaseline = truck.id === baselineTruckId;
            const statusClass =
              truck.radarStatus === 'service'
                ? 'text-emerald-700'
                : truck.radarStatus === 'collaborative'
                  ? 'text-amber-700'
                  : 'text-neutral-400';

            const truncatedNotice =
              truck.latestChefNotice.message.length > 48
                ? `${truck.latestChefNotice.message.slice(0, 48)}...`
                : truck.latestChefNotice.message;

            return (
              <article
                key={truck.id}
                className={`bg-white/82 backdrop-blur-md rounded-2xl border transition ${
                  isBaseline
                    ? 'border-[#141413]/20 shadow-[0_6px_24px_-12px_rgba(20,20,19,0.14)]'
                    : 'border-black/[0.06] shadow-[0_4px_18px_-12px_rgba(20,20,19,0.09)]'
                } ${!truck.isOpen ? 'opacity-80' : ''}`}
              >
                {/* 卡片主触发区：点击展开或收起 */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId((prev) => (prev === truck.id ? null : truck.id));
                    setMenuOpenId(null);
                  }}
                  aria-expanded={isExpanded}
                  className="w-full p-3.5 text-left space-y-2 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                        <span className="font-mono font-bold text-[#141413]">{truck.code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{truck.district}</span>
                        {isBaseline && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-bold text-emerald-700">当前基准</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-[13px] font-extrabold text-[#141413] leading-snug mt-0.5 truncate">
                        {truck.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[11px] font-bold ${statusClass}`}>
                        {truck.radarStatusLabel}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-[#141413]' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* 主厨通告（收起态截断 48 字） */}
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    {isExpanded ? truck.latestChefNotice.message : truncatedNotice}
                  </p>

                  {/* 3 项关键指标 */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] font-mono tabular-nums border-t border-black/[0.05]">
                    <span className="text-[#141413] font-bold">
                      {isBaseline ? '0.00km 原点' : `${truck.distanceKm}km ${truck.bearingLabel}`}
                    </span>
                    <span aria-hidden="true" className="text-neutral-300">
                      ·
                    </span>
                    <span className={truck.queueOrders === 0 && truck.isOpen ? 'text-emerald-700 font-bold' : 'text-neutral-700'}>
                      排队 {truck.queueOrders} 单
                    </span>
                    <span aria-hidden="true" className="text-neutral-300">
                      ·
                    </span>
                    <span className="text-neutral-600">
                      {truck.isOpen ? `余量 ${truck.remainingOpenHours}h` : '休整中'}
                    </span>
                  </div>
                </button>

                {/* 展开细则与操作区 */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-2.5 border-t border-black/[0.06] space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
                      <span className="truncate">{truck.location}</span>
                      <button
                        type="button"
                        onClick={() => onOpenSchedule(truck)}
                        className="font-mono font-semibold text-[#141413] hover:text-emerald-700 underline underline-offset-2 shrink-0 cursor-pointer"
                      >
                        {truck.effectiveHours}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] bg-[#f4f4f5]/80 rounded-xl px-2.5 py-2 tabular-nums">
                      <div>
                        <div className="text-neutral-400">起送门槛</div>
                        <div className="font-mono font-bold text-[#141413]">¥{truck.minDeliveryAmount}</div>
                      </div>
                      <div>
                        <div className="text-neutral-400">覆盖范围</div>
                        <div className="font-mono font-bold text-[#141413]">
                          {truck.coverageRadiusKm}km ({truck.coverageAreaKm2}km²)
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral-400">均客单</div>
                        <div className="font-mono font-bold text-[#141413]">¥{truck.avgTicketPrice}</div>
                      </div>
                    </div>

                    {!truck.isOpen && truck.standbyReason && (
                      <div className="text-[11px] text-neutral-500">
                        状态说明：{truck.standbyReason}
                      </div>
                    )}

                    {/* 操作按钮条 */}
                    <div className="relative flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onOpenDetails(truck)}
                        className="flex-1 h-9 px-3 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-[11px] font-bold text-[#141413] inline-flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
                        <span>时空细则</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPrepOrder(truck)}
                        disabled={!truck.isOpen}
                        className="flex-1 h-9 px-3 rounded-xl bg-[#141413] hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-[11px] font-bold inline-flex items-center justify-center transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                      >
                        呼叫备餐
                      </button>

                      <button
                        type="button"
                        onClick={() => setMenuOpenId((m) => (m === truck.id ? null : truck.id))}
                        aria-label="更多操作"
                        aria-expanded={menuOpenId === truck.id}
                        className="w-9 h-9 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-[#141413] flex items-center justify-center shrink-0 transition cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* ••• 更多操作菜单 */}
                      {menuOpenId === truck.id && (
                        <div className="absolute right-0 bottom-[calc(100%+6px)] w-44 rounded-2xl bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_18px_40px_-12px_rgba(20,20,19,0.22)] p-1.5 space-y-0.5 z-30 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => {
                              onSetBaseline(truck.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-[#141413] hover:bg-[#f4f4f5] flex items-center gap-2 cursor-pointer"
                          >
                            <Compass className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isBaseline ? '已是当前基准' : '设为基准'}</span>
                          </button>

                          {truck.radarStatus === 'collaborative' && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenTransfer(truck);
                                setMenuOpenId(null);
                              }}
                              className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-[#141413] hover:bg-[#f4f4f5] flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                              <span>协同转单</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onEnterCoopRoom(truck);
                              setMenuOpenId(null);
                            }}
                            className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-[#141413] hover:bg-[#f4f4f5] flex items-center gap-2 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                            <span>协同聊天房间</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onRefreshTruck(truck);
                              setMenuOpenId(null);
                            }}
                            className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-[#141413] hover:bg-[#f4f4f5] flex items-center gap-2 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                            <span>刷新数据</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* 车队运营统计卡 */}
      <div className="bg-white/82 backdrop-blur-md rounded-2xl border border-black/[0.06] shadow-[0_6px_24px_-12px_rgba(20,20,19,0.1)] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black text-[#141413]">车队运营统计</span>
          <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
            共 {allTrucks.length} 辆调度节点
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-[11px] tabular-nums">
          <div>
            <div className="text-neutral-400">服务 / 协同</div>
            <div className="font-mono font-extrabold text-[#141413]">
              {serviceCount} / {collabCount}
            </div>
          </div>
          <div>
            <div className="text-neutral-400">暂停打烊</div>
            <div className="font-mono font-extrabold text-neutral-500">{standbyCount} 台</div>
          </div>
          <div>
            <div className="text-neutral-400">零排队 / 均距</div>
            <div className="font-mono font-extrabold text-emerald-700">
              {zeroQueueCount} 台 · {avgFleetDistanceKm}km
            </div>
          </div>
          <div>
            <div className="text-neutral-400">均位客单</div>
            <div className="font-mono font-extrabold text-[#141413]">¥{avgTicket}</div>
          </div>
        </div>
      </div>
    </section>
  );
};
