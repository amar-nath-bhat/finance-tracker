"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Users, Settings, ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/bills", label: "Bills", icon: CalendarClock },
  { href: "/debts", label: "Debts", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`relative ${collapsed ? "w-20" : "w-64"} bg-slate-900 min-h-screen text-slate-300 flex flex-col hidden md:flex transition-all duration-300 shrink-0`}>
      <button 
        onClick={() => setCollapsed(!collapsed)} 
        className="absolute -right-3 top-8 bg-slate-800 text-slate-400 hover:text-white rounded-full p-1 border border-slate-700 z-10 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className={`p-6 flex items-center ${collapsed ? "justify-center" : "justify-start"} h-20`}>
        {!collapsed ? (
          <h2 className="text-2xl font-bold text-white tracking-tight break-keep whitespace-nowrap">Finance<span className="text-emerald-500">Tracker</span></h2>
        ) : (
          <h2 className="text-2xl font-bold text-emerald-500 tracking-tight">FT</h2>
        )}
      </div>

      <nav className={`flex-1 ${collapsed ? "px-3" : "px-4"} space-y-2 mt-4`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 ${collapsed ? "justify-center px-0 py-3" : "px-4 py-3"} rounded-xl transition-all duration-200 ${
                isActive ? "bg-emerald-500/10 text-emerald-400 font-medium" : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-emerald-500" : "text-slate-400"}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 flex items-center ${collapsed ? "justify-center" : "justify-between"} mt-auto border-t border-slate-800`}>
        {!collapsed && <span className="text-xs text-slate-500">Theme</span>}
        <ThemeToggle />
      </div>
    </aside>
  );
}
