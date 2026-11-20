import React from 'react';
import { ArrowLeft, Bell, BellOff, RefreshCw } from 'lucide-react';

export interface UnifiedPageHeaderProps {
  title: string;
  /** 返回按钮点击回调 */
  onBack?: () => void;
  backLabel?: string;
  /** 标题旁状态圆点：online = 翠绿高亮，offline = 灰色离线 */
  statusTone?: 'online' | 'offline';
  statusTitle?: string;
  /** 右侧工具栏 第 1 颗：主联动/控制台按钮（默认翠绿高亮态） */
  primaryActive?: boolean;
  onPrimaryClick?: () => void;
  primaryTitle?: string;
  /** 右侧工具栏 第 2 颗：刷新/同步按钮 */
  isRefreshing?: boolean;
  onRefreshClick?: () => void;
  refreshTitle?: string;
  /** 右侧工具栏 第 3 颗：通知开关按钮 */
  notificationOn?: boolean;
  onNotificationClick?: () => void;
  notificationTitle?: string;
  /** 可选吸顶定位类名 */
  stickyClassName?: string;
  /** 右侧刷新/保存按钮的未保存提醒角标 */
  refreshBadge?: boolean;
  /** 标题旁交互式等级徽章插槽 */
  titleBadge?: React.ReactNode;
}

/**
 * 顶部状态感知导航栏模板（统一应用于「会员特权与黑卡中心」与「会员资料与参数控制台」）
 * 结构：[ 蓝色返回方块 ]  [ 加粗标题 + 翠绿光晕圆点 + 可选徽章 ]   [ (雷达/联动) | (刷新) | (通知) ]
 */
export const UnifiedPageHeader: React.FC<UnifiedPageHeaderProps> = ({
  title,
  onBack,
  backLabel = '返回',
  statusTone = 'online',
  statusTitle,
  primaryActive = true,
  onPrimaryClick,
  primaryTitle = '实时联动',
  isRefreshing = false,
  onRefreshClick,
  refreshTitle = '刷新同步',
  notificationOn = true,
  onNotificationClick,
  notificationTitle,
  stickyClassName = '',
  refreshBadge = false,
  titleBadge
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <header
      data-purpose="page-header"
      className={`w-full bg-white/95 backdrop-blur-md border-b border-black/[0.06] px-3 py-2 ${stickyClassName}`}
    >
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* 左侧：独立返回按钮 + 标题 + 状态指示 + 可选等级徽章 */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleBack}
            aria-label={backLabel}
            title={backLabel}
            className="w-10 h-10 rounded-xl bg-white border border-black/[0.08] shadow-[0_1px_2px_rgba(20,20,19,0.04)] flex items-center justify-center shrink-0 hover:bg-neutral-50 active:scale-95 transition cursor-pointer group"
          >
            <ArrowLeft
              className="w-[18px] h-[18px] text-[#141413] transition-transform group-hover:-translate-x-0.5"
              strokeWidth={2.1}
            />
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[16px] sm:text-[17px] font-black tracking-tight text-[#141413] leading-none whitespace-nowrap shrink-0">
              {title}
            </h1>
            <span
              title={statusTitle || (statusTone === 'online' ? '服务在线' : '离线 / 访客态')}
              aria-label={statusTitle || (statusTone === 'online' ? '服务在线' : '离线 / 访客态')}
              className={`w-2 h-2 rounded-full shrink-0 ${
                statusTone === 'online' ? 'bg-emerald-500' : 'bg-neutral-400'
              }`}
            />
            {titleBadge && <div className="min-w-0 shrink-0">{titleBadge}</div>}
          </div>
        </div>

        {/* 右侧：轻量去边框工具槽（≥40px 舒适触控热区） */}
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#f4f4f5] border border-black/[0.05] shrink-0">
          {/* Slot 1: 同心雷达 / 实时联动按钮 */}
          <button
            type="button"
            onClick={onPrimaryClick}
            aria-label={primaryTitle}
            title={primaryTitle}
            aria-pressed={primaryActive}
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition active:scale-95 cursor-pointer ${
              primaryActive
                ? 'bg-white text-emerald-700 shadow-[0_1px_3px_rgba(20,20,19,0.08)]'
                : 'text-neutral-600 hover:bg-white/70 hover:text-[#141413]'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-[17px] h-[17px]"
              aria-hidden="true"
            >
              <path
                d="M12 4.2a7.8 7.8 0 0 1 7.62 6.1"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
              <path
                d="M12 19.8a7.8 7.8 0 0 1-7.62-6.1"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
              <path
                d="M6.45 6.5A7.8 7.8 0 0 1 12 4.2"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
              <path
                d="M17.55 17.5A7.8 7.8 0 0 1 12 19.8"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="1.45" fill="currentColor" />
              <circle cx="12" cy="4.2" r="1.65" fill="currentColor" />
              <circle cx="12" cy="19.8" r="1.65" fill="currentColor" />
            </svg>
          </button>

          {/* Slot 2: 刷新 / 同步按钮 */}
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={isRefreshing}
            aria-label={refreshTitle}
            title={refreshTitle}
            className="relative w-9 h-9 rounded-[10px] text-[#141413] hover:bg-white/80 flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-[15px] h-[15px] ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}
              strokeWidth={2}
            />
            {refreshBadge && !isRefreshing && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[#f4f4f5]"
              />
            )}
          </button>

          {/* Slot 3: 通知铃铛按钮 */}
          <button
            type="button"
            onClick={onNotificationClick}
            aria-label={notificationTitle || (notificationOn ? '关闭通知' : '开启通知')}
            title={
              notificationTitle ||
              (notificationOn ? '通知已开启（点击关闭）' : '通知已关闭（点击开启）')
            }
            className="relative w-9 h-9 rounded-[10px] hover:bg-white/80 flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            {notificationOn ? (
              <Bell className="w-[15px] h-[15px] text-[#141413]" strokeWidth={2} />
            ) : (
              <BellOff className="w-[15px] h-[15px] text-neutral-400" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
