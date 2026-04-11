"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";
import { ChartSettingsModal } from "./ChartSettingsModal";
import { Settings } from "lucide-react";

export function DashboardTrendsChart({ selectedMonth }: { selectedMonth?: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/transactions').then(r => r.json()).then(data => {
      setTransactions(data);
      setLoading(false);
      
      const uniqueCats = Array.from(new Set(data.map((t: any) => t.category))) as string[];
      setCategories(uniqueCats);
      const saved = localStorage.getItem('trendsChart_cats');
      if (saved) {
        setActiveCategories(JSON.parse(saved));
      } else {
        setActiveCategories(uniqueCats);
      }
    });
  }, []);

  const handleSaveSettings = (cats: string[]) => {
    setActiveCategories(cats);
    localStorage.setItem('trendsChart_cats', JSON.stringify(cats));
    setShowSettings(false);
  };

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    let filtered = transactions.filter(t => activeCategories.includes(t.category));

    // Filter by month if selected
    if (selectedMonth) {
      filtered = filtered.filter(t => {
        const td = new Date(t.date);
        const tKey = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}`;
        return tKey === selectedMonth;
      });
    }
    
    // Group by date
    const grouped = filtered.reduce((acc, t) => {
      const dateStr = new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!acc[dateStr]) {
        acc[dateStr] = { name: dateStr, income: 0, expense: 0, rawDate: new Date(t.date).getTime() };
      }
      if (t.type === 'CREDIT') acc[dateStr].income += t.amount;
      if (t.type === 'DEBIT') acc[dateStr].expense += t.amount;
      return acc;
    }, {} as Record<string, { name: string, income: number, expense: number, rawDate: number }>);
    
    return Object.values(grouped).sort((a: any, b: any) => a.rawDate - b.rawDate);
  }, [transactions, activeCategories, selectedMonth]);

  if (loading) return <div className="h-[300px] flex items-center justify-center text-slate-400">Loading trends...</div>;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Income vs Expenses over Time</h2>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
          No data available for selected categories.
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `₹${value}`} />
              <Tooltip 
                cursor={{ fill: theme === 'dark' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)' }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: theme === 'dark' ? '1px solid #1e293b' : 'none', 
                  background: theme === 'dark' ? '#0f172a' : '#fff', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                  color: theme === 'dark' ? '#f8fafc' : '#0f172a' 
                }}
                labelStyle={{ fontWeight: 'bold', color: theme === 'dark' ? '#f8fafc' : '#0f172a', marginBottom: '4px' }}
              />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showSettings && (
        <ChartSettingsModal
          isOpen={true}
          title="Filter Trends Categories"
          items={categories}
          selectedItems={activeCategories}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
