import React, { useEffect, useState } from 'react';
import {
  X,
  BatteryCharging,
  Droplets,
  ThermometerSnowflake,
  Cpu,
  Satellite,
  Wifi,
  Clock,
  ArrowLeftRight,
  ChefHat,
  Plus,
  Minus,
  Activity,
  CheckCircle2,
  Send,
  FileText
} from 'lucide-react';
import type {
  ComputedFleetTruck,
  HiveTransferAuditRecord,
  NetworkTelemetrySnapshot,
  TruckPrepMenuItem
} from '../../types/radar';
import { useToast } from '../ui/ToastContext';

/* ==================== 1. 时空细则弹窗 ==================== */
export interface SpatioDetailModalProps {
  truck: ComputedFleetTruck | null;
  networkTelemetry: NetworkTelemetrySnapshot;
  onClose: () => void;
  onOpenCanBus: (truck: ComputedFleetTruck) => void;
  onOpenSchedule: (truck: ComputedFleetTruck) => void;
}

export const SpatioDetailModal: React.FC<SpatioDetailModalProps> = ({
  truck,
  networkTelemetry,
  onClose,
  onOpenCanBus,
  onOpenSchedule
}) => {
  if (!truck) return null;
  const tel = truck.demoTelemetry;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${truck.code} 时空细则`}
        className="w-full max-w-[430px] max-h-[86vh] flex flex-col bg-white/94 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500">
              <span className="font-bold text-[#141413]">{truck.code}</span>
              <span aria-hidden="true">·</span>
              <span>{truck.district}</span>
              <span aria-hidden="true">·</span>
              <span>{truck.radarStatusLabel}</span>
            </div>
            <h3 className="text-sm font-black text-[#141413] truncate mt-0.5">{truck.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭时空细则"
            className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容滚动区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* 诚实性边界声明 */}
          <div className="rounded-xl bg-[#f4f4f5]/90 border border-black/[0.06] px-3 py-2 text-[11px] text-neutral-600 leading-relaxed">
            位置坐标、Haversine 测距与营业时段来自真实调度配置；下方车载储能、水箱、冷链温度、CAN-BUS 与 RTK 硬件指标为
            <span className="font-bold text-[#141413]"> 演示数据</span>，不参与排队与接单计算。
          </div>

          {/* 车载储能电网 */}
          <div className="rounded-2xl bg-white/85 border border-black/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#141413]">
              <span className="inline-flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
                车载储能电网
              </span>
              <span className="text-[10px] font-mono text-neutral-400">演示数据</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${tel.batteryPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums pt-0.5">
              <div>
                <div className="text-neutral-400">电量 SOC</div>
                <div className="font-bold text-[#141413]">{tel.batteryPercent}%</div>
              </div>
              <div>
                <div className="text-neutral-400">总线电压</div>
                <div className="font-bold text-[#141413]">{tel.busVoltageV}V</div>
              </div>
              <div>
                <div className="text-neutral-400">预计续航</div>
                <div className="font-bold text-[#141413]">{tel.estimatedRuntimeHours}h</div>
              </div>
            </div>
          </div>

          {/* 食品级水箱 + 冷冻温控 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/85 border border-black/[0.06] p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#141413]">
                <span className="inline-flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  水箱循环
                </span>
                <span className="text-[10px] font-mono text-neutral-400">演示数据</span>
              </div>
              <div className="text-[11px] font-mono tabular-nums space-y-1 pt-0.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">净水余量</span>
                  <span className="font-bold text-[#141413]">{tel.cleanWaterPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">灰水负荷</span>
                  <span className="font-bold text-[#141413]">{tel.greyWaterPercent}%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/85 border border-black/[0.06] p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#141413]">
                <span className="inline-flex items-center gap-1">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-600" />
                  冷冻温控
                </span>
                <span className="text-[10px] font-mono text-neutral-400">演示数据</span>
              </div>
              <div className="text-[11px] font-mono tabular-nums space-y-1 pt-0.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">深冷柜</span>
                  <span className="font-bold text-[#141413]">{tel.freezerTempC}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">保鲜舱</span>
                  <span className="font-bold text-[#141413]">{tel.chillerTempC}°C</span>
                </div>
              </div>
            </div>
          </div>

          {/* CAN-BUS 2.0B 工控总线监视器 */}
          <div className="rounded-2xl bg-white/85 border border-black/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141413]">
                <Cpu className="w-4 h-4 text-neutral-700" />
                CAN-BUS 2.0B 工控总线
              </span>
              <span className="text-[10px] font-mono text-neutral-400">演示数据</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
              <div>
                <div className="text-neutral-400">总线负载率</div>
                <div className="font-bold text-[#141413]">{tel.canBusLoadPercent}%</div>
              </div>
              <div>
                <div className="text-neutral-400">TEC 错误帧</div>
                <div className="font-bold text-[#141413]">{tel.canTecCount}</div>
              </div>
              <div>
                <div className="text-neutral-400">REC 错误帧</div>
                <div className="font-bold text-[#141413]">{tel.canRecCount}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenCanBus(truck)}
              className="w-full h-9 rounded-xl bg-[#f4f4f5] hover:bg-neutral-200/70 text-[11px] font-bold text-[#141413] inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-700" />
              <span>打开 CAN-BUS 硬件深度诊断</span>
            </button>
          </div>

          {/* RTK 载波差分 + 5G 双工遥测 */}
          <div className="rounded-2xl bg-white/85 border border-black/[0.06] p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#141413]">
              <span className="inline-flex items-center gap-1.5">
                <Satellite className="w-4 h-4 text-amber-600" />
                RTK 载波差分定位
              </span>
              <span className="text-[10px] font-mono text-neutral-400">坐标真实 · 精度演示</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
              <div>
                <div className="text-neutral-400">经纬度坐标</div>
                <div className="font-bold text-[#141413]">
                  {truck.latitude.toFixed(4)}, {truck.longitude.toFixed(4)}
                </div>
              </div>
              <div>
                <div className="text-neutral-400">RTK 固定解精度</div>
                <div className="font-bold text-emerald-700">±{tel.rtkPrecisionCm} cm</div>
              </div>
            </div>

            <div className="pt-2 border-t border-black/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#141413]">
                <span className="inline-flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  5G 双工遥测链路
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {networkTelemetry.source === 'navigator.connection'
                    ? 'navigator.connection 实测'
                    : '浏览器不支持 · 预估值'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
                <div>
                  <div className="text-neutral-400">链路时延</div>
                  <div className="font-bold text-[#141413]">{networkTelemetry.rttMs} ms</div>
                </div>
                <div>
                  <div className="text-neutral-400">TX/RX 下行</div>
                  <div className="font-bold text-[#141413]">
                    {networkTelemetry.downlinkMbps} Mbps
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400">总线波特率</div>
                  <div className="font-bold text-[#141413]">{tel.baudRateKbps} kbps</div>
                </div>
              </div>
            </div>
          </div>

          {/* 主厨通告 + 营业时间流转入口 */}
          <div className="rounded-2xl bg-white/85 border border-black/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141413]">
                <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                最新主厨通告
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {truck.latestChefNotice.publishedAt} · {truck.latestChefNotice.chefName}
              </span>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed">
              {truck.latestChefNotice.message}
            </p>
            <button
              type="button"
              onClick={() => onOpenSchedule(truck)}
              className="w-full h-9 rounded-xl border border-black/[0.08] hover:bg-[#f4f4f5] text-[11px] font-bold text-[#141413] inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-neutral-600" />
              <span>查看营业时间流转 ({truck.effectiveHours})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== 2. CAN-BUS 硬件诊断面板 ==================== */
export interface CanBusDiagnosticsModalProps {
  truck: ComputedFleetTruck | null;
  onClose: () => void;
}

export const CanBusDiagnosticsModal: React.FC<CanBusDiagnosticsModalProps> = ({
  truck,
  onClose
}) => {
  const toast = useToast();
  const [scanning, setScanning] = useState(false);

  if (!truck) return null;
  const tel = truck.demoTelemetry;

  const nodes = [
    { addr: '0x18F00400', name: '炭烤炉与温控 ECU', frameRate: '50 Hz', status: 'ACK 正常' },
    { addr: '0x18FE6C00', name: '储能 BMS 与逆变器', frameRate: '20 Hz', status: 'ACK 正常' },
    { addr: '0x0CF00300', name: '净水循环泵控制器', frameRate: '10 Hz', status: truck.isOpen ? 'ACK 正常' : '休眠待机' }
  ];

  const handleRescan = () => {
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      toast.success(`${truck.code} CAN-BUS 重扫完成`, '全部节点心跳帧校验通过（演示遥测）');
    }, 550);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="CAN-BUS 硬件诊断"
        className="w-full max-w-[430px] bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-neutral-400">
              {truck.code} · J1939 / CAN 2.0B · 演示数据
            </div>
            <h3 className="text-sm font-black text-[#141413]">CAN-BUS 工控总线诊断</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭总线诊断"
            className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-4 gap-2 rounded-2xl bg-[#f4f4f5] p-3 text-center font-mono tabular-nums">
            <div>
              <div className="text-[10px] text-neutral-400">波特率</div>
              <div className="text-xs font-black text-[#141413] mt-0.5">{tel.baudRateKbps}k</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400">负载率</div>
              <div className="text-xs font-black text-emerald-700 mt-0.5">{tel.canBusLoadPercent}%</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400">TEC</div>
              <div className="text-xs font-black text-[#141413] mt-0.5">{tel.canTecCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400">REC</div>
              <div className="text-xs font-black text-[#141413] mt-0.5">{tel.canRecCount}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            {nodes.map((node) => (
              <div
                key={node.addr}
                className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 text-xs"
              >
                <div>
                  <div className="font-bold text-[#141413]">{node.name}</div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    PGN {node.addr} · {node.frameRate}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700">{node.status}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRescan}
            disabled={scanning}
            className="w-full h-11 rounded-xl bg-[#141413] hover:bg-neutral-800 disabled:opacity-60 text-white text-xs font-black transition active:scale-[0.98] cursor-pointer"
          >
            {scanning ? '正在轮询 ECU 心跳...' : '重新扫描总线'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 3. 跨站蜂窝协同转单 ==================== */
export interface HiveTransferModalProps {
  sourceTruck: ComputedFleetTruck | null;
  allTrucks: ComputedFleetTruck[];
  recentAudits: HiveTransferAuditRecord[];
  onClose: () => void;
  onSubmitTransfer: (payload: {
    fromTruck: ComputedFleetTruck;
    toTruck: ComputedFleetTruck;
    orderCount: number;
    note: string;
  }) => void;
}

export const HiveTransferModal: React.FC<HiveTransferModalProps> = ({
  sourceTruck,
  allTrucks,
  recentAudits,
  onClose,
  onSubmitTransfer
}) => {
  const toast = useToast();
  // 注意事项 11.3：跨车协同只对「协同中」的车开放，排除自己与已打烊车
  const candidates = sourceTruck
    ? allTrucks.filter(
        (t) => t.id !== sourceTruck.id && t.radarStatus === 'collaborative' && t.isOpen
      )
    : [];

  const [targetId, setTargetId] = useState<string>('');
  const [orderCount, setOrderCount] = useState<number>(1);
  const [note, setNote] = useState<string>('午峰排队分流 · 同步备餐清单');

  useEffect(() => {
    if (candidates.length > 0) {
      setTargetId(candidates[0].id);
    } else {
      setTargetId('');
    }
    setOrderCount(1);
  }, [sourceTruck?.id]);

  if (!sourceTruck) return null;
  const selectedTarget = candidates.find((c) => c.id === targetId) || null;
  const maxTransfer = Math.max(1, sourceTruck.queueOrders || 1);

  const handleConfirm = () => {
    if (!selectedTarget) {
      toast.warning('暂无可协同接单的营业车');
      return;
    }
    onSubmitTransfer({
      fromTruck: sourceTruck,
      toTruck: selectedTarget,
      orderCount,
      note: note.trim() || '蜂窝协同分流'
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="跨站蜂窝协同转单"
        className="w-full max-w-[430px] max-h-[86vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-neutral-400">
              转出站台 {sourceTruck.code} · 当前排队 {sourceTruck.queueOrders} 单
            </div>
            <h3 className="text-sm font-black text-[#141413]">跨站蜂窝协同转单</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭协同转单"
            className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="rounded-xl bg-[#f4f4f5] px-3 py-2 text-[11px] text-neutral-600">
            协同转单仅记录跨站调度审计日志，不会直接改写食客原始订单状态；已自动过滤本车及暂停打烊车辆。
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-bold text-[#141413]">选择目标协同餐车</div>
            {candidates.length === 0 ? (
              <div className="rounded-xl border border-black/[0.06] p-4 text-center text-xs text-neutral-500">
                当前同城暂无其它处于「协同中」的营业餐车
              </div>
            ) : (
              <div className="space-y-1.5">
                {candidates.map((cand) => {
                  const selected = cand.id === targetId;
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => setTargetId(cand.id)}
                      className={`w-full rounded-xl p-3 text-left border transition flex items-center justify-between gap-2 cursor-pointer ${
                        selected
                          ? 'bg-[#141413] text-white border-[#141413]'
                          : 'bg-white border-black/[0.07] text-[#141413] hover:bg-neutral-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {cand.code} {cand.district} · {cand.name}
                        </div>
                        <div
                          className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                            selected ? 'text-neutral-300' : 'text-neutral-500'
                          }`}
                        >
                          {cand.distanceKm}km {cand.bearingLabel} · 排队 {cand.queueOrders} 单 · 余 {cand.remainingOpenHours}h
                        </div>
                      </div>
                      {selected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {candidates.length > 0 && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-3 py-2.5">
                <span className="text-xs font-bold text-[#141413]">分流单数</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderCount((c) => Math.max(1, c - 1))}
                    aria-label="减少转单数"
                    className="w-8 h-8 rounded-lg bg-[#f4f4f5] hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono text-sm font-black tabular-nums">
                    {orderCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrderCount((c) => Math.min(maxTransfer, c + 1))}
                    aria-label="增加转单数"
                    className="w-8 h-8 rounded-lg bg-[#f4f4f5] hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#141413]" htmlFor="hive-transfer-note">
                  调度审计备注
                </label>
                <input
                  id="hive-transfer-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-black/[0.08] bg-white text-xs text-[#141413] outline-none focus:border-emerald-600"
                />
              </div>
            </>
          )}

          {recentAudits.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-neutral-400">最近协同审计记录</div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {recentAudits.slice(0, 3).map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl bg-[#f4f4f5]/80 px-2.5 py-2 text-[11px] flex items-center justify-between gap-2"
                  >
                    <span className="text-[#141413] truncate">
                      {rec.fromTruckName} → {rec.toTruckName} ({rec.orderCount} 单)
                    </span>
                    <span className="font-mono text-neutral-400 shrink-0">{rec.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-black/[0.06] bg-white/80">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={candidates.length === 0}
            className="w-full h-11 rounded-xl bg-[#141413] hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>登记协同转单审计</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 4. 呼叫主厨备餐通道 ==================== */
export interface PrepOrderModalProps {
  truck: ComputedFleetTruck | null;
  onClose: () => void;
  onSubmitPrep: (
    truck: ComputedFleetTruck,
    selectedItems: Array<{ item: TruckPrepMenuItem; qty: number }>
  ) => void;
}

export const PrepOrderModal: React.FC<PrepOrderModalProps> = ({
  truck,
  onClose,
  onSubmitPrep
}) => {
  const toast = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    setQuantities({});
  }, [truck?.id]);

  if (!truck) return null;

  const selectedEntries = truck.prepDishes
    .map((item) => ({ item, qty: quantities[item.dishId] || 0 }))
    .filter((entry) => entry.qty > 0);

  const totalQty = selectedEntries.reduce((sum, e) => sum + e.qty, 0);
  const totalAmount = selectedEntries.reduce((sum, e) => sum + e.qty * e.item.price, 0);

  const adjustQty = (dish: TruckPrepMenuItem, delta: number) => {
    if (dish.stock <= 0) return;
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(dish.stock, (prev[dish.dishId] || 0) + delta));
      return { ...prev, [dish.dishId]: next };
    });
  };

  const handleSubmit = () => {
    if (selectedEntries.length === 0) {
      toast.warning('请选择至少一项备餐餐品');
      return;
    }
    onSubmitPrep(truck, selectedEntries);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="呼叫主厨备餐通道"
        className="w-full max-w-[430px] max-h-[86vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-neutral-400">
              {truck.code} {truck.district} · 现点通道
            </div>
            <h3 className="text-sm font-black text-[#141413]">呼叫主厨备餐通道</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭备餐通道"
            className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {truck.prepDishes.map((dish) => {
            const soldOut = dish.stock <= 0;
            const qty = quantities[dish.dishId] || 0;
            return (
              <div
                key={dish.dishId}
                className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${
                  soldOut
                    ? 'bg-neutral-50 border-black/[0.04] opacity-60'
                    : 'bg-white border-black/[0.07]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-[#141413] truncate">
                      {dish.name}
                    </span>
                    {dish.tag && (
                      <span className="text-[10px] font-bold text-neutral-400 shrink-0">
                        · {dish.tag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums mt-1">
                    <span className="font-black text-[#141413]">¥{dish.price}</span>
                    <span className="text-neutral-300">·</span>
                    <span className="text-neutral-500">约 {dish.prepMinutes}m</span>
                    <span className="text-neutral-300">·</span>
                    <span className={soldOut ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                      {soldOut ? '售罄' : `余 ${dish.stock} 份`}
                    </span>
                  </div>
                </div>

                {soldOut ? (
                  <span className="px-2.5 py-1.5 rounded-xl bg-neutral-200/70 text-[11px] font-bold text-neutral-500 shrink-0">
                    售罄
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => adjustQty(dish, -1)}
                      disabled={qty === 0}
                      aria-label={`减少 ${dish.name}`}
                      className="w-8 h-8 rounded-lg bg-[#f4f4f5] hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-mono text-xs font-black tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustQty(dish, 1)}
                      disabled={qty >= dish.stock}
                      aria-label={`增加 ${dish.name}`}
                      className="w-8 h-8 rounded-lg bg-[#141413] hover:bg-neutral-800 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-black/[0.06] bg-white/90 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
              已选 {totalQty} 份
            </div>
            <div className="text-base font-black font-mono text-[#141413] tabular-nums">
              ¥{totalAmount.toFixed(2)}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="h-11 px-5 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-black transition active:scale-95 cursor-pointer"
          >
            提交备餐指令
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 5. 营业时间流转弹窗 ==================== */
export interface ScheduleTimelineModalProps {
  truck: ComputedFleetTruck | null;
  onClose: () => void;
}

export const ScheduleTimelineModal: React.FC<ScheduleTimelineModalProps> = ({ truck, onClose }) => {
  if (!truck) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="营业时间流转"
        className="w-full max-w-[430px] bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-neutral-400">
              {truck.code} {truck.district}
            </div>
            <h3 className="text-sm font-black text-[#141413]">营业时间流转记录</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭时间流转"
            className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-xl bg-[#f4f4f5] px-3 py-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-500">当前生效时段（今日调整 &gt; 周计划 &gt; 常规）</span>
            <span className="font-mono font-black text-[#141413] tabular-nums">
              {truck.effectiveHours}
            </span>
          </div>

          <div className="space-y-2.5">
            {truck.scheduleHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-black/[0.06] bg-white p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-black ${
                      item.tag === '今日调整'
                        ? 'text-emerald-700'
                        : item.tag === '今日已打烊'
                          ? 'text-rose-600'
                          : 'text-[#141413]'
                    }`}
                  >
                    {item.tag} · {item.effectiveWindow}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">{item.updatedAt}</span>
                </div>
                <p className="text-xs text-neutral-600">{item.reason}</p>
                <div className="text-[10px] text-neutral-400">操作人：{item.operator}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== 6. 协同聊天房间抽屉 ==================== */
export interface CoopChatModalProps {
  truck: ComputedFleetTruck | null;
  onClose: () => void;
}

export const CoopChatModal: React.FC<CoopChatModalProps> = ({ truck, onClose }) => {
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([]);

  useEffect(() => {
    if (!truck) return;
    setMessages([
      {
        id: 'init-1',
        sender: truck.latestChefNotice.chefName,
        text: truck.latestChefNotice.message,
        time: truck.latestChefNotice.publishedAt
      },
      {
        id: 'init-2',
        sender: '雷达调度助手',
        text: `${truck.code} ${truck.district} 当前排队 ${truck.queueOrders} 单，可随时预约备餐或咨询加料。`,
        time: '刚刚'
      }
    ]);
  }, [truck?.id]);

  if (!truck) return null;

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, sender: '我 (食客)', text: trimmed, time: `${hh}:${mm}` }
    ]);
    setDraft('');
    toast.success(`已发送至 ${truck.code} 协同房间`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="协同聊天房间"
        className="w-full max-w-[430px] max-h-[82vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-neutral-400">
              {truck.code} {truck.district} · 车厢实时通道
            </div>
            <h3 className="text-sm font-black text-[#141413]">协同聊天房间</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭聊天房间"
            className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl bg-[#f4f4f5]/90 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-[#141413]">{m.sender}</span>
                <span className="font-mono text-neutral-400">{m.time}</span>
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed">{m.text}</p>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-black/[0.06] bg-white flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={`向 ${truck.code} 主厨/车友发送消息...`}
            className="flex-1 h-10 px-3 rounded-xl bg-[#f4f4f5] border border-black/[0.06] text-xs text-[#141413] outline-none focus:bg-white focus:border-emerald-600"
          />
          <button
            type="button"
            onClick={handleSend}
            aria-label="发送消息"
            className="w-10 h-10 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 7. 工单与协同审计抽屉 ==================== */
export interface RadarDispatchLogModalProps {
  open: boolean;
  audits: HiveTransferAuditRecord[];
  prepLogs: Array<{ id: string; truckCode: string; truckName: string; summary: string; amount: number; time: string }>;
  onClose: () => void;
}

export const RadarDispatchLogModal: React.FC<RadarDispatchLogModalProps> = ({
  open,
  audits,
  prepLogs,
  onClose
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="调度工单与审计"
        className="w-full max-w-[430px] max-h-[82vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#141413]" />
            <h3 className="text-sm font-black text-[#141413]">备餐工单与协同审计</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭工单记录"
            className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-[#141413]">主厨备餐工单</div>
            {prepLogs.length === 0 ? (
              <div className="rounded-xl bg-[#f4f4f5] p-3 text-xs text-neutral-500">
                暂无备餐提交记录，可在任一营业餐车点击「呼叫备餐」下单
              </div>
            ) : (
              prepLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-black/[0.06] bg-white p-3 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#141413]">
                    <span>
                      {log.truckCode} · {log.truckName}
                    </span>
                    <span className="font-mono">¥{log.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] text-neutral-600">{log.summary}</div>
                  <div className="text-[10px] font-mono text-neutral-400">{log.time}</div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-bold text-[#141413]">跨站蜂窝协同转单审计</div>
            {audits.length === 0 ? (
              <div className="rounded-xl bg-[#f4f4f5] p-3 text-xs text-neutral-500">
                暂无协同转单审计记录
              </div>
            ) : (
              audits.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-black/[0.06] bg-white p-3 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#141413]">
                    <span>
                      {a.fromTruckName} → {a.toTruckName}
                    </span>
                    <span className="font-mono text-emerald-700">{a.orderCount} 单</span>
                  </div>
                  <div className="text-[11px] text-neutral-600">{a.note}</div>
                  <div className="text-[10px] font-mono text-neutral-400">{a.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
