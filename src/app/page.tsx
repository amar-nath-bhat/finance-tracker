"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area, CartesianGrid, LineChart, Line } from "recharts";
import { TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, Landmark, Settings, CalendarDays, ChevronDown } from "lucide-react";
import { ChartSettingsModal } from "@/components/ChartSettingsModal";
import { DashboardTrendsChart } from "@/components/DashboardTrendsChart";
import { TrendSettingsModal } from "@/components/TrendSettingsModal";
import { useTheme } from "next-themes";

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [subCategoryMap, setSubCategoryMap] = useState<Record<string, string[]>>({});
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // '' = all time
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  
  // Trend Settings
  const [trendRange, setTrendRange] = useState<string>('month');
  const [isTrendModalOpen, setIsTrendModalOpen] = useState(false);
  
  // Top Categories Settings
  const [topChartSelectedCategories, setTopChartSelectedCategories] = useState<string[]>([]);
  const [isTopChartModalOpen, setIsTopChartModalOpen] = useState(false);

  const { theme } = useTheme();

  const fetchDashboard = useCallback((month: string, tRange: string) => {
    let url = `/api/dashboard?trendRange=${tRange}`;
    if (month) url += `&month=${month}`;

    fetch(url)
      .then(r => r.json())
      .then(d => {
        setData(d);
        const savedCats = localStorage.getItem('chartSettings_cats');
        const savedSubCats = localStorage.getItem('chartSettings_subCats');
        const savedTopCats = localStorage.getItem('chartSettings_topCats');
        const savedTrendRange = localStorage.getItem('chartSettings_trendRange');

        if (savedTrendRange && savedTrendRange !== tRange) {
          setTrendRange(savedTrendRange);
        }

        if (savedCats) {
          const parsed = JSON.parse(savedCats);
          const available = d.categoryChartData?.map((item: any) => item.name) || [];
          setSelectedCategories(parsed.filter((c: string) => available.includes(c)));
        } else {
          setSelectedCategories(d.categoryChartData?.map((item: any) => item.name) || []);
        }

        if (savedSubCats) {
          const parsed = JSON.parse(savedSubCats);
          const available = d.subCategoryChartData?.map((item: any) => item.name) || [];
          setSelectedSubCategories(parsed.filter((c: string) => available.includes(c)));
        } else {
          setSelectedSubCategories(d.subCategoryChartData?.map((item: any) => item.name) || []);
        }

        if (savedTopCats) {
          const parsed = JSON.parse(savedTopCats);
          const available = d.categoryChartData?.map((item: any) => item.name) || [];
          setTopChartSelectedCategories(parsed.filter((c: string) => available.includes(c)));
        } else {
          setTopChartSelectedCategories(d.categoryChartData?.map((item: any) => item.name) || []);
        }
      });
  }, []);

  useEffect(() => {
    const savedTrendRange = localStorage.getItem('chartSettings_trendRange') || 'month';
    setTrendRange(savedTrendRange);
    fetchDashboard(selectedMonth, savedTrendRange);

    fetch('/api/settings').then(r => r.json()).then(d => {
      if(d.subCategories) {
        const transformed: Record<string, string[]> = {};
        for(const [cat, subCats] of Object.entries(d.subCategories)) {
          transformed[cat] = (subCats as string[]).map(s => `${cat}: ${s}`);
        }
        setSubCategoryMap(transformed);
      }
    });
  }, [selectedMonth, trendRange, fetchDashboard]);

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setIsMonthDropdownOpen(false);
  };

  const formatMonthLabel = (monthKey: string) => {
    if (!monthKey) return 'All Time';
    const [y, m] = monthKey.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  if (!data) return (
    <div className="p-8 flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full mb-4"></div>
        <div className="text-slate-400 dark:text-slate-500">Loading your finances...</div>
      </div>
    </div>
  );

  const filteredCategoryData = data?.categoryChartData?.filter((d: any) => selectedCategories.includes(d.name)) || [];
  const filteredSubCategoryData = data?.subCategoryChartData?.filter((d: any) => 
    selectedSubCategories.includes(d.name) || selectedSubCategories.some((s: string) => d.name.endsWith(`: ${s}`))
  ) || [];

  // Top 5 categories for horizontal bar
  const top5Categories = (data?.categoryChartData || [])
    .filter((c: any) => topChartSelectedCategories.includes(c.name))
    .slice(0, 5);
  const totalExpenseForPct = top5Categories.reduce((s: number, c: any) => s + c.value, 0);

  const colors = [
    '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899',
    '#14b8a6', '#6366f1', '#f43f5e', '#84cc16', '#a855f7', '#0ea5e9', '#f97316',
    '#22c55e', '#eab308', '#dc2626', '#2563eb', '#d946ef', '#16a34a'
  ];

  const handleChartClick = (categoryStr: string) => {
    const baseCategory = categoryStr.split(':')[0].trim();
    router.push(`/transactions?category=${encodeURIComponent(baseCategory)}`);
  };

  const availableMonths: string[] = data?.availableMonths || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header with Global Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Financial Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time analysis of your accounts and debts.</p>
        </div>

        {/* Month Selector */}
        <div className="relative">
          <button
            onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 transition-all text-sm font-medium text-slate-700 dark:text-slate-200 min-w-[180px]"
          >
            <CalendarDays className="w-4 h-4 text-emerald-500" />
            <span className="flex-1 text-left">{formatMonthLabel(selectedMonth)}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMonthDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMonthDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="max-h-72 overflow-y-auto">
                  <button
                    onClick={() => handleMonthChange('')}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                      selectedMonth === '' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedMonth === '' ? 'bg-emerald-500' : 'bg-transparent'}`} />
                    All Time
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-800" />
                  {availableMonths.map(m => (
                    <button
                      key={m}
                      onClick={() => handleMonthChange(m)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                        selectedMonth === m 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold' 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedMonth === m ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      {formatMonthLabel(m)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 shrink-0">
              <Landmark className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{selectedMonth ? 'Period Balance' : 'Current Balance'}</p>
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-50 break-words">₹{data.currentBalance.toFixed(2)}</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-auto">Starting + Income - Expenses</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Net Worth</p>
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-50 break-words">₹{data.netWorth.toFixed(2)}</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-auto">Balance + Owed To Me - Owed By Me</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 shrink-0">
              <ArrowDownRight className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{selectedMonth ? 'Monthly Expenses' : 'Net Expenses'}</p>
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-50 break-words">₹{(data.netExpenses || 0).toFixed(2)}</h3>
            </div>
          </div>
          <div className="text-xs text-red-500 dark:text-red-400 mt-auto font-medium flex items-center gap-1">
            <CreditCard className="w-3 h-3 shrink-0" />
            <span>₹{data.totalCreditCardExpenses.toFixed(2)} on Credit</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 shrink-0">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{selectedMonth ? 'Monthly Income' : 'Total Income'}</p>
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-50 break-words">₹{(data.totalSalaryIncome || 0).toFixed(2)}</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-auto">From SALARY category</div>
        </div>
      </div>

      <DashboardTrendsChart selectedMonth={selectedMonth} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Expenses by Category</h2>
            <button onClick={() => setIsCategoryModalOpen(true)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Chart Settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            {filteredCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    handleChartClick(e.activePayload[0].payload.name);
                  }
                }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    cursor={{ fill: theme === 'dark' ? 'rgba(100, 116, 139, 0.2)' : '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: theme === 'dark' ? '1px solid #1e293b' : 'none', background: theme === 'dark' ? '#0f172a' : '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: theme === 'dark' ? '#e2e8f0' : '#475569' }}
                    formatter={(value: any, name: any) => [`₹${value}`, name ? String(name) : 'Amount']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {filteredCategoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} className="cursor-pointer hover:opacity-80 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                No expenses recorded{selectedMonth ? ' this month' : ''}.
              </div>
            )}
          </div>
        </div>

        {/* Subcategories Pie */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Deep Dive: Subcategories</h2>
            <button onClick={() => setIsSubCategoryModalOpen(true)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Chart Settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            {filteredSubCategoryData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart key={filteredSubCategoryData.map((d: any) => d.name).join()}>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: theme === 'dark' ? '1px solid #1e293b' : 'none', background: theme === 'dark' ? '#0f172a' : '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    itemStyle={{ color: theme === 'dark' ? '#e2e8f0' : '#475569' }}
                    formatter={(value: any, name: any) => {
                      const strName = name ? String(name) : '';
                      const shortName = strName.includes(': ') ? strName.split(': ')[1] : (strName || 'Amount');
                      return [`₹${value}`, shortName];
                    }} 
                  />
                  <Pie
                    data={filteredSubCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(entry: any) => handleChartClick(entry.name)}
                  >
                    {filteredSubCategoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={colors[(index + 3) % colors.length]} className="cursor-pointer hover:opacity-80 transition-opacity outline-none" />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                No subcategory expenses recorded{selectedMonth ? ' this month' : ''}.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expense Trend — Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Monthly Expense Trend</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {trendRange === 'week' ? 'Last 12 weeks breakdown' : trendRange === 'year' ? 'Last 5 years trend' : 'Last 12 months overview'}
              </p>
            </div>
            <button onClick={() => setIsTrendModalOpen(true)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Trend Settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            {(data?.monthlyTrend || []).some((m: any) => m.expenses > 0 || m.income > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} opacity={0.5} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: theme === 'dark' ? '1px solid #1e293b' : 'none', background: theme === 'dark' ? '#0f172a' : '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: theme === 'dark' ? '#f8fafc' : '#0f172a', marginBottom: '4px' }}
                    formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString()}`, name === 'expenses' ? 'Expenses' : 'Income']}
                  />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" name="expenses" />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incGrad)" name="income" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                No monthly data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Expense Categories — Horizontal Bars */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Top Spending Categories</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{selectedMonth ? formatMonthLabel(selectedMonth) : 'All time'} — by amount</p>
            </div>
            <button onClick={() => setIsTopChartModalOpen(true)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Chart Settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            {top5Categories.length > 0 ? (
              <div className="flex flex-col justify-center gap-4 h-full">
                {top5Categories.map((cat: any, i: number) => {
                  const pct = totalExpenseForPct > 0 ? (cat.value / totalExpenseForPct * 100) : 0;
                  return (
                    <div key={cat.name} className="group cursor-pointer" onClick={() => handleChartClick(cat.name)}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{cat.name}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">₹{cat.value.toLocaleString()}</span>
                      </div>
                      <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                          style={{ 
                            width: `${pct}%`, 
                            background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[(i + 2) % colors.length]})` 
                          }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{pct.toFixed(1)}% of top 5</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                No expenses recorded{selectedMonth ? ' this month' : ''}.
              </div>
            )}
          </div>
        </div>
      </div>

      <ChartSettingsModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Category Settings"
        items={data.categoryChartData?.map((d: any) => d.name) || []}
        selectedItems={selectedCategories}
        onSave={(cats) => {
          setSelectedCategories(cats);
          localStorage.setItem('chartSettings_cats', JSON.stringify(cats));
        }}
      />

      <ChartSettingsModal
        isOpen={isSubCategoryModalOpen}
        onClose={() => setIsSubCategoryModalOpen(false)}
        title="Subcategory Settings"
        items={data.subCategoryChartData?.map((d: any) => d.name) || []}
        selectedItems={selectedSubCategories}
        hierarchy={subCategoryMap}
        onSave={(cats) => {
          setSelectedSubCategories(cats);
          localStorage.setItem('chartSettings_subCats', JSON.stringify(cats));
        }}
      />

      <ChartSettingsModal
        isOpen={isTopChartModalOpen}
        onClose={() => setIsTopChartModalOpen(false)}
        title="Top Category Settings"
        items={data.categoryChartData?.map((d: any) => d.name) || []}
        selectedItems={topChartSelectedCategories}
        onSave={(cats) => {
          setTopChartSelectedCategories(cats);
          localStorage.setItem('chartSettings_topCats', JSON.stringify(cats));
        }}
      />

      <TrendSettingsModal
        isOpen={isTrendModalOpen}
        onClose={() => setIsTrendModalOpen(false)}
        currentRange={trendRange}
        onSave={(range) => {
          setTrendRange(range);
          localStorage.setItem('chartSettings_trendRange', range);
        }}
      />
    </div>
  );
}
