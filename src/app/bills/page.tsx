import { BillsManager } from "@/components/BillsManager";

export const metadata = {
  title: "Bills - Finance Tracker",
};

export default function BillsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 md:pb-0">
      <BillsManager />
    </div>
  );
}
