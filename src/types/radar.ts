export type TruckRadarStatus = 'service' | 'collaborative' | 'standby';

export type RadarSortMode = 'distance' | 'queue' | 'open_time' | 'min_order';

export type RadarViewLayout = 'list' | 'hologram';

export type RadarFilterTab = 'all' | 'service' | 'collaborative' | 'standby';

export interface TruckScheduleAdjustment {
  id: string;
  tag: '常规排期' | '今日调整' | '今日已打烊';
  effectiveWindow: string;
  updatedAt: string;
  reason: string;
  operator: string;
}

export interface TruckChefNotice {
  id: string;
  message: string;
  publishedAt: string;
  chefName: string;
}

export interface TruckPrepMenuItem {
  dishId: string;
  name: string;
  price: number;
  stock: number;
  prepMinutes: number;
  tag?: string;
}

export interface TruckDemoTelemetry {
  batteryPercent: number;
  busVoltageV: number;
  estimatedRuntimeHours: number;
  cleanWaterPercent: number;
  greyWaterPercent: number;
  freezerTempC: number;
  chillerTempC: number;
  canBusLoadPercent: number;
  canTecCount: number;
  canRecCount: number;
  rtkPrecisionCm: number;
  baudRateKbps: number;
}

export interface FleetTruckRecord {
  id: string;
  code: string; // e.g. '#01'
  name: string;
  district: string;
  location: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  standbyReason?: string;
  regularHours: string;
  weeklyPlanHours?: string;
  todayOverrideHours?: string;
  minDeliveryAmount: number;
  coverageRadiusKm: number;
  queueOrders: number;
  avgTicketPrice: number;
  chefNotices: TruckChefNotice[];
  scheduleHistory: TruckScheduleAdjustment[];
  prepDishes: TruckPrepMenuItem[];
  demoTelemetry: TruckDemoTelemetry;
}

export interface ComputedFleetTruck extends FleetTruckRecord {
  radarStatus: TruckRadarStatus;
  radarStatusLabel: string;
  effectiveHours: string;
  remainingOpenHours: number;
  distanceKm: number;
  bearingLabel: string;
  coverageAreaKm2: number;
  latestChefNotice: TruckChefNotice;
}

export interface HiveTransferAuditRecord {
  id: string;
  fromTruckId: string;
  fromTruckName: string;
  toTruckId: string;
  toTruckName: string;
  orderCount: number;
  note: string;
  timestamp: string;
}

export interface NetworkTelemetrySnapshot {
  source: 'navigator.connection' | 'fallback';
  effectiveType: string;
  rttMs: number;
  downlinkMbps: number;
}
