"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Edit2, X, Filter, Flag, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "./ConfirmModal";
import * as chrono from "chrono-node";

type Transaction = {
  _id?: string;
  type: string;
  date: string;
  category: string;
  subCategory?: string;
  description?: string;
  amount: number;
  paymentMethod: string;
  isFlagged?: boolean;
};

export function TransactionManager({ 
  title = "All Transactions"
}: { 
  title?: string;
}) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams?.get('category');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategoriesMap, setSubCategoriesMap] = useState<Record<string, string[]>>({});
  
  // Form & Delete State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'DEBIT',
    date: new Date().toISOString().split('T')[0],
    category: '',
    subCategory: '',
    description: '',
    amount: '' as any,
    paymentMethod: 'UPI'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter State
  const [showFilters, setShowFilters] = useState(!!initialCategory);
  const [smartSearch, setSmartSearch] = useState('');
  const [filters, setFilters] = useState({
    category: initialCategory || '',
    method: '',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    if (initialCategory) {
      setFilters(prev => ({ ...prev, category: initialCategory }));
      setShowFilters(true);
    }
  }, [initialCategory]);

  useEffect(() => {
    fetchData();
    fetch('/api/settings').then(r => r.json()).then(d => {
      if(d.categories) setCategories(d.categories);
      if(d.subCategories) setSubCategoriesMap(d.subCategories);
      if(d.categories?.length > 0 && !formData.category) {
         setFormData(prev => ({ ...prev, category: d.categories[0] }));
      }
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/transactions');
    const data = await res.json();
    setTransactions(data);
    setLoading(false);
  };

  const currentSubCats = subCategoriesMap[formData.category || ''] || [];

  const handleEdit = (t: Transaction) => {
    setEditingId(t._id as string);
    setErrors({});
    setFormData({
      ...t,
      date: new Date(t.date).toISOString().split('T')[0]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if(!deleteId) return;
    const res = await fetch(`/api/transactions?id=${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success("Transaction deleted");
      fetchData();
    } else {
      toast.error("Failed to delete");
    }
    setDeleteId(null);
  };

  const handleFlag = async (t: Transaction) => {
    const res = await fetch(`/api/transactions?id=${t._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...t, isFlagged: !t.isFlagged }),
    });
    if (res.ok) {
      toast.success(t.isFlagged ? "Flag removed" : "Transaction flagged");
      fetchData();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "Enter a valid amount > 0";
    }
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.paymentMethod) newErrors.paymentMethod = "Payment method is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const { _id, __v, ...cleanData } = formData as any;
    const dataToSubmit = {
      ...cleanData,
      amount: Number(formData.amount)
    };

    if (editingId) {
      const res = await fetch(`/api/transactions?id=${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });
      if (res.ok) {
        toast.success("Transaction updated!");
        fetchData();
        setEditingId(null);
        setErrors({});
        setFormData({
          type: 'DEBIT',
          date: new Date().toISOString().split('T')[0],
          category: categories.length > 0 ? categories[0] : '',
          subCategory: '',
          description: '',
          amount: '' as any,
          paymentMethod: 'UPI'
        });
      } else {
        toast.error("Update failed");
      }
    } else {
      const res = await fetch('/api/transactions', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });

      if (res.ok) {
        toast.success("Transaction added!");
        fetchData();
        setErrors({});
        setFormData({
          type: 'DEBIT',
          date: formData.date || new Date().toISOString().split('T')[0],
          category: formData.category || (categories.length > 0 ? categories[0] : ''),
          subCategory: '',
          description: '',
          amount: '' as any,
          paymentMethod: 'UPI'
        });
      } else {
        toast.error("Failed to add transaction");
      }
    }
  };

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      if (filters.category && t.category !== filters.category) return false;
      if (filters.method && t.paymentMethod !== filters.method) return false;
      if (filters.minAmount && t.amount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && t.amount > parseFloat(filters.maxAmount)) return false;
      return true;
    });

    if (smartSearch.trim()) {
      const parsedDates = chrono.parse(smartSearch);
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      let textRemainder = smartSearch.toLowerCase();

      if (parsedDates.length > 0) {
        startDate = parsedDates[0].start.date();
        if (parsedDates[0].end) {
          endDate = parsedDates[0].end.date();
        } else {
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
        }
        textRemainder = textRemainder.replace(parsedDates[0].text.toLowerCase(), '');
      }

      let typeFilter: string | null = null;
      const typeWords = [
        { word: 'spent', type: 'DEBIT' },
        { word: 'expense', type: 'DEBIT' },
        { word: 'income', type: 'CREDIT' },
        { word: 'earned', type: 'CREDIT' },
        { word: 'transfer', type: 'TRANSFER' }
      ];

      for (const tw of typeWords) {
        if (textRemainder.includes(tw.word)) {
          typeFilter = tw.type;
          textRemainder = textRemainder.replace(tw.word, '');
        }
      }

      let minAmount: number | null = null;
      let maxAmount: number | null = null;
      const overMatch = textRemainder.match(/(?:>|over|more than)\s+(\d+)/);
      if (overMatch) {
         minAmount = parseFloat(overMatch[1]);
         textRemainder = textRemainder.replace(overMatch[0], '');
      }
      const underMatch = textRemainder.match(/(?:<|under|less than)\s+(\d+)/);
      if (underMatch) {
         maxAmount = parseFloat(underMatch[1]);
         textRemainder = textRemainder.replace(underMatch[0], '');
      }

      const keyword = textRemainder.replace(/\b(on|for|in|at)\b/g, '').trim();

      result = result.filter(t => {
        const tDate = new Date(t.date);
        let dateMatch = true;
        
        if (startDate && endDate) {
          dateMatch = tDate >= startDate && tDate <= endDate;
        } else if (startDate) {
          const tDateString = tDate.toISOString().split('T')[0];
          const sDateString = startDate.toISOString().split('T')[0];
          dateMatch = tDateString === sDateString;
        }

        let typeMatch = true;
        if (typeFilter) {
          typeMatch = t.type === typeFilter;
        }

        let amountMatch = true;
        if (minAmount !== null && t.amount < minAmount) amountMatch = false;
        if (maxAmount !== null && t.amount > maxAmount) amountMatch = false;
        
        let keywordMatch = true;
        if (keyword) {
            keywordMatch = 
              (t.description || '').toLowerCase().includes(keyword) ||
              (t.category || '').toLowerCase().includes(keyword) ||
              (t.subCategory || '').toLowerCase().includes(keyword) ||
              (t.paymentMethod || '').toLowerCase().includes(keyword);
        }

        return dateMatch && typeMatch && amountMatch && keywordMatch;
      });
    }

    return result;
  }, [transactions, filters, smartSearch]);

  const cancelEdit = () => {
    setEditingId(null);
    setErrors({});
    setFormData({
      type: 'DEBIT',
      date: new Date().toISOString().split('T')[0],
      category: categories.length > 0 ? categories[0] : '',
      subCategory: '',
      description: '',
      amount: '' as any,
      paymentMethod: 'UPI'
    });
  };

  const badgeColors = ['bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800', 'bg-amber-100 text-amber-800', 'bg-purple-100 text-purple-800', 'bg-rose-100 text-rose-800', 'bg-cyan-100 text-cyan-800', 'bg-pink-100 text-pink-800'];
  const getBadgeColor = (category: string) => {
    const idx = categories.indexOf(category);
    return idx !== -1 ? badgeColors[idx % badgeColors.length] : 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Form Section */}
      <div className="w-full lg:w-1/3 shrink-0">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingId ? "Edit Transaction" : "Add Transaction"}</h2>
            {editingId && (
              <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <label className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 py-2.5 px-2 border dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input type="radio" name="type" className="text-emerald-500 accent-emerald-500" checked={formData.type === 'CREDIT'} onChange={() => setFormData({...formData, type: 'CREDIT'})} />
                <span className="text-xs sm:text-sm font-medium dark:text-slate-200">Income</span>
              </label>
              <label className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 py-2.5 px-2 border dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input type="radio" name="type" className="text-red-500 accent-red-500" checked={formData.type === 'DEBIT'} onChange={() => setFormData({...formData, type: 'DEBIT'})} />
                <span className="text-xs sm:text-sm font-medium dark:text-slate-200">Expense</span>
              </label>
              <label className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 py-2.5 px-2 border dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input type="radio" name="type" className="text-blue-500 accent-blue-500" checked={formData.type === 'TRANSFER'} onChange={() => setFormData({...formData, type: 'TRANSFER'})} />
                <span className="text-xs sm:text-sm font-medium dark:text-slate-200">Transfer</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
              <input type="date" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.date ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm color-scheme-dark`} value={formData.date?.split('T')[0] || ''} onChange={e => { setFormData({...formData, date: e.target.value}); if (errors.date) setErrors({...errors, date: ''}); }} />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount</label>
                <input type="number" step="0.01" placeholder="0.00" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.amount || ''} onChange={e => { setFormData({...formData, amount: parseFloat(e.target.value)}); if (errors.amount) setErrors({...errors, amount: ''}); }} />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Method</label>
                <select className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.paymentMethod ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.paymentMethod} onChange={e => { setFormData({...formData, paymentMethod: e.target.value}); if (errors.paymentMethod) setErrors({...errors, paymentMethod: ''}); }}>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="CC">CC</option>
                </select>
                {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                {categories.length > 0 ? (
                  <select className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.category} onChange={e => { setFormData({...formData, category: e.target.value, subCategory: ''}); if (errors.category) setErrors({...errors, category: ''}); }}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input type="text" placeholder="Category" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.category} onChange={e => { setFormData({...formData, category: e.target.value}); if (errors.category) setErrors({...errors, category: ''}); }} />
                )}
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subcategory</label>
                {currentSubCats.length > 0 ? (
                  <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" value={formData.subCategory || ''} onChange={e => setFormData({...formData, subCategory: e.target.value})}>
                    <option value="">None</option>
                    {currentSubCats.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                ) : (
                  <input type="text" placeholder="Optional" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50" value={formData.subCategory || ''} onChange={e => setFormData({...formData, subCategory: e.target.value})} />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
              <input type="text" placeholder="What was this for?" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
              {editingId ? "Update Transaction" : <><Plus className="w-4 h-4" /> Add Transaction</>}
            </button>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="w-full lg:w-2/3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{title}</h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder='Search "spent last week"...' 
                value={smartSearch}
                onChange={e => setSmartSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-slate-100 transition-all placeholder:text-slate-400"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 ${showFilters ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'} border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0`}>
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
              <select className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Method</label>
              <select className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm" value={filters.method} onChange={e => setFilters({...filters, method: e.target.value})}>
                <option value="">All Methods</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="CC">CC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Min Amount</label>
              <input type="number" placeholder="0.00" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm" value={filters.minAmount} onChange={e => setFilters({...filters, minAmount: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Max Amount</label>
              <input type="number" placeholder="9999.00" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm" value={filters.maxAmount} onChange={e => setFilters({...filters, maxAmount: e.target.value})} />
            </div>
            {(filters.category || filters.method || filters.minAmount || filters.maxAmount) && (
              <div className="col-span-2 lg:col-span-4 flex justify-end">
                <button onClick={() => setFilters({category: '', method: '', minAmount: '', maxAmount: ''})} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Clear Filters</button>
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
             <div className="p-8 text-center text-slate-400">Loading tracking data...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No transactions match your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="text-right py-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="py-4 px-4 sm:px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.map(t => {
                    const rowClass = t.isFlagged ? 'bg-amber-100/80 dark:bg-amber-900/20 hover:bg-amber-200/80 dark:hover:bg-amber-900/40 outline-[3px] -outline-offset-2 outline-amber-400 z-10 relative' : t.type === 'CREDIT' ? 'bg-emerald-50/30 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : t.type === 'TRANSFER' ? 'bg-blue-50/20 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50';
                    return (
                    <tr key={t._id} className={`${rowClass} transition-colors group`}>
                      <td className="py-4 px-4 sm:px-6 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 sm:px-6">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[150px] sm:max-w-xs">{t.description || 'No description'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{t.paymentMethod}</span>
                          <span className="sm:hidden text-slate-400 dark:text-slate-500">&bull; {t.category}</span>
                        </p>
                      </td>
                      <td className="py-4 px-4 sm:px-6 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(t.category)} dark:bg-opacity-20 dark:text-opacity-90`}>
                          {t.category}
                        </span>
                        {t.subCategory && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{t.subCategory}</span>
                        )}
                      </td>
                      <td className={`py-4 px-4 sm:px-6 text-sm font-bold text-right whitespace-nowrap ${t.type === 'CREDIT' ? 'text-green-600 dark:text-emerald-400' : t.type === 'TRANSFER' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {t.type === 'CREDIT' ? '+' : t.type === 'TRANSFER' ? '↔' : '-'}₹{t.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleFlag(t)} className={`p-1.5 rounded-lg transition-colors ${t.isFlagged ? 'text-amber-600 bg-amber-200 hover:bg-amber-300' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-100'}`}>
                            <Flag className={`w-4 h-4 ${t.isFlagged ? 'fill-current' : ''}`} />
                          </button>
                          <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(t._id as string)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action will permanently recalculate your balance."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
