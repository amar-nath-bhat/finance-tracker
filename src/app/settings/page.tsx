"use client";

import { useState, useEffect } from "react";
import { Save, Plus, X, ListTree, Lock, Unlock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [newCat, setNewCat] = useState("");
  const [newSubCat, setNewSubCat] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Balance Lock State
  const [isBalanceLocked, setIsBalanceLocked] = useState(true);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [tempBalance, setTempBalance] = useState<string>("");

  // Delete Modals State
  const [deleteCategory, setDeleteCategory] = useState<string | null>(null);
  const [deleteSub, setDeleteSub] = useState<{cat: string, sub: string} | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setTempBalance(data.startingBalance?.toString() || "0");
      });
  }, []);

  const handleSave = async (updatedSettings: any, showToast = true) => {
    setSaving(true);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings)
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      if(showToast) toast.success("Settings saved successfully");
    } else {
      if(showToast) toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const handleBalanceSave = async () => {
    const newBal = parseFloat(tempBalance) || 0;
    await handleSave({ ...settings, startingBalance: newBal });
    setIsBalanceLocked(true);
  };

  const unlockBalance = () => {
    setShowBalanceModal(false);
    setIsBalanceLocked(false);
  };

  const addCategory = () => {
    if(!newCat.trim()) return;
    if(settings.categories.includes(newCat.trim())) {
      toast.error("Category already exists");
      return;
    }
    const s = { ...settings, categories: [...settings.categories, newCat.trim()] };
    handleSave(s);
    setNewCat("");
  };

  const confirmDeleteCategory = () => {
    if(!deleteCategory) return;
    const s = { ...settings, categories: settings.categories.filter((c: string) => c !== deleteCategory) };
    if (activeCat === deleteCategory) setActiveCat(null);
    handleSave(s);
    setDeleteCategory(null);
  };

  const addSubcategory = () => {
    if(!newSubCat.trim() || !activeCat) return;
    const currentSubs = settings.subCategories?.[activeCat] || [];
    if(currentSubs.includes(newSubCat.trim())) {
      toast.error("Subcategory already exists");
      return;
    }
    const newSubMap = { ...settings.subCategories, [activeCat]: [...currentSubs, newSubCat.trim()] };
    const s = { ...settings, subCategories: newSubMap };
    handleSave(s);
    setNewSubCat("");
  };

  const confirmDeleteSub = () => {
    if(!deleteSub) return;
    const { cat, sub } = deleteSub;
    const currentSubs = settings.subCategories?.[cat] || [];
    const newSubMap = { ...settings.subCategories, [cat]: currentSubs.filter((s: string) => s !== sub) };
    const s = { ...settings, subCategories: newSubMap };
    handleSave(s);
    setDeleteSub(null);
  };

  if (!settings) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 relative">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure your financial defaults and categories.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
        
        {/* Starting Balance */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Account Configuration</h2>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Starting Bank Balance</label>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="font-medium">₹</span>
                </div>
                <input 
                  type="number"
                  value={isBalanceLocked ? settings.startingBalance : tempBalance}
                  onChange={e => setTempBalance(e.target.value)}
                  disabled={isBalanceLocked}
                  className={`w-full pl-8 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${isBalanceLocked ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'}`}
                />
              </div>

              {isBalanceLocked ? (
                <button 
                  onClick={() => setShowBalanceModal(true)}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Lock className="w-4 h-4" /> Unlock
                </button>
              ) : (
                <button 
                  onClick={handleBalanceSave}
                  disabled={saving || isBalanceLocked}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-xl font-medium flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm border border-emerald-600"
                >
                  <Save className="w-4 h-4" /> Update
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {isBalanceLocked 
                ? "Your starting balance is securely locked to prevent accidental recalibrations." 
                : "Enter your new starting balance and click Update."}
            </p>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Categories */}
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Manage Categories</h2>
            
            <div className="flex flex-col gap-2 mb-6 max-h-64 overflow-y-auto pr-2">
              {settings.categories.map((cat: string) => (
                <div 
                  key={cat} 
                  onClick={() => setActiveCat(cat)}
                  className={`flex items-center justify-between px-4 py-3 border rounded-xl cursor-pointer transition-all ${activeCat === cat ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 dark:text-slate-300 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-sm'}`}
                >
                  <span className="font-medium text-sm">{cat}</span>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteCategory(cat); }} className="text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <input 
                type="text"
                placeholder="New Category"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              />
              <button 
                onClick={addCategory}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subcategories */}
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            {activeCat ? (
              <>
                <div className="flex items-center gap-2 mb-4 text-emerald-800 dark:text-emerald-400">
                  <ListTree className="w-5 h-5" />
                  <h2 className="text-lg font-bold">{activeCat} Subcategories</h2>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-6 max-h-48 overflow-y-auto">
                  {(settings.subCategories?.[activeCat] || []).length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 italic">No subcategories defined.</div>
                  ) : null}
                  {(settings.subCategories?.[activeCat] || []).map((sub: string) => (
                    <span key={sub} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium shadow-sm">
                      {sub}
                      <button onClick={() => setDeleteSub({ cat: activeCat, sub })} className="text-slate-400 hover:text-red-500 transition-colors ml-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-4">
                  <input 
                    type="text"
                    placeholder={`Add to ${activeCat}`}
                    value={newSubCat}
                    onChange={e => setNewSubCat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubcategory()}
                    className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm shadow-sm"
                  />
                  <button 
                    onClick={addSubcategory}
                    className="px-4 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                <ListTree className="w-12 h-12 mb-4 text-slate-200" />
                <p>Select a category from the left<br/>to manage its subcategories.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl p-6 shadow-xl border dark:border-slate-800 animate-in zoom-in-95">
            <div className="bg-amber-100 dark:bg-amber-900/30 w-12 h-12 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-500 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Unlock Balance?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Changing your starting balance will shift your entire historical net worth and current balance calculations. Are you sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowBalanceModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={unlockBalance}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" /> Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modals */}
      <ConfirmModal
        isOpen={!!deleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete the "${deleteCategory}" category? Existing transactions will retain their exact string value, but it won't be selectable for new ones.`}
        confirmText="Delete"
        onConfirm={confirmDeleteCategory}
        onCancel={() => setDeleteCategory(null)}
      />

      <ConfirmModal
        isOpen={!!deleteSub}
        title="Delete Subcategory"
        message={`Are you sure you want to delete the "${deleteSub?.sub}" subcategory?`}
        confirmText="Delete"
        onConfirm={confirmDeleteSub}
        onCancel={() => setDeleteSub(null)}
      />
    </div>
  );
}
