import React from 'react';

interface DishThumbIllustrationProps {
  dishId?: string;
  category: string;
  name: string;
  size?: 'sm' | 'md' | 'banner';
  muted?: boolean;
}

/**
 * 精致餐饮矢量图徽：零外链破图风险，为每道招牌菜品提供专属手绘级矢量插画。
 */
export const DishThumbIllustration: React.FC<DishThumbIllustrationProps> = ({
  dishId,
  category,
  name,
  size = 'md',
  muted = false
}) => {
  const containerClass =
    size === 'banner'
      ? 'w-full h-20 rounded-xl'
      : size === 'sm'
        ? 'w-12 h-12 rounded-xl'
        : 'w-[68px] h-[68px] rounded-xl';

  const bgTone = (() => {
    if (muted) return 'bg-neutral-100 border-neutral-200';
    switch (category) {
      case 'drinks':
        return 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/70 border-emerald-200/70';
      case 'skewers':
      case 'yakitori':
        return 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/60 border-amber-200/70';
      case 'desserts':
        return 'bg-gradient-to-br from-emerald-50/60 via-white to-neutral-100/70 border-black/[0.08]';
      default:
        return 'bg-gradient-to-br from-neutral-50 via-white to-neutral-100/80 border-black/[0.09]';
    }
  })();

  const renderArtwork = () => {
    // 1. 和牛厚牛堡
    if (dishId === 'dish-wagyu-burger') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full p-1.5" aria-hidden="true">
          <ellipse cx="32" cy="52" rx="22" ry="4" fill="#141413" opacity="0.08" />
          {/* Bottom bun */}
          <path d="M14 43 C14 48, 50 48, 50 43 L48 40 L16 40 Z" fill="#D99B52" stroke="#141413" strokeWidth="1.6" />
          {/* Wagyu patty */}
          <rect x="12" y="33" width="40" height="7" rx="3.5" fill="#4A2518" stroke="#141413" strokeWidth="1.6" />
          {/* Melted cheddar */}
          <path d="M13 33 L24 33 L29 38 L35 33 L51 33 L49 30 L15 30 Z" fill="#FBBF24" stroke="#141413" strokeWidth="1.4" strokeLinejoin="round" />
          {/* Lettuce */}
          <path d="M13 29 Q18 25 23 29 T33 29 T43 29 T51 29" fill="none" stroke="#10B981" strokeWidth="3.2" strokeLinecap="round" />
          {/* Top brioche bun */}
          <path d="M14 27 C14 14, 50 14, 50 27 Z" fill="#E5A95E" stroke="#141413" strokeWidth="1.6" />
          {/* Sesame seeds */}
          <circle cx="25" cy="20" r="1.2" fill="#FFFBEB" />
          <circle cx="33" cy="18" r="1.2" fill="#FFFBEB" />
          <circle cx="40" cy="21" r="1.2" fill="#FFFBEB" />
        </svg>
      );
    }

    // 2. 冷萃美式 / 气泡茶饮
    if (dishId === 'dish-coldbrew' || dishId === 'dish-yuzu-soda' || category === 'drinks') {
      const isYuzu = dishId === 'dish-yuzu-soda';
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full p-1.5" aria-hidden="true">
          <ellipse cx="32" cy="54" rx="15" ry="3.2" fill="#141413" opacity="0.08" />
          {/* Cup body */}
          <path d="M20 18 L44 18 L40 51 C40 52.5 24 52.5 24 51 Z" fill="#FFFFFF" stroke="#141413" strokeWidth="1.6" strokeLinejoin="round" />
          {/* Liquid */}
          <path
            d="M21.5 25 L42.5 25 L39.5 49.5 C39.5 50.5 24.5 50.5 24.5 49.5 Z"
            fill={isYuzu ? '#A7F3D0' : '#3E2723'}
          />
          {/* Ice cubes */}
          <rect x="25" y="27" width="6.5" height="6.5" rx="1.2" transform="rotate(-10 28 30)" fill="#FFFFFF" opacity="0.45" />
          <rect x="33" y="29" width="6" height="6" rx="1.2" transform="rotate(14 36 32)" fill="#FFFFFF" opacity="0.38" />
          {/* Lid + Straw */}
          <path d="M18 18 L46 18 L44 14 L20 14 Z" fill="#141413" />
          <path d="M35 14 L38 7 L43 6" fill="none" stroke={isYuzu ? '#059669' : '#D97706'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          {isYuzu && <circle cx="31" cy="39" r="3.2" fill="#FBBF24" opacity="0.85" />}
        </svg>
      );
    }

    // 3. 烤串 / 烧鸟 / 黑虎虾
    if (category === 'skewers' || category === 'yakitori') {
      const isShrimp = dishId === 'dish-garlic-shrimp';
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full p-1.5" aria-hidden="true">
          {/* Diagonal skewer sticks */}
          <line x1="12" y1="52" x2="50" y2="14" stroke="#A16207" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="54" x2="54" y2="18" stroke="#A16207" strokeWidth="1.7" strokeLinecap="round" opacity="0.7" />
          {isShrimp ? (
            <>
              <path d="M26 36 C21 29, 28 21, 36 25 C39 27, 37 33, 32 34 Z" fill="#FB923C" stroke="#141413" strokeWidth="1.5" />
              <path d="M35 27 C30 20, 37 13, 45 17 C48 19, 46 25, 41 26 Z" fill="#F97316" stroke="#141413" strokeWidth="1.5" />
            </>
          ) : (
            <>
              <rect x="21" y="34" width="10" height="8" rx="2.5" transform="rotate(-45 26 38)" fill="#7C2D12" stroke="#141413" strokeWidth="1.5" />
              <rect x="29" y="26" width="10" height="8" rx="2.5" transform="rotate(-45 34 30)" fill="#9A3412" stroke="#141413" strokeWidth="1.5" />
              <rect x="37" y="18" width="10" height="8" rx="2.5" transform="rotate(-45 42 22)" fill="#7C2D12" stroke="#141413" strokeWidth="1.5" />
            </>
          )}
          {/* Subtle grill smoke */}
          <path d="M16 20 Q18 16 16 12" fill="none" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M23 16 Q25 12 23 9" fill="none" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    }

    // 4. 黑松露薯条
    if (dishId === 'dish-truffle-fries' || category === 'snacks') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full p-1.5" aria-hidden="true">
          <ellipse cx="32" cy="53" rx="16" ry="3.2" fill="#141413" opacity="0.08" />
          {/* Fries sticks */}
          <rect x="20" y="13" width="5" height="24" rx="1.5" transform="rotate(-8 22 25)" fill="#FBBF24" stroke="#141413" strokeWidth="1.4" />
          <rect x="27" y="10" width="5" height="26" rx="1.5" fill="#F59E0B" stroke="#141413" strokeWidth="1.4" />
          <rect x="34" y="12" width="5" height="25" rx="1.5" transform="rotate(6 36 24)" fill="#FBBF24" stroke="#141413" strokeWidth="1.4" />
          <rect x="40" y="16" width="4.5" height="21" rx="1.5" transform="rotate(14 42 26)" fill="#FCD34D" stroke="#141413" strokeWidth="1.4" />
          {/* Black obsidian cup */}
          <path d="M18 30 L46 30 L42 51 L22 51 Z" fill="#141413" stroke="#141413" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="25" y1="40" x2="39" y2="40" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    // 5. 宇治抹茶巴斯克
    if (category === 'desserts') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full p-1.5" aria-hidden="true">
          <ellipse cx="32" cy="50" rx="20" ry="4" fill="#141413" opacity="0.08" />
          {/* Cake wedge */}
          <path d="M14 44 L50 44 L48 25 L16 29 Z" fill="#34D399" stroke="#141413" strokeWidth="1.6" strokeLinejoin="round" />
          {/* Caramelized burnt top */}
          <path d="M16 29 L48 25 L41 18 L18 22 Z" fill="#78350F" stroke="#141413" strokeWidth="1.6" strokeLinejoin="round" />
          {/* Flowing matcha center */}
          <path d="M26 28 C27 36, 33 36, 35 27" fill="#059669" />
        </svg>
      );
    }

    // 6. 主食盖饭 / 默认主厨出品
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full p-1.5" aria-hidden="true">
        <ellipse cx="32" cy="51" rx="19" ry="3.5" fill="#141413" opacity="0.08" />
        {/* Bowl */}
        <path d="M13 31 L51 31 C50 45, 42 49, 32 49 C22 49, 14 45, 13 31 Z" fill="#141413" stroke="#141413" strokeWidth="1.6" />
        {/* Rice & topping */}
        <path d="M15 31 C18 21, 46 21, 49 31 Z" fill="#FFFFFF" stroke="#141413" strokeWidth="1.5" />
        {/* Onsen egg */}
        <circle cx="32" cy="25" r="5" fill="#F59E0B" stroke="#141413" strokeWidth="1.3" />
        {/* Chopsticks */}
        <line x1="39" y1="15" x2="54" y2="21" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div
      aria-label={name}
      className={`${containerClass} border ${bgTone} flex items-center justify-center shrink-0 select-none overflow-hidden ${
        muted ? 'grayscale opacity-70' : ''
      }`}
    >
      {renderArtwork()}
    </div>
  );
};
