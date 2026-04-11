"use client";
import { X, Calendar, BarChart2, Clock } from "lucide-react";

type TrendSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentRange: string;
  onSave: (range: string) => void;
};

export function TrendSettingsModal({ isOpen, onClose, currentRange, onSave }: TrendSettingsModalProps) {
  if (!isOpen) return null;

  const ranges = [
    { id: 'week', label: 'Weekly', desc: 'Last 12 weeks breakdown', icon: Clock },
    { id: 'month', label: 'Monthly', desc: 'Last 12 months overview', icon: Calendar },
    { id: 'year', label: 'Yearly', desc: 'Last 5 years trend', icon: BarChart2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-xl animate-in zoom-in-95 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Trend Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {ranges.map((range) => {
            const Icon = range.icon;
            const isSelected = currentRange === range.id;
            return (
              <button
                key={range.id}
                onClick={() => {
                  onSave(range.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected 
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-semibold ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {range.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {range.desc}
                  </div>
                </div>
                {isSelected && (
                  <div className="ml-auto">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="mt-8">
          <button 
            onClick={onClose}
            className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl transition-all active:scale-[0.98] text-sm shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
