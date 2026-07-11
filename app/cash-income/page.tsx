"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft,
  Plus,
  DollarSign,
  TrendingUp,
  Building,
  FileText,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface CashEntry {
  id: string;
  type: "cash_sale" | "check" | "deposit";
  amount: number;
  description: string;
  loggedBy: string;
  loggedByName: string;
  payerName?: string;
  referenceNumber?: string;
  notes?: string;
  date: string;
  createdAt: any;
}

interface CashSummary {
  totalCashSales: number;
  totalChecks: number;
  totalDeposits: number;
  totalCashRequests: number;
  inHandBalance: number;
}

export default function CashIncomePage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [summary, setSummary] = useState<CashSummary>({
    totalCashSales: 0,
    totalChecks: 0,
    totalDeposits: 0,
    totalCashRequests: 0,
    inHandBalance: 0,
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"cash_sale" | "check" | "deposit">("cash_sale");
  const [activeView, setActiveView] = useState<"daily" | "monthly">("daily");
  const [form, setForm] = useState({
    amount: "",
    description: "",
    payerName: "",
    referenceNumber: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");

  useEffect(() => {
    if (!loading && !profile) router.push("/");
    if (!loading && !isGM && !isAGM) router.push("/dashboard");
  }, [loading, profile, isGM, isAGM, router]);

  useEffect(() => {
    if (profile && (isGM || isAGM)) fetchData();
  }, [profile, activeView]);

  const fetchData = async () => {
    setPageLoading(true);
    try {
      const dateFilter = activeView === "daily" ? today : currentMonth;
      const filterField = activeView === "daily" ? "date" : "month";

      const q = query(
        collection(db, "cash_entries"),
        where(filterField, "==", dateFilter),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const data: CashEntry[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as CashEntry));
      setEntries(data);

      // Calculate summary
      let totalCashSales = 0;
      let totalChecks = 0;
      let totalDeposits = 0;

      data.forEach((entry) => {
        if (entry.type === "cash_sale") totalCashSales += entry.amount;
        if (entry.type === "check") totalChecks += entry.amount;
        if (entry.type === "deposit") totalDeposits += entry.amount;
      });

      // Get cash requests used
      const reqSnap = await getDocs(
        query(
          collection(db, "cash_requests"),
          where("status", "==", "used")
        )
      );
      let totalCashRequests = 0;
      reqSnap.forEach((d) => (totalCashRequests += d.data().amount || 0));

      const inHandBalance =
        totalCashSales + totalChecks - totalDeposits - totalCashRequests;

      setSummary({
        totalCashSales,
        totalChecks,
        totalDeposits,
        totalCashRequests,
        inHandBalance,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitEntry = async () => {
    if (!form.amount || !form.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (activeTab === "deposit" && !isGM) {
      toast.error("Only General Manager can log deposits");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "cash_entries"), {
        type: activeTab,
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        loggedBy: profile?.uid,
        loggedByName: profile?.name,
        payerName: form.payerName.trim(),
        referenceNumber: form.referenceNumber.trim(),
        notes: form.notes.trim(),
        date: today,
        month: currentMonth,
        createdAt: serverTimestamp(),
      });
      toast.success(
        activeTab === "cash_sale"
          ? "Cash sale logged!"
          : activeTab === "check"
          ? "Check logged!"
          : "Deposit logged!"
      );
      setForm({
        amount: "",
        description: "",
        payerName: "",
        referenceNumber: "",
        notes: "",
      });
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast.error("Error logging entry");
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "cash_sale") return <DollarSign size={18} />;
    if (type === "check") return <FileText size={18} />;
    return <Building size={18} />;
  };

  const getTypeColor = (type: string) => {
    if (type === "cash_sale") return "bg-teal-50 text-teal-400";
    if (type === "check") return "bg-coral-50 text-coral-400";
    return "bg-navy-50 text-navy-700";
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-teal-400 animate-pulse font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-bg">
      {/* Header */}
      <header className="bg-white shadow-card sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-teal-50 rounded-xl text-teal-400">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-navy-700">Cash Income</h1>
              <p className="text-xs text-gray-400">
                {format(new Date(), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* In Hand Balance — GM Only */}
        {isGM && (
          <div className="card mb-6 bg-gradient-to-r from-navy-700 to-navy-800 text-white fade-in">
            <p className="text-sm opacity-70 mb-1">💵 Cash In Hand</p>
            <p className="text-4xl font-bold mb-4">
              ${summary.inHandBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Cash Sales"
                value={`+$${summary.totalCashSales.toFixed(2)}`}
                positive
              />
              <MiniStat
                label="Checks"
                value={`+$${summary.totalChecks.toFixed(2)}`}
                positive
              />
              <MiniStat
                label="Deposits"
                value={`-$${summary.totalDeposits.toFixed(2)}`}
                positive={false}
              />
              <MiniStat
                label="Cash Used"
                value={`-$${summary.totalCashRequests.toFixed(2)}`}
                positive={false}
              />
            </div>
          </div>
        )}

        {/* Daily / Monthly Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveView("daily")}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
              activeView === "daily"
                ? "bg-teal-400 text-white"
                : "bg-white text-gray-400 hover:bg-teal-50"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveView("monthly")}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
              activeView === "monthly"
                ? "bg-navy-700 text-white"
                : "bg-white text-gray-400 hover:bg-gray-50"
            }`}
          >
            This Month
          </button>
        </div>

        {/* Add Entry Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Log Entry</h2>

            {/* Type Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("cash_sale")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "cash_sale"
                    ? "bg-teal-400 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                💵 Cash Sale
              </button>
              <button
                onClick={() => setActiveTab("check")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "check"
                    ? "bg-coral-400 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                📝 Check
              </button>
              {isGM && (
                <button
                  onClick={() => setActiveTab("deposit")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === "deposit"
                      ? "bg-navy-700 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  🏦 Deposit
                </button>
              )}
            </div>

            <div className="space-y-3">
              <input
                type="number"
                className="input"
                placeholder="Amount ($) *"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <input
                className="input"
                placeholder={
                  activeTab === "cash_sale"
                    ? "Description (e.g. Saturday night sales) *"
                    : activeTab === "check"
                    ? "Description / purpose *"
                    : "Bank name / branch *"
                }
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              {activeTab === "check" && (
                <input
                  className="input"
                  placeholder="Payer name"
                  value={form.payerName}
                  onChange={(e) =>
                    setForm({ ...form, payerName: e.target.value })
                  }
                />
              )}
              {activeTab === "deposit" && (
                <input
                  className="input"
                  placeholder="Reference / confirmation #"
                  value={form.referenceNumber}
                  onChange={(e) =>
                    setForm({ ...form, referenceNumber: e.target.value })
                  }
                />
              )}
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="flex gap-3">
                <button
                  onClick={submitEntry}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Save Entry"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="card text-center py-12">
            <TrendingUp size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No entries for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="card fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(entry.type)}`}>
                      {getTypeIcon(entry.type)}
                    </div>
                    <div>
                      <p className="font-bold text-navy-700 text-sm">
                        {entry.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.loggedByName} · {entry.date}
                      </p>
                      {entry.payerName && (
                        <p className="text-xs text-gray-400">
                          From: {entry.payerName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      entry.type === "deposit"
                        ? "text-coral-400"
                        : "text-teal-400"
                    }`}>
                      {entry.type === "deposit" ? "-" : "+"}$
                      {entry.amount.toFixed(2)}
                    </p>
                    <span className="text-xs text-gray-300 capitalize">
                      {entry.type.replace("_", " ")}
                    </span>
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="bg-white/10 rounded-xl p-3">
      <p className="text-xs opacity-60 mb-0.5">{label}</p>
      <p className={`font-bold text-sm ${positive ? "text-teal-300" : "text-coral-300"}`}>
        {value}
      </p>
    </div>
  );
}
