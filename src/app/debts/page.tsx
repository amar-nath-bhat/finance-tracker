"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Trash2, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ConfirmModal";

type Debt = {
  _id: string;
  direction: 'OWED_TO_ME' | 'OWED_BY_ME';
  personName: string;
  description?: string;
  amount: number;
  isSettled: boolean;
  date: string;
};

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null as string | null, isBulk: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    direction: 'OWED_TO_ME',
    personName: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    amount: '' as any,
    category: '',
    subCategory: '',
    paymentMethod: 'UPI'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<string[]>([]);
  const [subCategoriesMap, setSubCategoriesMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchData();
    fetch('/api/settings').then(r => r.json()).then(d => {
      if(d.categories) setCategories(d.categories);
      if(d.subCategories) setSubCategoriesMap(d.subCategories);
      
      setFormData(prev => ({
        ...prev,
        category: d.categories?.[0] || 'Reimbursement'
      }));
    });
  }, []);

  const currentSubCats = subCategoriesMap[formData.category || ''] || [];

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/debts');
    const data = await res.json();
    setDebts(data);
    setLoading(false);
  };

  const handleEdit = (d: Debt) => {
    setEditingId(d._id);
    setErrors({});
    setFormData({
      direction: d.direction,
      personName: d.personName,
      description: d.description || '',
      date: new Date(d.date).toISOString().split('T')[0],
      amount: d.amount as any,
      category: (d as any).category || categories[0] || 'Reimbursement',
      subCategory: (d as any).subCategory || '',
      paymentMethod: (d as any).paymentMethod || 'UPI'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrors({});
    setFormData({
      direction: 'OWED_TO_ME',
      personName: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      amount: '' as any,
      category: categories.length > 0 ? categories[0] : 'Reimbursement',
      subCategory: '',
      paymentMethod: 'UPI'
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.personName || !formData.personName.trim()) newErrors.personName = "Person/Entity is required";
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

    if (editingId) {
      const res = await fetch('/api/debts', {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: editingId, amount: Number(formData.amount) }),
      });

      if (res.ok) {
        toast.success("Debt updated successfully!");
        cancelEdit();
        fetchData();
      } else {
        toast.error("Failed to update debt");
      }
    } else {
      const res = await fetch('/api/debts', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, amount: Number(formData.amount) }),
      });

      if (res.ok) {
        toast.success("Debt logged successfully!");
        cancelEdit();
        fetchData();
      } else {
        toast.error("Failed to log debt");
      }
    }
  };

  const handleDeleteDebt = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModal({ isOpen: true, id, isBulk: false });
  };

  const handleClearSettled = async () => {
    setConfirmModal({ isOpen: true, id: null, isBulk: true });
  };

  const executeDelete = async () => {
    if (confirmModal.isBulk) {
      const res = await fetch("/api/debts?action=clear_settled", { method: "DELETE" });
      if (res.ok) {
        toast.success("All settled debts cleared!");
        fetchData();
      } else {
        toast.error("Failed to clear debts.");
      }
    } else if (confirmModal.id) {
      const res = await fetch(`/api/debts?id=${confirmModal.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Debt removed successfully!");
        fetchData();
      } else {
        toast.error("Failed to remove debt.");
      }
    }
    setConfirmModal({ isOpen: false, id: null, isBulk: false });
  };

  const handleSettle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = await fetch('/api/debts', {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        id, 
        isSettled: true
      }),
    });
    if (res.ok) {
      toast.success("Debt settled and transaction logged!");
      fetchData();
    } else {
      toast.error("Failed to settle debt.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Form Section */}
      <div className="w-full lg:w-1/3 shrink-0">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingId ? "Update Debt" : "Log New Debt"}</h2>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 border dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input type="radio" name="direction" className="text-emerald-500 accent-emerald-500" checked={formData.direction === 'OWED_TO_ME'} onChange={() => setFormData({...formData, direction: 'OWED_TO_ME'})} />
                <span className="text-sm font-medium dark:text-slate-200">Owed To Me</span>
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 p-3 border dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input type="radio" name="direction" className="text-red-500 accent-red-500" checked={formData.direction === 'OWED_BY_ME'} onChange={() => setFormData({...formData, direction: 'OWED_BY_ME'})} />
                <span className="text-sm font-medium dark:text-slate-200">I Owe Them</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date Owed</label>
              <input type="date" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.date ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm color-scheme-dark`} value={formData.date?.split('T')[0] || ''} onChange={e => { setFormData({...formData, date: e.target.value}); if (errors.date) setErrors({...errors, date: ''}); }} />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Person / Entity</label>
              <input type="text" placeholder="Who?" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.personName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.personName} onChange={e => { setFormData({...formData, personName: e.target.value}); if (errors.personName) setErrors({...errors, personName: ''}); }} />
              {errors.personName && <p className="text-red-500 text-xs mt-1">{errors.personName}</p>}
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
                  <input type="text" placeholder="Category" className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border ${errors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'} dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm`} value={formData.category} onChange={e => { setFormData({...formData, category: e.target.value, subCategory: ''}); if (errors.category) setErrors({...errors, category: ''}); }} />
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
              <input type="text" placeholder="What is this for?" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
              {editingId ? "Update Debt Log" : <><Plus className="w-4 h-4" /> Add Debt Log</>}
            </button>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="w-full lg:w-2/3">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Debts</h1>
          {debts.some(d => d.isSettled) && (
            <button
              onClick={handleClearSettled}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear Settled
            </button>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
             <div className="p-8 text-center text-slate-400">Loading tracking data...</div>
          ) : debts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              You are all settled up! No debts logged.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
                  <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {debts.map(d => (
                  <tr 
                    key={d._id} 
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${d.isSettled ? 'opacity-50' : ''}`}
                  >
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(d.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {d.personName}
                        {d.description && <span className="text-slate-500 dark:text-slate-400 ml-2 font-normal">({d.description})</span>}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {d.direction === 'OWED_TO_ME' ? 'They owe you' : 'You owe them'}
                      </p>
                    </td>
                    <td className={`py-4 px-6 text-sm font-bold text-right whitespace-nowrap ${d.direction === 'OWED_TO_ME' ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      ₹{d.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {d.isSettled ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                          <button
                            onClick={() => handleDeleteDebt(d._id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            title="Remove Debt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={(e) => handleSettle(d._id, e)}
                            className="px-4 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-full text-xs font-medium transition-colors"
                          >
                            Mark Settled
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(d); }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Edit Debt"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.isBulk ? "Clear All Settled Debts" : "Remove Settled Debt"}
        message={confirmModal.isBulk ? "Are you sure you want to remove ALL settled debts? This action cannot be undone." : "Are you sure you want to remove this settled debt?"}
        confirmText="Remove"
        onConfirm={executeDelete}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
