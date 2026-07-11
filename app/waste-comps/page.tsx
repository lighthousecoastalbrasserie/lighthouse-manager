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
  ClipboardList,
  Trash2,
  Gift,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface WasteComp {
  id: string;
  type: "waste" | "comp";
  item: string;
  quantity: string;
  amount: number;
  reason: string;
  approvedBy: string;
  approvedByName: string;
  loggedBy: string;
  loggedByName: string;
  date: string;
  month: string;
  createdAt: any;
}

export default function WasteCompsPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<WasteComp[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "waste" | "comp">("all");
  const [activeView, setActiveView] = useState<"daily" | "monthly">("daily");
  const [form, setForm] = useState({
    type: "comp" as "waste" | "comp",
    item: "",
    quantity: "",
    amount: "",
    reason: "",
    approvedBy: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");

  useEffect(() => {
    if (!loading && !profile) router.push("/");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) fetchEntries();
  }, [profile, activeTab, activeView]);

  const fetchEntries = async () => {
    setPageLoading(true);
    try {
      const dateFilter = activeView === "daily" ? today : currentMonth;
      const filterField = activeView === "daily" ? "date" : "month";

      let q;
      if (activeTab === "all") {
        q = query(
          collection(db, "waste_comps"),
          where(filterField, "==", dateFilter),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "waste_comps"),
          where(filterField, "==", dateFilter),
          where("type", "==", activeTab),
          orderBy("createdAt", "desc")
        );
      }
      const snap = await getDocs(q);
      const data: WasteComp[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as WasteComp));
      setEntries(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitEntry = async () => {
    if (!form.item.trim() || !form.reason.trim() || !form.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "waste_comps"), {
        type: form.type,
        item: form.item.trim(),
        quantity: form.quantity.trim(),
        amount: parseFloat(form.amount),
        reason: form.reason.trim(),
        approvedBy: form.approvedBy.trim(),
        approvedByName: form.approvedBy.trim(),
        loggedBy: profile?.uid,
        loggedByName: profile?.name,
        date: today,
        month: currentMonth,
        createdAt: serverTimestamp(),
      });
      toast.success(form.type === "comp" ? "Comp logged!" : "Waste logged!");
      setForm({
        type: "comp",
        item: "",
        quantity: "",
        amount: "",
        reason: "",
        approvedBy: "",
      });
      setShowForm(false);
      fetchEntries();
    } catch (error) {
      toast.error("Error logging entry");
    } finally {
      setSubmitting(false);
    }
  };

  const totalWaste = entries
    .filter((e) => e.type === "waste")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalComps = entries
    .filter((e) => e.type === "comp")
    .reduce((sum, e) => sum + e.amount, 0);

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
            <h1 className="text-xl font-bold text-navy-700">Waste & Comps</h1>
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
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Trash2 size={16} className="text-coral-400" />
              <p className="text-xs text-gray-400">Total Waste</p>
            </div>
            <p className="text-2xl font-bold text-coral-400">
              ${totalWaste.toFixed(2)}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} className="text-teal-400" />
              <p className="text-xs text-gray-400">Total Comps</p>
            </div>
            <p className="text-2xl font-bold text-teal-400">
              ${totalComps.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Log Entry</h2>
            <div className="space-y-4">
              {/* Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setForm({ ...form, type: "comp" })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                    form.type === "comp"
                      ? "bg-teal-400 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Gift size={16} /> Comp
                </button>
                <button
                  onClick={() => setForm({ ...form, type: "waste" })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                    form.type === "waste"
                      ? "bg-coral-400 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Trash2 size={16} /> Waste
                </button>
              </div>

              <input
                className="input"
                placeholder="Item name *"
                value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
              />
              <input
                className="input"
                placeholder="Quantity (e.g. 2 glasses, 1 bottle)"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
              <input
                type="number"
                className="input"
                placeholder="Amount ($) *"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Reason *"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
              <input
                className="input"
                placeholder="Approved by (manager name)"
                value={form.approvedBy}
                onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
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

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveView("daily")}
            className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
              activeView === "daily"
                ? "bg-teal-400 text-white"
                : "bg-white text-gray-400 hover:bg-teal-50"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveView("monthly")}
            className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
              activeView === "monthly"
                ? "bg-navy-700 text-white"
                : "bg-white text-gray-400 hover:bg-gray-50"
            }`}
          >
            This Month
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 mb-6">
          {["all", "comp", "waste"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm capitalize transition-all ${
                activeTab === tab
                  ? "bg-teal-400 text-white"
                  : "bg-white text-gray-400 hover:bg-teal-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="card text-center py-12">
            <ClipboardList size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No entries for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="card fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      entry.type === "comp"
                        ? "bg-teal-50 text-teal-400"
                        : "bg-coral-50 text-coral-400"
                    }`}>
                      {entry.type === "comp" ? <Gift size={18} /> : <Trash2 size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-navy-700 text-sm">{entry.item}</p>
                      {entry.quantity && (
                        <p className="text-xs text-gray-400">Qty: {entry.quantity}</p>
                      )}
                      <p className="text-xs text-gray-400">{entry.loggedByName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      entry.type === "comp" ? "text-teal-400" : "text-coral-400"
                    }`}>
                      ${entry.amount.toFixed(2)}
                    </p>
                    <span className={entry.type === "comp" ? "badge-green" : "badge-coral"}>
                      {entry.type}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{entry.reason}</p>
                  {entry.approvedBy && (
                    <p className="text-xs text-teal-400 mt-1">
                      ✓ Approved by {entry.approvedBy}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
