import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Debt } from "@/models/Debt";
import { Settings } from "@/models/Settings";
import { startOfWeek, endOfWeek, format, getISOWeek, getYear, startOfMonth, endOfMonth, eachWeekOfInterval } from "date-fns";

// Helper for week sorting and display
function getWeekInfo(date: Date) {
  const week = getISOWeek(date);
  const year = getYear(date);
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return {
    week,
    year,
    label: `Week ${week} - ${year}`,
    range: `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
    key: `${year}-W${week}`
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // e.g. "2026-04" or null for all-time
    const weeklyCategoriesParam = searchParams.get('weeklyCategories');
    const weeklyCategories = weeklyCategoriesParam ? weeklyCategoriesParam.split(',') : [];

    // Fetch data
    const allTransactions = await Transaction.find();
    const debts = await Debt.find();
    const settings = await Settings.findOne() || await Settings.create({});

    // ── Monthly trend (selectable range) ──
    const trendRange = searchParams.get('trendRange') || 'month';
    const trendData: { label: string; expenses: number; income: number; sortKey: number }[] = [];
    const now = new Date();

    if (trendRange === 'week') {
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        // Step back i weeks
        const refDate = new Date(d);
        refDate.setDate(d.getDate() - (i * 7));
        
        // Find the start of that week (Sunday)
        const startOfWeek = new Date(refDate);
        startOfWeek.setDate(refDate.getDate() - refDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        const label = `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        let expenses = 0;
        let income = 0;
        
        allTransactions.forEach(t => {
          const td = new Date(t.date).getTime();
          if (td >= startOfWeek.getTime() && td <= endOfWeek.getTime()) {
            if (t.type === 'DEBIT') expenses += t.amount;
            if (t.type === 'CREDIT') income += t.amount;
          }
        });
        trendData.push({ label, expenses, income, sortKey: startOfWeek.getTime() });
      }
    } else if (trendRange === 'year') {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const label = `${year}`;
        let expenses = 0;
        let income = 0;
        allTransactions.forEach(t => {
          const td = new Date(t.date);
          if (td.getFullYear() === year) {
            if (t.type === 'DEBIT') expenses += t.amount;
            if (t.type === 'CREDIT') income += t.amount;
          }
        });
        trendData.push({ label, expenses, income, sortKey: year });
      }
    } else {
      // Default: Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        let expenses = 0;
        let income = 0;
        allTransactions.forEach(t => {
          const td = new Date(t.date);
          const tKey = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}`;
          if (tKey === key) {
            if (t.type === 'DEBIT') expenses += t.amount;
            if (t.type === 'CREDIT') income += t.amount;
          }
        });
        trendData.push({ label, expenses, income, sortKey: d.getTime() });
      }
    }
    const monthlyTrend = trendData.map(d => ({ month: d.label, expenses: d.expenses, income: d.income }));


    // ── Available months for the dropdown ──
    const monthSet = new Set<string>();
    allTransactions.forEach(t => {
      const td = new Date(t.date);
      monthSet.add(`${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}`);
    });
    const availableMonths = Array.from(monthSet).sort().reverse();

    // ── Filter transactions by month if requested ──
    let transactions = allTransactions;
    if (monthParam) {
      transactions = allTransactions.filter(t => {
        const td = new Date(t.date);
        const tKey = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}`;
        return tKey === monthParam;
      });
    }

    // Compute aggregations from filtered transactions
    let totalCredits = 0;
    let totalDebits = 0;
    let totalCreditCardExpenses = 0;
    let totalSalaryIncome = 0;

    const expensesByCategory: Record<string, number> = {};
    const expensesBySubCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'CREDIT') {
        totalCredits += t.amount;
        if (t.category.toUpperCase() === 'SALARY') {
          totalSalaryIncome += t.amount;
        } else {
          expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) - t.amount;
          if (t.subCategory) {
            const subKey = `${t.category}: ${t.subCategory}`;
            expensesBySubCategory[subKey] = (expensesBySubCategory[subKey] || 0) - t.amount;
          }
        }
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      } else if (t.type === 'DEBIT') {
        totalDebits += t.amount;
        if (t.paymentMethod === 'CC') {
          totalCreditCardExpenses += t.amount;
        }
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        if (t.subCategory) {
          const subKey = `${t.category}: ${t.subCategory}`;
          expensesBySubCategory[subKey] = (expensesBySubCategory[subKey] || 0) + t.amount;
        }
      }
    });

    // For all-time, use all transactions; for month, use filtered
    const allTotalCredits = monthParam ? allTransactions.reduce((s, t) => t.type === 'CREDIT' ? s + t.amount : s, 0) : totalCredits;
    const allTotalDebits = monthParam ? allTransactions.reduce((s, t) => t.type === 'DEBIT' ? s + t.amount : s, 0) : totalDebits;
    const currentBalance = settings.startingBalance + allTotalCredits - allTotalDebits;

    let owedToMe = 0;
    let owedByMe = 0;

    debts.forEach(d => {
      if (!d.isSettled) {
        if (d.direction === 'OWED_TO_ME') {
          owedToMe += d.amount;
        } else {
          owedByMe += d.amount;
        }
      }
    });

    const netWorth = currentBalance + owedToMe - owedByMe;
    let netExpenses = totalDebits - (totalCredits - totalSalaryIncome);

    // Format for charts (only positive expenses)
    const categoryChartData = Object.entries(expensesByCategory).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const subCategoryChartData = Object.entries(expensesBySubCategory).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    // ── Weekly Breakdown logic ──
    const weeklyMap: Record<string, { label: string; range: string; value: number }> = {};
    
    // Filter transactions for weekly breakdown by categories if provided
    const weeklyTransactions = weeklyCategories.length > 0 
      ? allTransactions.filter(t => weeklyCategories.includes(t.category) && t.type === 'DEBIT')
      : allTransactions.filter(t => t.type === 'DEBIT');

    if (monthParam) {
      // Show all weeks in that month
      const [y, m] = monthParam.split('-').map(Number);
      const mStart = startOfMonth(new Date(y, m - 1));
      const mEnd = endOfMonth(mStart);
      
      // Get all weeks that overlap with this month
      const weeksInMonth = eachWeekOfInterval({ start: mStart, end: mEnd }, { weekStartsOn: 1 });
      
      weeksInMonth.forEach(w => {
        const info = getWeekInfo(w);
        weeklyMap[info.key] = { label: info.label, range: info.range, value: 0 };
      });

      weeklyTransactions.forEach(t => {
        const td = new Date(t.date);
        const info = getWeekInfo(td);
        if (weeklyMap[info.key]) {
          weeklyMap[info.key].value += t.amount;
        }
      });
    } else {
      // All time: group all and take top 4
      weeklyTransactions.forEach(t => {
        const td = new Date(t.date);
        const info = getWeekInfo(td);
        if (!weeklyMap[info.key]) {
          weeklyMap[info.key] = { label: info.label, range: info.range, value: 0 };
        }
        weeklyMap[info.key].value += t.amount;
      });
    }

    let weeklyBreakdown = Object.values(weeklyMap);
    if (!monthParam) {
      // Sort and take top 4 for all-time
      weeklyBreakdown.sort((a, b) => b.value - a.value);
      weeklyBreakdown = weeklyBreakdown.slice(0, 4);
    } else {
      // Sort by week number for monthly view
      // We can just rely on the order from eachWeekOfInterval or sort by date
      // (The keys currently are YYYY-WW, so simple sort works)
      weeklyBreakdown = Object.entries(weeklyMap)
        .sort(([k1], [k2]) => k1.localeCompare(k2))
        .map(([_, v]) => v);
    }

    return NextResponse.json({
      currentBalance,
      netWorth,
      startingBalance: settings.startingBalance,
      totalCredits,
      totalSalaryIncome,
      totalDebits,
      netExpenses,
      totalCreditCardExpenses,
      owedToMe,
      owedByMe,
      categoryChartData,
      subCategoryChartData,
      monthlyTrend,
      weeklyBreakdown,
      availableMonths
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard metrics" }, { status: 500 });
  }
}
