'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface FilterDropdownOption<T extends string | number> {
  value: T;
  label: string;
}

interface FilterDropdownProps<T extends string | number> {
  id: string;
  label: string;
  ariaLabel: string;
  value: T;
  options: readonly FilterDropdownOption<T>[];
  isOpen: boolean;
  onChange: (value: T) => void;
  onOpenChange: (isOpen: boolean) => void;
}

export default function FilterDropdown<T extends string | number>({
  id,
  label,
  ariaLabel,
  value,
  options,
  isOpen,
  onChange,
  onOpenChange,
}: FilterDropdownProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex(option => option.value === value);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const [highlightedIndex, setHighlightedIndex] = useState(activeIndex);
  const selectedOption = options[selectedIndex] ?? options[0];
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!isOpen) return;

    optionRefs.current[highlightedIndex]?.focus();
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      onOpenChange(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onOpenChange]);

  const selectOption = (index: number) => {
    const option = options[index];
    if (!option) return;

    onChange(option.value);
    onOpenChange(false);
    triggerRef.current?.focus();
  };

  const moveHighlight = (index: number) => {
    const nextIndex = Math.min(options.length - 1, Math.max(0, index));
    setHighlightedIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      onOpenChange(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightedIndex(Math.min(options.length - 1, Math.max(0, activeIndex + offset)));
      onOpenChange(true);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenChange(!isOpen);
    }
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveHighlight(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveHighlight(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveHighlight(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(index);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative flex min-w-40 flex-col gap-1.5">
      <span id={`${id}-label`} className="text-[10px] font-extrabold uppercase tracking-wider text-[#4b5563]">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={`${id}-label`}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => {
          setHighlightedIndex(activeIndex);
          onOpenChange(!isOpen);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`inline-flex min-h-11 md:min-h-9 w-full items-center justify-between gap-3 border border-[#b8bbc3] px-3 text-left text-xs font-bold text-[#0a0a0a] outline-none transition-[background-color,box-shadow,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#963300] ${
          isOpen
            ? 'border-[#0a0a0a] bg-[#f3f3f3] shadow-none translate-x-[1px] translate-y-[1px]'
            : 'bg-white shadow-[1px_1px_0_#d3d5db] hover:bg-[#f3f3f3]'
        }`}
      >
        <span>{selectedOption?.label ?? 'Select an option'}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-[14rem] overflow-y-auto border border-[#b8bbc3] bg-white p-1 shadow-[2px_2px_0_#c8c8c8]"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                key={`${id}-${String(option.value)}`}
                ref={element => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={isHighlighted ? 0 : -1}
                onClick={() => selectOption(index)}
                onKeyDown={event => handleOptionKeyDown(event, index)}
                onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex min-h-11 md:min-h-9 w-full items-center justify-between gap-3 px-3 text-left text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#963300] ${
                  isHighlighted ? 'bg-[#ff5500] text-[#0a0a0a]' : 'text-[#0a0a0a] hover:bg-[#ff5500] hover:text-[#0a0a0a]'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
