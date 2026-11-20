import type {
  ComputedFleetTruck,
  FleetTruckRecord,
  HiveTransferAuditRecord,
  NetworkTelemetrySnapshot,
  RadarSortMode,
  TruckRadarStatus
} from '../types/radar';
import { safeGetStorage, safeSetStorage } from './safeStorage';

const RADAR_BASELINE_KEY = 'obsidian_radar_baseline_truck_id_v1';
const RADAR_TRANSFERS_KEY = 'obsidian_radar_transfer_audits_v1';

export function getSavedBaselineTruckId(fallback = 'truck-01'): string {
  return safeGetStorage<string>(RADAR_BASELINE_KEY, fallback);
}

export function saveBaselineTruckId(truckId: string): void {
  safeSetStorage(RADAR_BASELINE_KEY, truckId);
}

export function getTransferAudits(): HiveTransferAuditRecord[] {
  return safeGetStorage<HiveTransferAuditRecord[]>(RADAR_TRANSFERS_KEY, []);
}

export function appendTransferAudit(record: HiveTransferAuditRecord): HiveTransferAuditRecord[] {
  const next = [record, ...getTransferAudits()].slice(0, 30);
  safeSetStorage(RADAR_TRANSFERS_KEY, next);
  return next;
}

/**
 * Haversine 球面距离实算（单位 km）
 */
export function computeHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * 方位角计算（相对基准车）
 */
export function computeBearingCardinal(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  if (Math.abs(lat1 - lat2) < 1e-5 && Math.abs(lon1 - lon2) < 1e-5) {
    return '基准原点';
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const dirs = ['正北', '东北', '正东', '东南', '正南', '西南', '正西', '西北'];
  return dirs[Math.round(brng / 45) % 8];
}

/**
 * 营业时段生效优先级：今日临时调整 > 周计划 > 常规
 */
export function resolveEffectiveHours(truck: FleetTruckRecord): string {
  return truck.todayOverrideHours || truck.weeklyPlanHours || truck.regularHours;
}

/**
 * 计算剩余营业时长（小时），支持跨夜班次（如 17:00 - 02:30）
 */
export function computeRemainingOpenHours(hoursWindow: string, isOpen: boolean, now = new Date()): number {
  if (!isOpen) return 0;
  const match = hoursWindow.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return 0;

  const startMin = Number(match[1]) * 60 + Number(match[2]);
  let endMin = Number(match[3]) * 60 + Number(match[4]);
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const isOvernight = endMin <= startMin;
  if (isOvernight) {
    endMin += 24 * 60;
  }

  let effectiveNow = currentMin;
  if (isOvernight && currentMin < startMin && currentMin <= endMin - 24 * 60) {
    effectiveNow += 24 * 60;
  }

  const diffMin = endMin - effectiveNow;
  if (diffMin <= 0) return 0;
  return Number((diffMin / 60).toFixed(1));
}

export function resolveTruckRadarStatus(
  truck: FleetTruckRecord,
  baselineTruckId: string
): { status: TruckRadarStatus; label: string } {
  if (!truck.isOpen) {
    return { status: 'standby', label: '暂停打烊' };
  }
  if (truck.id === baselineTruckId) {
    return { status: 'service', label: '服务中' };
  }
  return { status: 'collaborative', label: '协同中' };
}

export function buildComputedFleet(
  fleet: FleetTruckRecord[],
  baselineTruckId: string,
  now = new Date()
): ComputedFleetTruck[] {
  const baseline = fleet.find((t) => t.id === baselineTruckId) || fleet[0];

  return fleet.map((truck) => {
    const { status, label } = resolveTruckRadarStatus(truck, baseline.id);
    const effectiveHours = resolveEffectiveHours(truck);
    const remainingOpenHours = computeRemainingOpenHours(effectiveHours, truck.isOpen, now);
    const distanceKm = computeHaversineKm(
      baseline.latitude,
      baseline.longitude,
      truck.latitude,
      truck.longitude
    );
    const bearingLabel = computeBearingCardinal(
      baseline.latitude,
      baseline.longitude,
      truck.latitude,
      truck.longitude
    );
    const coverageAreaKm2 = Number((Math.PI * truck.coverageRadiusKm * truck.coverageRadiusKm).toFixed(1));

    return {
      ...truck,
      radarStatus: status,
      radarStatusLabel: label,
      effectiveHours,
      remainingOpenHours,
      distanceKm,
      bearingLabel,
      coverageAreaKm2,
      latestChefNotice: truck.chefNotices[0] || {
        id: 'default-notice',
        message: '现烤备餐通道正常开启',
        publishedAt: '--:--',
        chefName: '值班主厨'
      }
    };
  });
}

export function sortFleetTrucks(
  trucks: ComputedFleetTruck[],
  sortMode: RadarSortMode
): ComputedFleetTruck[] {
  const copy = [...trucks];
  copy.sort((a, b) => {
    if (sortMode === 'distance') {
      return a.distanceKm - b.distanceKm;
    }
    if (sortMode === 'queue') {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return a.queueOrders - b.queueOrders || a.distanceKm - b.distanceKm;
    }
    if (sortMode === 'open_time') {
      return b.remainingOpenHours - a.remainingOpenHours || a.distanceKm - b.distanceKm;
    }
    return a.minDeliveryAmount - b.minDeliveryAmount || a.distanceKm - b.distanceKm;
  });
  return copy;
}

/**
 * 读取浏览器真实的 navigator.connection 网络遥测；不支持时诚实标明降级值
 */
export function readNetworkTelemetry(): NetworkTelemetrySnapshot {
  if (typeof navigator !== 'undefined') {
    const navAny = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        rtt?: number;
        downlink?: number;
      };
    };
    if (navAny.connection) {
      return {
        source: 'navigator.connection',
        effectiveType: (navAny.connection.effectiveType || '4g').toUpperCase(),
        rttMs: typeof navAny.connection.rtt === 'number' && navAny.connection.rtt > 0
          ? navAny.connection.rtt
          : 28,
        downlinkMbps: typeof navAny.connection.downlink === 'number' && navAny.connection.downlink > 0
          ? navAny.connection.downlink
          : 10
      };
    }
  }
  return {
    source: 'fallback',
    effectiveType: '4G',
    rttMs: 32,
    downlinkMbps: 10
  };
}
