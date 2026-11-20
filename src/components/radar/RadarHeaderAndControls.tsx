import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Layers,
  ChevronDown,
  ArrowUpDown,
  RefreshCw,
  Compass,
  Check
} from 'lucide-react';
import type {
  ComputedFleetTruck,
  RadarFilterTab,
  RadarSortMode,
  RadarViewLayout
} from '../../types/radar';

const SORT_OPTIONS: ReadonlyArray<{ id: RadarSortMode; label: string }> = [
  { id: 'distance', label: '时空近序' },
  { id: 'queue', label: '排队升序' },
  { id: 'open_time', label: '余量最长' },
  { id: 'min_order', label: '起送最低' }
];

/* ==================== 1. 顶部工具条 ==================== */
export interface RadarHeaderBarProps {
  activeCount: number;
  totalCount: number;
  searchQuery: string;
  onChangeSearch: (val: string) => void;
  layoutMode: RadarViewLayout;
  onToggleLayout: () => void;
  onBack: () => void;
  stickyClassName?: string;
}

export const RadarHeaderBar: React.FC<RadarHeaderBarProps> = ({
  activeCount,
  totalCount,
  searchQuery,
  onChangeSearch,
  layoutMode,
  onToggleLayout,
  onBack,
  stickyClassName = 'sticky top-0 z-30'
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  const targetLayoutTip =
    layoutMode === 'list' ? '切换至全息矩阵视图' : '切换至车队列表视图';

  return (
    <header
      className={`w-full bg-white/85 backdrop-blur-md border-b border-black/[0.06] px-3 py-2 ${stickyClassName}`}
    >
      <div className="max-w-5xl mx-auto space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="返回点餐"
              title="返回点餐"
              className="w-10 h-10 rounded-xl bg-white/90 border border-black/[0.08] shadow-[0_1px_2px_rgba(20,20,19,0.04)] hover:bg-neutral-50 flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-[18px] h-[18px] text-[#141413]" strokeWidth={2.1} />
            </button>

            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-[16px] font-black tracking-tight text-[#141413] leading-none whitespace-nowrap">
                餐车
              </h1>
              <span className="text-[11px] font-mono text-neutral-500 tabular-nums whitespace-nowrap">
                {activeCount}/{totalCount} 在岗
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#f4f4f5]/90 backdrop-blur-sm border border-black/[0.05] shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((p) => !p)}
              aria-label="搜索餐车"
              aria-expanded={searchOpen}
              title="按编号 / 商圈 / 菜品搜索"
              className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition active:scale-95 cursor-pointer ${
                searchOpen || searchQuery
                  ? 'bg-white text-[#141413] shadow-[0_1px_3px_rgba(20,20,19,0.08)]'
                  : 'text-neutral-600 hover:bg-white/80 hover:text-[#141413]'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleLayout}
              aria-label={targetLayoutTip}
              title={targetLayoutTip}
              className={`h-9 px-2.5 rounded-[10px] flex items-center gap-1.5 text-[11px] font-bold transition active:scale-95 cursor-pointer ${
                layoutMode === 'hologram'
                  ? 'bg-[#141413] text-white'
                  : 'text-neutral-700 hover:bg-white/80 hover:text-[#141413]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                {layoutMode === 'list' ? '全息' : '列表'}
              </span>
            </button>
          </div>
        </div>

        {(searchOpen || searchQuery) && (
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-[#f4f4f5]/90 border border-black/[0.07] focus-within:bg-white focus-within:border-emerald-600 transition animate-in fade-in">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="匹配编号 (#01)、商圈 (静安/陆家嘴) 或菜品..."
              className="flex-1 bg-transparent text-xs text-[#141413] placeholder:text-neutral-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearch('')}
                aria-label="清空搜索"
                className="w-6 h-6 rounded-lg hover:bg-neutral-200/70 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

/* ==================== 2. 控制条 (基准选择 / 排序 / 重新巡检) ==================== */
export interface RadarControlStripProps {
  fleet: ComputedFleetTruck[];
  baselineTruckId: string;
  onSelectBaseline: (truckId: string) => void;
  sortMode: RadarSortMode;
  onChangeSort: (mode: RadarSortMode) => void;
  isRefreshing: boolean;
  onRefreshPatrol: () => void;
}

export const RadarControlStrip: React.FC<RadarControlStripProps> = ({
  fleet,
  baselineTruckId,
  onSelectBaseline,
  sortMode,
  onChangeSort,
  isRefreshing,
  onRefreshPatrol
}) => {
  const [openMenu, setOpenMenu] = useState<'baseline' | 'sort' | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (stripRef.current && !stripRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [openMenu]);

  const currentBaseline = fleet.find((t) => t.id === baselineTruckId) || fleet[0];
  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sortMode)?.label || '时空近序';

  return (
    <div ref={stripRef} className="relative flex items-center gap-1.5 z-20">
      {/* 1. 基准选择器 */}
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'baseline' ? null : 'baseline'))}
          aria-expanded={openMenu === 'baseline'}
          className="w-full h-9 px-2.5 rounded-xl bg-white/85 backdrop-blur-md border border-black/[0.07] hover:bg-white text-left flex items-center justify-between gap-1.5 transition cursor-pointer shadow-[0_2px_8px_-4px_rgba(20,20,19,0.08)]"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Compass className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-[11px] font-bold text-[#141413] truncate">
              基准 {currentBaseline?.code} {currentBaseline?.district}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform ${
              openMenu === 'baseline' ? 'rotate-180 text-[#141413]' : ''
            }`}
          />
        </button>

        {openMenu === 'baseline' && (
          <div className="absolute left-0 top-[calc(100%+6px)] w-64 rounded-2xl bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_18px_40px_-12px_rgba(20,20,19,0.22)] p-1.5 space-y-0.5 z-40 animate-in fade-in">
            {fleet.map((t) => {
              const isBase = t.id === baselineTruckId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectBaseline(t.id);
                    setOpenMenu(null);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                    isBase
                      ? 'bg-[#f4f4f5] text-[#141413]'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {t.code} {t.district}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      {t.isOpen ? t.effectiveHours : '暂停打烊'} · {t.radarStatusLabel}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold shrink-0">
                    {isBase ? (
                      <span className="text-emerald-700 inline-flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        当前基准
                      </span>
                    ) : (
                      <span className="text-neutral-500 hover:text-[#141413]">设为基准</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. 排序选择器 */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'sort' ? null : 'sort'))}
          aria-expanded={openMenu === 'sort'}
          className="h-9 px-2.5 rounded-xl bg-white/85 backdrop-blur-md border border-black/[0.07] hover:bg-white inline-flex items-center gap-1.5 text-[11px] font-bold text-[#141413] whitespace-nowrap transition cursor-pointer shadow-[0_2px_8px_-4px_rgba(20,20,19,0.08)]"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span>{activeSortLabel}</span>
        </button>

        {openMenu === 'sort' && (
          <div className="absolute right-0 top-[calc(100%+6px)] w-36 rounded-2xl bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_18px_40px_-12px_rgba(20,20,19,0.22)] p-1.5 space-y-0.5 z-40 animate-in fade-in">
            {SORT_OPTIONS.map((opt) => {
              const active = opt.id === sortMode;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChangeSort(opt.id);
                    setOpenMenu(null);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    active ? 'bg-[#141413] text-white' : 'text-neutral-700 hover:bg-[#f4f4f5]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 重新巡检 */}
      <button
        type="button"
        onClick={onRefreshPatrol}
        disabled={isRefreshing}
        title="重新巡检刷新车队状态与遥测"
        aria-label="重新巡检"
        className="w-9 h-9 rounded-xl bg-white/85 backdrop-blur-md border border-black/[0.07] hover:bg-white text-[#141413] flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer disabled:opacity-60 shadow-[0_2px_8px_-4px_rgba(20,20,19,0.08)]"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
      </button>
    </div>
  );
};

/* ==================== 3. 状态筛选条 ==================== */
export interface RadarStatusFilterBarProps {
  activeFilter: RadarFilterTab;
  onChangeFilter: (tab: RadarFilterTab) => void;
  counts: Record<RadarFilterTab, number>;
}

export const RadarStatusFilterBar: React.FC<RadarStatusFilterBarProps> = ({
  activeFilter,
  onChangeFilter,
  counts
}) => {
  const tabs: ReadonlyArray<{ id: RadarFilterTab; label: string }> = [
    { id: 'all', label: '全车队' },
    { id: 'service', label: '制作中' },
    { id: 'collaborative', label: '蜂窝协同' },
    { id: 'standby', label: '打烊' }
  ];

  return (
    <div
      role="tablist"
      aria-label="餐车状态筛选"
      className="self-start inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#f4f4f5]/90 backdrop-blur-md border border-black/[0.06]"
    >
      {tabs.map((tab) => {
        const active = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChangeFilter(tab.id)}
            className={`h-8 px-2.5 rounded-[10px] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap transition cursor-pointer ${
              active
                ? 'bg-white text-[#141413] shadow-2xs'
                : 'text-neutral-500 hover:text-[#141413]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`font-mono tabular-nums ${
                active ? 'text-emerald-700' : 'text-neutral-400'
              }`}
            >
              {counts[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
};
