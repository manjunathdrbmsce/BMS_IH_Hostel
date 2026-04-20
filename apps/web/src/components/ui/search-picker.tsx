'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, ChevronDown } from 'lucide-react';

export interface SearchPickerOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchPickerProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch: (term: string) => Promise<SearchPickerOption[]>;
  error?: string;
  required?: boolean;
  debounceMs?: number;
  minSearchLength?: number;
  emptyMessage?: string;
  className?: string;
}

export function SearchPicker({
  label,
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,
  error,
  required,
  debounceMs = 300,
  minSearchLength = 2,
  emptyMessage = 'No results found',
  className,
}: SearchPickerProps) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<SearchPickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(
    async (term: string) => {
      if (term.length < minSearchLength) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await onSearch(term);
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [onSearch, minSearchLength],
  );

  const handleInputChange = (val: string) => {
    setSearch(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), debounceMs);
  };

  const handleSelect = (opt: SearchPickerOption) => {
    onChange(opt.value);
    setSelectedLabel(opt.label + (opt.sublabel ? ` — ${opt.sublabel}` : ''));
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSelectedLabel('');
    setSearch('');
    setOptions([]);
    inputRef.current?.focus();
  };

  const inputId = label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div ref={containerRef} className={cn('space-y-1 relative', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {value && selectedLabel ? (
        <div className="flex items-center gap-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
          <span className="flex-1 truncate">{selectedLabel}</span>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={search}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (search.length >= minSearchLength) setOpen(true); }}
            placeholder={placeholder}
            className={cn(
              'block w-full rounded-lg border bg-white pl-10 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              error ? 'border-red-300' : 'border-gray-300',
            )}
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-lg">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">Searching...</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {search.length < minSearchLength
                ? `Type at least ${minSearchLength} characters...`
                : emptyMessage}
            </div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors text-sm"
              >
                <div className="font-medium text-gray-900">{opt.label}</div>
                {opt.sublabel && (
                  <div className="text-xs text-gray-500 mt-0.5">{opt.sublabel}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
