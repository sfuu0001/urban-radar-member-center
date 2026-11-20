import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers } from 'lucide-react';

export interface ViewSwitcherOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface ViewSwitcherDropdownProps<T extends string = string> {
  value: T;
  options: readonly ViewSwitcherOption<T>[];
  onChange: (value: T) => void;
  prefixLabel?: string;
}

export function ViewSwitcherDropdown<T extends string>({
  value,
  options,
  onChange,
  prefixLabel = '当前视图'
}: ViewSwitcherDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full h-9 px-3 rounded-[10px] bg-[#f8f9fa] hover:bg-neutral-100/80 border border-black/[0.08] flex items-center justify-between gap-2 text-left transition active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-md bg-white border border-black/[0.06] flex items-center justify-center shrink-0 text-[#059669]">
            <Layers className="w-3 h-3" />
          </span>
          <span className="text-[11px] font-semibold text-neutral-400 shrink-0">
            {prefixLabel}
          </span>
          <span className="text-neutral-300 shrink-0" aria-hidden="true">
            ·
          </span>
          <span className="text-xs font-bold text-neutral-900 truncate">
            {activeOption?.label}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-neutral-900' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="界面切换列表"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl bg-white border border-black/[0.08] shadow-[0_14px_32px_-8px_rgba(15,23,42,0.18)] p-1.5 space-y-1"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#ecfdf5] text-[#065f46] ring-1 ring-[#10b981]/30'
                    : 'hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{opt.label}</div>
                  {opt.description && (
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        isSelected ? 'text-[#047857]/80' : 'text-neutral-400'
                      }`}
                    >
                      {opt.description}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-[#10b981]/15 text-[#059669] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" strokeWidth={2.6} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
