import React, { useEffect, useRef, useState } from 'react';

/**
 * 极致流畅硬件加速阶梯式滚动舒展动效与非可视区域虚拟挂载 Hook
 *
 * 核心特性：
 * 1. 非可视区域不渲染 (Virtualization & Offscreen Pruning)：
 *    距离当前可视区域较远的菜品仅渲染极轻量结构占位，进入可视区缓冲带时才挂载真实节点。
 * 2. 阶梯式缓慢渲染从顶部开始 (Top-to-Bottom Slow Cascade)：
 *    在当前视口内，从顶部卡片开始顺次递进（每阶梯间隔 ~75ms），以平滑渐进的动画曲线优雅入场。
 * 3. 纯净无模糊质感 (No Blur Effect)：
 *    纯粹依赖平滑位移与透明度过渡，杜绝一切滤镜模糊，保持高对比度与清晰度。
 * 4. 滚动实时计算：
 *    用户滚动或指针滑移时，动态检测新进视口的卡片并自顶部/滑入方向顺次开启动画。
 */

let sharedRevealObserver: IntersectionObserver | null = null;
let sharedNearObserver: IntersectionObserver | null = null;
let currentScrollContainer: HTMLElement | null = null;

let pendingVisibleEntries: IntersectionObserverEntry[] = [];
let batchRafId: number | null = null;

function processBatch() {
  if (pendingVisibleEntries.length === 0) return;

  // 根据在屏幕中的垂直绝对坐标进行排序（从顶部开始阶梯式递进）
  const sorted = [...pendingVisibleEntries].sort(
    (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
  );

  sorted.forEach((entry, idx) => {
    const target = entry.target as HTMLElement;
    if (!target) return;

    // 阶梯式延迟：从顶部开始每阶间隔 75ms，最大累积 450ms
    const staggerDelay = Math.min(idx * 75, 450);
    target.style.setProperty('--stagger-delay', `${staggerDelay}ms`);
    target.setAttribute('data-reveal', 'visible');

    (target as any).__onRevealChange?.(true);
  });

  pendingVisibleEntries = [];
  batchRafId = null;
}

function getScrollContainer(): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  return (
    document.getElementById('main-content-scroll-area') ||
    document.querySelector('.overflow-y-auto') ||
    null
  );
}

function initObservers(): boolean {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return false;
  }

  const container = getScrollContainer();
  if (sharedRevealObserver && currentScrollContainer === container) {
    return true;
  }

  if (sharedRevealObserver) sharedRevealObserver.disconnect();
  if (sharedNearObserver) sharedNearObserver.disconnect();

  currentScrollContainer = container;

  // 1. 可视区进入动效监听（贴紧视口边缘，确保滚动进入瞬间触发阶梯动画）
  sharedRevealObserver = new IntersectionObserver(
    (entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const target = entry.target as HTMLElement;
        if (!target) continue;

        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          pendingVisibleEntries.push(entry);
        } else {
          // 移出视口：立刻根据离开方向重置为待入场状态（准备下一次滚动进入时重新阶梯渲染）
          const rootTop = entry.rootBounds ? entry.rootBounds.top : 0;
          const isAbove = entry.boundingClientRect.top < rootTop;
          target.setAttribute('data-reveal', isAbove ? 'hidden-up' : 'hidden-down');
          target.style.removeProperty('--stagger-delay');
          (target as any).__onRevealChange?.(false);
        }
      }

      if (pendingVisibleEntries.length > 0 && batchRafId === null) {
        batchRafId = requestAnimationFrame(processBatch);
      }
    },
    {
      root: currentScrollContainer,
      rootMargin: '10px 0px -10px 0px',
      threshold: [0, 0.05],
    }
  );

  // 2. 视口近距离缓冲监听（控制非可视区域是否渲染完整真实卡片，上下缓冲 380px）
  sharedNearObserver = new IntersectionObserver(
    (entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const target = entry.target as HTMLElement;
        if (!target) continue;
        const isNear = entry.isIntersecting || entry.intersectionRatio > 0;
        (target as any).__onNearChange?.(isNear);
      }
    },
    {
      root: currentScrollContainer,
      rootMargin: '380px 0px 380px 0px',
      threshold: 0,
    }
  );

  return true;
}

export const organicCardScrollVariants = {};

export function useCardScrollReveal(options?: { className?: string; lazyLoad?: boolean }) {
  const elementRef = useRef<HTMLElement | null>(null);
  const revealClass = options?.className || 'organic-card-reveal';
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (!el.classList.contains(revealClass)) {
      el.classList.add(revealClass);
    }

    (el as any).__onRevealChange = (visible: boolean) => {
      setIsVisible(visible);
    };

    (el as any).__onNearChange = (near: boolean) => {
      setIsNearViewport(near);
    };

    const hasObserver = initObservers();
    if (!hasObserver || !sharedRevealObserver || !sharedNearObserver) {
      setIsNearViewport(true);
      setIsVisible(true);
      el.setAttribute('data-reveal', 'visible');
      return;
    }

    sharedNearObserver.observe(el);
    sharedRevealObserver.observe(el);

    // 初始位置探测
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.top < vh + 380 && rect.bottom > -380) {
      setIsNearViewport(true);
    }
    if (rect.top < vh - 20 && rect.bottom > 20) {
      pendingVisibleEntries.push({
        target: el,
        boundingClientRect: rect,
        intersectionRatio: 1,
        isIntersecting: true,
      } as unknown as IntersectionObserverEntry);
      if (batchRafId === null) {
        batchRafId = requestAnimationFrame(processBatch);
      }
    }

    return () => {
      if (el) {
        sharedRevealObserver?.unobserve(el);
        sharedNearObserver?.unobserve(el);
        delete (el as any).__onRevealChange;
        delete (el as any).__onNearChange;
      }
    };
  }, []);

  return {
    elementRef,
    currentVariant: isVisible ? 'visible' : 'hidden',
    isVisible,
    isNearViewport: options?.lazyLoad === false ? true : isNearViewport,
  };
}

export const OrganicCardReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}> = ({ children, className = '', style, id, onClick }) => {
  const { elementRef, isNearViewport } = useCardScrollReveal();
  return (
    <div
      ref={elementRef as any}
      id={id}
      onClick={onClick}
      data-reveal="hidden-down"
      style={style}
      className={`organic-card-reveal ${className}`}
    >
      {isNearViewport ? children : <div className="w-full h-36 bg-neutral-100/50 rounded-lg" />}
    </div>
  );
};
