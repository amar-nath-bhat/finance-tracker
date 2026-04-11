"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";

type ChartSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  selectedItems: string[];
  onSave: (selected: string[]) => void;
  hierarchy?: Record<string, string[]>;
};

export function ChartSettingsModal({ isOpen, onClose, title, items, selectedItems, onSave, hierarchy }: ChartSettingsModalProps) {
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedItems));

  useEffect(() => {
    if (isOpen) {
      setLocalSelected(new Set(selectedItems));
    }
  }, [isOpen, selectedItems, items]);

  if (!isOpen) return null;

  const toggleItem = (item: string) => {
    const next = new Set(localSelected);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setLocalSelected(next);
  };

  const toggleParent = (children: string[]) => {
    const next = new Set(localSelected);
    const allSelected = children.every(c => next.has(c));
    children.forEach(c => {
      if (allSelected) next.delete(c);
      else next.add(c);
    });
    setLocalSelected(next);
  };

  const getAllItems = () => {
    const all = new Set(items);
    if (hierarchy) {
      Object.values(hierarchy).flat().forEach(c => all.add(c));
    }
    return Array.from(all);
  };

  const selectAll = () => setLocalSelected(new Set(getAllItems()));
  const deselectAll = () => setLocalSelected(new Set());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-xl animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <button onClick={selectAll} className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Select All</button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button onClick={deselectAll} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium hover:underline">Deselect All</button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[150px] space-y-2 pr-2 custom-scrollbar">
          {items.length === 0 && (!hierarchy || Object.keys(hierarchy).length === 0) ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No items available.</p>
          ) : (
            <>
              {hierarchy && Object.entries(hierarchy).map(([parent, children]) => (
                <div key={parent} className="mb-4">
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors font-medium">
                    <input
                      type="checkbox"
                      checked={children.length > 0 && children.every(c => localSelected.has(c))}
                      onChange={() => toggleParent(children)}
                      className="w-4 h-4 text-emerald-500 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-800 dark:text-slate-200">{parent}</span>
                  </label>
                  {children.length > 0 && (
                    <div className="pl-6 space-y-1 mt-1">
                      {children.map(child => (
                        <label key={child} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={localSelected.has(child)}
                            onChange={() => toggleItem(child)}
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {child.includes(': ') ? child.split(': ')[1] : child}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {items.filter(item => !hierarchy || !Object.values(hierarchy).flat().includes(item)).map(item => (
                <label key={item} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={localSelected.has(item)}
                    onChange={() => toggleItem(item)}
                    className="w-4 h-4 text-emerald-500 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                </label>
              ))}
            </>
          )}
        </div>

        <div className="mt-6">
          <button 
            onClick={() => {
              onSave(Array.from(localSelected));
              onClose();
            }} 
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors text-sm shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
