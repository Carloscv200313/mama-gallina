"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CatalogOption } from "@/lib/pos/types";

type Props = {
  options: CatalogOption[];
  selectedIds: string[];
  onChange: (optionId: string) => void;
  placeholder: string;
  maxSelections?: number | null;
};

export function MultiCheckboxSelect({ options, selectedIds, onChange, placeholder, maxSelections }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedNames = options.filter((option) => selectedIds.includes(option.id)).map((option) => option.name);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return <div ref={containerRef} className="relative">
    <button type="button" className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-brand-olive/20 bg-white px-3 text-left text-sm transition hover:border-brand-olive/40" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span className={selectedNames.length ? "text-brand-forest" : "text-brand-olive/70"}>{selectedNames.length ? selectedNames.join(", ") : placeholder}</span>
      <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open ? <div className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-40 max-h-64 overflow-y-auto rounded-xl border border-brand-olive/20 bg-white p-2 shadow-xl">
      {options.map((option) => {
        const checked = selectedIds.includes(option.id);
        const limitReached = maxSelections !== null && maxSelections !== undefined && selectedIds.length >= maxSelections && !checked;
        return <label key={option.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg p-3 text-sm transition ${limitReached ? "cursor-not-allowed opacity-45" : "hover:bg-brand-cream"}`}>
          <span className="flex items-center gap-2"><input type="checkbox" checked={checked} disabled={limitReached} onChange={() => onChange(option.id)} />{option.name}</span>
          {option.additionalPrice > 0 ? <span className="text-xs text-brand-olive">+ S/ {option.additionalPrice.toFixed(2)}</span> : null}
        </label>;
      })}
      {maxSelections !== null && maxSelections !== undefined ? <p className="px-3 pb-1 pt-2 text-[11px] text-brand-olive">Máximo: {maxSelections}</p> : null}
    </div> : null}
  </div>;
}

