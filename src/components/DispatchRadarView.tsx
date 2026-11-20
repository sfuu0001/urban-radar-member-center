import React, { useMemo, useState } from 'react';
import {
  UtensilsCrossed,
  MessageSquare,
  Radar,
  ClipboardList,
  User,
  ZoomIn
} from 'lucide-react';
import { INITIAL_DISPATCH_FLEET } from '../data/mockFleet';
import type {
  ComputedFleetTruck,
  FleetTruckRecord,
  HiveTransferAuditRecord,
  NetworkTelemetrySnapshot,
  RadarFilterTab,
  RadarSortMode,
  RadarViewLayout,
  TruckPrepMenuItem
} from '../types/radar';
import {
  appendTransferAudit,
  buildComputedFleet,
  getSavedBaselineTruckId,
  getTransferAudits,
  readNetworkTelemetry,
  saveBaselineTruckId,
  sortFleetTrucks
} from '../utils/dispatchRadarEngine';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { useToast } from './ui/ToastContext';
import {
  RadarControlStrip,
  RadarHeaderBar,
  RadarStatusFilterBar
} from './radar/RadarHeaderAndControls';
import { RadarBaselineDeck } from './radar/RadarBaselineDeck';
import { RadarFleetListSection } from './radar/RadarFleetListSection';
import { RadarHologramCarousel } from './radar/RadarHologramCarousel';
import {
  CanBusDiagnosticsModal,
  CoopChatModal,
  HiveTransferModal,
  PrepOrderModal,
  RadarDispatchLogModal,
  ScheduleTimelineModal,
  SpatioDetailModal
} from './radar/RadarModals';

const PREP_LOG_KEY = 'obsidian_radar_prep_orders_v1';

interface PrepOrderLogEntry {
  id: string;
  truckCode: string;
  truckName: string;
  summary: string;
  amount: number;
  time: string;
}

export interface DispatchRadarViewProps {
  onBack: () => void;
  onGoToCart: () => void;
  onGoToProfile: () => void;
  headerStickyClass?: string;
}

const ZOOM_STEPS = [0.95, 1, 1.05] as const;

export const DispatchRadarView: React.FC<DispatchRadarViewProps> = ({
  onBack,
  onGoToCart,
  onGoToProfile,
  headerStickyClass = 'sticky top-0 z-30'
}) => {
  const toast = useToast();

  // 1. 车队基础与基准原点状态
  const [fleetRecords, setFleetRecords] = useState<FleetTruckRecord[]>(INITIAL_DISPATCH_FLEET);
  const [baselineTruckId, setBaselineTruckId] = useState<string>(() =>
    getSavedBaselineTruckId('truck-01')
  );
  const [sortMode, setSortMode] = useState<RadarSortMode>('distance');
  const [layoutMode, setLayoutMode] = useState<RadarViewLayout>('list');
  const [activeFilter, setActiveFilter] = useState<RadarFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [patrolTick, setPatrolTick] = useState<number>(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [networkTelemetry, setNetworkTelemetry] = useState<NetworkTelemetrySnapshot>(() =>
    readNetworkTelemetry()
  );
  const [zoomIndex, setZoomIndex] = useState<number>(1); // 100%

  // 2. 审计日志与备餐工单
  const [audits, setAudits] = useState<HiveTransferAuditRecord[]>(() => getTransferAudits());
  const [prepLogs, setPrepLogs] = useState<PrepOrderLogEntry[]>(() =>
    safeGetStorage<PrepOrderLogEntry[]>(PREP_LOG_KEY, [])
  );

  // 3. 弹窗控制
  const [detailTruck, setDetailTruck] = useState<ComputedFleetTruck | null>(null);
  const [canBusTruck, setCanBusTruck] = useState<ComputedFleetTruck | null>(null);
  const [transferTruck, setTransferTruck] = useState<ComputedFleetTruck | null>(null);
  const [prepTruck, setPrepTruck] = useState<ComputedFleetTruck | null>(null);
  const [scheduleTruck, setScheduleTruck] = useState<ComputedFleetTruck | null>(null);
  const [coopChatTruck, setCoopChatTruck] = useState<ComputedFleetTruck | null>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);

  // 4. 计算 Haversine 距离、方位角、剩余营业时长与状态语义
  const computedFleet = useMemo(() => {
    const now = new Date(patrolTick);
    return buildComputedFleet(fleetRecords, baselineTruckId, now);
  }, [fleetRecords, baselineTruckId, patrolTick]);

  const baselineTruck = useMemo(
    () => computedFleet.find((t) => t.id === baselineTruckId) || computedFleet[0],
    [computedFleet, baselineTruckId]
  );

  // 5. 全队汇总统计
  const summaryStats = useMemo(() => {
    const openTrucks = computedFleet.filter((t) => t.isOpen);
    const nonBaseOpen = openTrucks.filter((t) => t.id !== baselineTruck.id);
    const avgFleetDistanceKm =
      nonBaseOpen.length > 0
        ? Number(
            (
              nonBaseOpen.reduce((sum, t) => sum + t.distanceKm, 0) / nonBaseOpen.length
            ).toFixed(2)
          )
        : 0;
    const zeroQueueCount = openTrucks.filter((t) => t.queueOrders === 0).length;
    const zeroQueueRatioPercent =
      openTrucks.length > 0 ? Math.round((zeroQueueCount / openTrucks.length) * 100) : 0;

    return {
      activeTrucksCount: openTrucks.length,
      avgFleetDistanceKm,
      zeroQueueRatioPercent
    };
  }, [computedFleet, baselineTruck.id]);

  // 6. 状态计数 + 搜索与筛选
  const filterCounts = useMemo<Record<RadarFilterTab, number>>(
    () => ({
      all: computedFleet.length,
      service: computedFleet.filter((t) => t.radarStatus === 'service').length,
      collaborative: computedFleet.filter((t) => t.radarStatus === 'collaborative').length,
      standby: computedFleet.filter((t) => t.radarStatus === 'standby').length
    }),
    [computedFleet]
  );

  const visibleTrucks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = computedFleet.filter((t) => {
      if (activeFilter !== 'all' && t.radarStatus !== activeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.district.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.prepDishes.some((d) => d.name.toLowerCase().includes(q))
      );
    });
    return sortFleetTrucks(filtered, sortMode);
  }, [computedFleet, activeFilter, searchQuery, sortMode]);

  // 7. 操作处理器
  const handleSelectBaseline = (truckId: string) => {
    setBaselineTruckId(truckId);
    saveBaselineTruckId(truckId);
    const target = computedFleet.find((t) => t.id === truckId);
    if (target) {
      toast.success(`已设 ${target.code} ${target.district} 为雷达基准`, '全城车距与方位角已实时重算');
    }
  };

  const handleRefreshPatrol = () => {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setPatrolTick(Date.now());
      setNetworkTelemetry(readNetworkTelemetry());
      setIsRefreshing(false);
      toast.success('巡检完成', '已同步最新车队排期与网络链路遥测');
    }, 450);
  };

  const handleRefreshSingleTruck = (truck: ComputedFleetTruck) => {
    setPatrolTick(Date.now());
    setNetworkTelemetry(readNetworkTelemetry());
    toast.info(`已刷新 ${truck.code} ${truck.district}`, '营业余量与排队单数已校对');
  };

  const handleSubmitPrep = (
    truck: ComputedFleetTruck,
    selectedItems: Array<{ item: TruckPrepMenuItem; qty: number }>
  ) => {
    // 扣减站台备餐库存并写入本地排队与工单记录
    const qtyMap = new Map(selectedItems.map((e) => [e.item.dishId, e.qty]));
    setFleetRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== truck.id) return rec;
        return {
          ...rec,
          queueOrders: rec.queueOrders + 1,
          prepDishes: rec.prepDishes.map((d) => {
            const dec = qtyMap.get(d.dishId) || 0;
            return dec > 0 ? { ...d, stock: Math.max(0, d.stock - dec) } : d;
          })
        };
      })
    );

    const amount = selectedItems.reduce((s, e) => s + e.qty * e.item.price, 0);
    const summary = selectedItems.map((e) => `${e.item.name} ×${e.qty}`).join('、');
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const entry: PrepOrderLogEntry = {
      id: `prep-${Date.now()}`,
      truckCode: truck.code,
      truckName: truck.name,
      summary,
      amount,
      time
    };
    const nextLogs = [entry, ...prepLogs].slice(0, 30);
    setPrepLogs(nextLogs);
    safeSetStorage(PREP_LOG_KEY, nextLogs);

    window.dispatchEvent(
      new CustomEvent('obsidian:radar-prep-submitted', { detail: entry })
    );

    toast.success(`已呼叫 ${truck.code} 主厨备餐`, `${summary} · 合计 ¥${amount.toFixed(2)}`);
  };

  const handleSubmitTransfer = (payload: {
    fromTruck: ComputedFleetTruck;
    toTruck: ComputedFleetTruck;
    orderCount: number;
    note: string;
  }) => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const record: HiveTransferAuditRecord = {
      id: `tr-${Date.now()}`,
      fromTruckId: payload.fromTruck.id,
      fromTruckName: `${payload.fromTruck.code} ${payload.fromTruck.district}`,
      toTruckId: payload.toTruck.id,
      toTruckName: `${payload.toTruck.code} ${payload.toTruck.district}`,
      orderCount: payload.orderCount,
      note: payload.note,
      timestamp
    };
    const nextAudits = appendTransferAudit(record);
    setAudits(nextAudits);

    window.dispatchEvent(
      new CustomEvent('obsidian:radar-hive-transfer', { detail: record })
    );

    toast.success(
      `已登记协同转单审计 (${payload.orderCount} 单)`,
      `${record.fromTruckName} → ${record.toTruckName}（不改写原单状态）`
    );
  };

  const currentZoom = ZOOM_STEPS[zoomIndex];

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.06),transparent_42%),radial-gradient(circle_at_90%_12%,rgba(20,20,19,0.04),transparent_46%)] text-[#141413] flex flex-col">
      {/* 1. 顶部工具条 */}
      <RadarHeaderBar
        activeCount={summaryStats.activeTrucksCount}
        totalCount={computedFleet.length}
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        layoutMode={layoutMode}
        onToggleLayout={() =>
          setLayoutMode((prev) => (prev === 'list' ? 'hologram' : 'list'))
        }
        onBack={onBack}
        stickyClassName={headerStickyClass}
      />

      {/* 2. 主内容视口（支持右下角缩放比例切换） */}
      <main
        className="flex-1 max-w-5xl w-full mx-auto px-3 pt-2.5 pb-28 space-y-2.5 origin-top transition-transform duration-200"
        style={
          currentZoom === 1
            ? undefined
            : { zoom: currentZoom }
        }
      >
        {/* 基准指挥台 */}
        <RadarBaselineDeck
          baselineTruck={baselineTruck}
          activeTrucksCount={summaryStats.activeTrucksCount}
          avgFleetDistanceKm={summaryStats.avgFleetDistanceKm}
          zeroQueueRatioPercent={summaryStats.zeroQueueRatioPercent}
          networkTelemetry={networkTelemetry}
          onOpenSchedule={setScheduleTruck}
          onOpenPrepOrder={setPrepTruck}
          onOpenDetails={setDetailTruck}
        />

        {/* 控制条：基准选择器 / 排序 / 重新巡检 */}
        <RadarControlStrip
          fleet={computedFleet}
          baselineTruckId={baselineTruckId}
          onSelectBaseline={handleSelectBaseline}
          sortMode={sortMode}
          onChangeSort={setSortMode}
          isRefreshing={isRefreshing}
          onRefreshPatrol={handleRefreshPatrol}
        />

        {/* 状态筛选条 */}
        <RadarStatusFilterBar
          activeFilter={activeFilter}
          onChangeFilter={setActiveFilter}
          counts={filterCounts}
        />

        {/* 视图切换：车队矩阵列表 vs 全息旋转木马 */}
        {layoutMode === 'list' ? (
          <RadarFleetListSection
            trucks={visibleTrucks}
            allTrucks={computedFleet}
            baselineTruckId={baselineTruckId}
            sortMode={sortMode}
            avgFleetDistanceKm={summaryStats.avgFleetDistanceKm}
            onSetBaseline={handleSelectBaseline}
            onOpenDetails={setDetailTruck}
            onOpenPrepOrder={setPrepTruck}
            onOpenTransfer={setTransferTruck}
            onOpenSchedule={setScheduleTruck}
            onRefreshTruck={handleRefreshSingleTruck}
            onEnterCoopRoom={setCoopChatTruck}
          />
        ) : (
          <RadarHologramCarousel
            trucks={visibleTrucks}
            baselineTruckId={baselineTruckId}
            onSetBaseline={handleSelectBaseline}
            onOpenDetails={setDetailTruck}
            onOpenPrepOrder={setPrepTruck}
            onOpenTransfer={setTransferTruck}
            onOpenSchedule={setScheduleTruck}
          />
        )}
      </main>

      {/* 3. 右下角界面缩放控件 + 底部毛玻璃导航栏 */}
      <div className="sticky bottom-0 z-30 pointer-events-none px-3 pb-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          {/* 右下角界面缩放控件 */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setZoomIndex((idx) => (idx + 1) % ZOOM_STEPS.length)}
              title="切换雷达界面显示缩放比例"
              aria-label={`界面缩放 ${Math.round(currentZoom * 100)}%`}
              className="pointer-events-auto h-8 px-2.5 rounded-xl bg-white/88 backdrop-blur-md border border-black/[0.08] shadow-[0_8px_20px_-8px_rgba(20,20,19,0.2)] inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#141413] hover:bg-white transition active:scale-95 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5 text-emerald-700" />
              <span className="tabular-nums">{Math.round(currentZoom * 100)}%</span>
            </button>
          </div>

          {/* 底部五页签导航：点餐 / 消息 / 餐车 / 工单 / 我的 */}
          <nav
            aria-label="食客端主导航"
            className="pointer-events-auto grid grid-cols-5 items-center bg-white/88 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_14px_34px_-12px_rgba(20,20,19,0.2)] p-1"
          >
            <button
              type="button"
              onClick={onGoToCart}
              className="h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-[#141413] hover:bg-black/[0.03] transition cursor-pointer"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-[10px] font-bold">点餐</span>
            </button>

            <button
              type="button"
              onClick={() => setCoopChatTruck(baselineTruck)}
              className="h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-[#141413] hover:bg-black/[0.03] transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px] font-bold">消息</span>
            </button>

            <button
              type="button"
              aria-current="page"
              className="h-11 rounded-xl bg-[#141413] text-white flex flex-col items-center justify-center gap-0.5 shadow-sm cursor-default"
            >
              <Radar className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold">餐车</span>
            </button>

            <button
              type="button"
              onClick={() => setLogModalOpen(true)}
              className="h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-[#141413] hover:bg-black/[0.03] transition cursor-pointer relative"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="text-[10px] font-bold">工单</span>
              {(prepLogs.length > 0 || audits.length > 0) && (
                <span className="absolute top-1.5 right-3.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={onGoToProfile}
              className="h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-[#141413] hover:bg-black/[0.03] transition cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span className="text-[10px] font-bold">我的</span>
            </button>
          </nav>
        </div>
      </div>

      {/* 4. 全部交互弹层 */}
      <SpatioDetailModal
        truck={detailTruck}
        networkTelemetry={networkTelemetry}
        onClose={() => setDetailTruck(null)}
        onOpenCanBus={(t) => {
          setDetailTruck(null);
          setCanBusTruck(t);
        }}
        onOpenSchedule={(t) => {
          setDetailTruck(null);
          setScheduleTruck(t);
        }}
      />

      <CanBusDiagnosticsModal
        truck={canBusTruck}
        onClose={() => setCanBusTruck(null)}
      />

      <HiveTransferModal
        sourceTruck={transferTruck}
        allTrucks={computedFleet}
        recentAudits={audits}
        onClose={() => setTransferTruck(null)}
        onSubmitTransfer={handleSubmitTransfer}
      />

      <PrepOrderModal
        truck={prepTruck}
        onClose={() => setPrepTruck(null)}
        onSubmitPrep={handleSubmitPrep}
      />

      <ScheduleTimelineModal
        truck={scheduleTruck}
        onClose={() => setScheduleTruck(null)}
      />

      <CoopChatModal
        truck={coopChatTruck}
        onClose={() => setCoopChatTruck(null)}
      />

      <RadarDispatchLogModal
        open={logModalOpen}
        audits={audits}
        prepLogs={prepLogs}
        onClose={() => setLogModalOpen(false)}
      />
    </div>
  );
};
