"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, X, CheckCircle, CreditCard, Calendar, Repeat } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "./ConfirmModal";

type Bill = {
  _id?: string;
  name: string;
  amount: number;
  category: string;
  subCategory?: string;
  paymentMethod: string;
  deadlineDay: number;
  frequency: string;
  paidPeriods: string[];
};

export function BillsManager() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategoriesMap, setSubCategoriesMap] = useState<Record<string, string[]>>({});

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    name: '',
    amount: '' as any,
    category: '',
    subCategory: '',
    paymentMethod: 'UPI',
    deadlineDay: 1,
    frequency: 'MONTHLY',
    paidPeriods: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pay Modal State
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [payFormData, setPayFormData] = useState({
    datePaid: new Date().toISOString().split('T')[0],
    amount: '' as any,
    targetPeriod: ''
  });

  useEffect(() => {
    fetchData();
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.categories) setCategories(d.categories);
      if (d.subCategories) setSubCategoriesMap(d.subCategories);
      if (d.categories?.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: d.categories[0] }));
      }
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/bills');
    if (res.ok) {
      const data = await res.json();
      setBills(data);
    }
    setLoading(false);
  };

  const getNextUnpaidPeriod = (paidPeriods: string[], frequency: string) => {
    if (!paidPeriods || paidPeriods.length === 0) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const sorted = [...paidPeriods].sort();
    const lastPaid = sorted[sorted.length - 1];
    const [yearStr, monthStr] = lastPaid.split('-');
    let year = parseInt(yearStr);
    let month = parseInt(monthStr);
    
    let increment = 1;
    if (frequency === 'QUARTERLY') increment = 3;
    if (frequency === 'ANNUALLY') increment = 12;
    
    month += increment;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  };

  const formatPeriod = (yyyyMm: string) => {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const currentSubCats = subCategoriesMap[formData.category || ''] || [];

  const handleEdit = (b: Bill) => {
    setEditingId(b._id as string);
    setErrors({});
    setFormData({ ...b });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/bills/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success("Bill deleted");
      fetchData();
    } else {
      toast.error("Failed to delete bill");
    }
    setDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrors({});
    setFormData({
      name: '',
      amount: '' as any,
      category: categories.length > 0 ? categories[0] : '',
      subCategory: '',
      paymentMethod: 'UPI',
      deadlineDay: 1,
      frequency: 'MONTHLY',
      paidPeriods: []
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "Name is required";
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "Enter a valid amount > 0";
    }
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.paymentMethod) newErrors.paymentMethod = "Payment method is required";
    if (!formData.frequency) newErrors.frequency = "Frequency is required";
    if (!formData.deadlineDay || formData.deadlineDay < 1 || formData.deadlineDay > 31) {
      newErrors.deadlineDay = "Enter a valid day (1-31)";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const { _id, ...cleanData } = formData as any;
    const dataToSubmit = {
      ...cleanData,
      amount: Number(formData.amount),
      deadlineDay: Number(formData.deadlineDay)
    };

    if (editingId) {
      const res = await fetch(`/api/bills/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });
      if (res.ok) {
        toast.success("Bill updated!");
        fetchData();
        cancelEdit();
      } else {
        toast.error("Update failed");
      }
    } else {
      const res = await fetch('/api/bills', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dataToSubmit, paidPeriods: [] }),
      });

      if (res.ok) {
        toast.success("Bill created!");
        fetchData();
        cancelEdit();
      } else {
        toast.error("Failed to create bill");
      }
    }
  };

  const openPayModal = (b: Bill) => {
    const targetPeriod = getNextUnpaidPeriod(b.paidPeriods, b.frequency);
    setPayingBill(b);
    setPayFormData({
      datePaid: new Date().toISOString().split('T')[0],
      amount: b.amount,
      targetPeriod
    });
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;

    if (!payFormData.datePaid || !payFormData.amount || Number(payFormData.amount) <= 0) {
      toast.error("Please provide valid date and amount");
      return;
    }

    const res = await fetch(`/api/bills/${payingBill._id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        datePaid: payFormData.datePaid,
        amount: Number(payFormData.amount),
        targetPeriod: payFormData.targetPeriod
      }),
    });

    if (res.ok) {
      toast.success("Bill marked as paid and transaction logged!");
      setPayingBill(null);
      fetchData();
    } else {
      toast.error("Failed to mark bill as paid");
    }
  };

  const badgeColors = ['bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800', 'bg-amber-100 text-amber-800', 'bg-purple-100 text-purple-800', 'bg-rose-100 text-rose-800', 'bg-cyan-100 text-cyan-800', 'bg-pink-100 text-pink-800'];
  const getBadgeColor = (category: string) => {
    const idx = categories.indexOf(category);
    return idx !== -1 ? badgeColors[idx % badgeColors.length] : 'bg-slate-100 text-slate-800';
  };

  // Determine current month string for quick status
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Form Section */}
      <div className="w-full lg:w-1/3 shrink-0">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              {editingId ? "Edit Bill" : "New Recurring Bill"}
            </h2>
            {editingId && (
              <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Bill Name</label>
              <input type="text" placeholder="e.g., Rent, Internet, Netflix" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.name ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.name || ''} onChange={e => { setFormData({...formData, name: e.target.value}); if (errors.name) setErrors({...errors, name: ''}); }} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount</label>
                <input type="number" step="0.01" placeholder="0.00" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.amount ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.amount || ''} onChange={e => { setFormData({...formData, amount: parseFloat(e.target.value)}); if (errors.amount) setErrors({...errors, amount: ''}); }} />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Frequency</label>
                <select className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.frequency ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.frequency} onChange={e => { setFormData({...formData, frequency: e.target.value}); if (errors.frequency) setErrors({...errors, frequency: ''}); }}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
                {errors.frequency && <p className="text-red-500 text-xs mt-1">{errors.frequency}</p>}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                {categories.length > 0 ? (
                  <select className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.category ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.category} onChange={e => { setFormData({...formData, category: e.target.value, subCategory: ''}); if (errors.category) setErrors({...errors, category: ''}); }}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input type="text" placeholder="Category" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.category ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.category} onChange={e => { setFormData({...formData, category: e.target.value}); if (errors.category) setErrors({...errors, category: ''}); }} />
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

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Payment Method</label>
                <select className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.paymentMethod ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.paymentMethod} onChange={e => { setFormData({...formData, paymentMethod: e.target.value}); if (errors.paymentMethod) setErrors({...errors, paymentMethod: ''}); }}>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="CC">CC</option>
                </select>
                {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Deadline Day</label>
                <input type="number" min="1" max="31" placeholder="e.g., 5" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.deadlineDay ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.deadlineDay || ''} onChange={e => { setFormData({...formData, deadlineDay: parseInt(e.target.value)}); if (errors.deadlineDay) setErrors({...errors, deadlineDay: ''}); }} />
                {errors.deadlineDay && <p className="text-red-500 text-xs mt-1">{errors.deadlineDay}</p>}
              </div>
            </div>


            <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
              {editingId ? "Update Bill" : <><Plus className="w-4 h-4" /> Save Bill</>}
            </button>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="w-full lg:w-2/3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Recurring Bills</h1>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
             <div className="p-8 text-center text-slate-400">Loading bills...</div>
          ) : bills.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
              <p>No bills created yet.</p>
              <p className="text-sm mt-1">Add your recurring expenses like rent, utilities, and investments to track them automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="w-[35%] text-left py-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bill</th>
                    <th className="w-[20%] text-left py-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="w-[15%] text-right py-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="w-[15%] text-center py-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="w-[15%] py-4 px-4 sm:px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bills.map(b => {
                    const nextUnpaidPeriod = getNextUnpaidPeriod(b.paidPeriods || [], b.frequency);
                    const nextDueStr = formatPeriod(nextUnpaidPeriod);
                    const isPaidUp = currentMonthStr < nextUnpaidPeriod;
                    const isOverdue = !isPaidUp && (nextUnpaidPeriod < currentMonthStr || (nextUnpaidPeriod === currentMonthStr && new Date().getDate() > b.deadlineDay));

                    return (
                    <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-4 px-4 sm:px-6">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                           {b.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-medium flex items-center gap-1">
                             <Repeat className="w-3 h-3" />
                             {b.frequency === 'QUARTERLY' ? 'Quarterly' : b.frequency === 'ANNUALLY' ? 'Annually' : 'Monthly'}
                          </span>
                          <span>Due day: {b.deadlineDay}</span>
                        </p>
                      </td>
                      <td className="py-4 px-4 sm:px-6 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(b.category)} dark:bg-opacity-20 dark:text-opacity-90`}>
                          {b.category}
                        </span>
                        {b.subCategory && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{b.subCategory}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-sm font-bold text-right whitespace-nowrap text-slate-900 dark:text-slate-100">
                        ₹{b.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <div className="flex flex-col items-center justify-center">
                            {isPaidUp ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                <CheckCircle className="w-3 h-3" /> Paid Up
                              </span>
                            ) : (
                               <>
                                 <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isOverdue ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                                    {isOverdue ? 'Overdue' : 'Unpaid'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-1 block h-[15px] whitespace-nowrap">Next: {nextDueStr}</span>
                               </>
                            )}
                        </div>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openPayModal(b)} 
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Pay
                          </button>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                             <button onClick={() => handleEdit(b)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                               <Edit2 className="w-4 h-4" />
                             </button>
                             <button onClick={() => setDeleteId(b._id as string)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
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
        title="Delete Bill"
        message="Are you sure you want to delete this bill? Past logged transactions will remain, but this recurring bill will be removed."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Pay Modal */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                   Pay {payingBill.name}
                </h3>
                <button onClick={() => setPayingBill(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
                You are paying the bill for <strong>{formatPeriod(payFormData.targetPeriod)}</strong>. This will log a new transaction.
              </div>

              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date Paid</label>
                  <input 
                    type="date" 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm color-scheme-dark" 
                    value={payFormData.datePaid} 
                    onChange={e => setPayFormData({...payFormData, datePaid: e.target.value})} 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount Paid (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" 
                    value={payFormData.amount} 
                    onChange={e => setPayFormData({...payFormData, amount: parseFloat(e.target.value)})} 
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">You can adjust the standard amount if it changed this payment.</p>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setPayingBill(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                    <CheckCircle className="w-4 h-4" /> Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
