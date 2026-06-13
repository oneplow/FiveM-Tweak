import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

export function CustomSelect({ value, onChange, options, disabled }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div
        className={`select-field flex items-center justify-between transition-colors ${
          !disabled ? 'cursor-pointer hover:border-[var(--border-subtle)]' : ''
        } ${isOpen ? '!border-[var(--accent)]' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ paddingRight: '14px', backgroundImage: 'none' }}
      >
        <span className="truncate pr-4">{selectedOption?.label}</span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-2 left-0 right-0 rounded-xl shadow-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div
              className="max-h-60 overflow-y-auto py-1 custom-scrollbar"
              style={{ overscrollBehavior: 'contain' }}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center ${
                      isSelected ? 'font-semibold bg-[var(--bg-surface-hover)] text-[var(--accent)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    {option.label}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
