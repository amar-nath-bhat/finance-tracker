"use client";
import { TransactionManager } from "@/components/TransactionManager";

import { Suspense } from "react";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading transactions...</div>}>
      <TransactionManager title="All Transactions" />
    </Suspense>
  );
}
