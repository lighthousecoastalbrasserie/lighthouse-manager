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
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft,
  Plus,
  CreditCard,
  Check,
  Clock,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Payment {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  type: "fixed" | "variable";
  category: string;
  status: "pending" | "paid" | "overdue";
  paidBy?: string;
  paidAt?: any;
  notes?: string;
  month: string;
  createdAt: any;
}

export default function PaymentsPage() {
  const { profile, loading, isGM } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "fixed" | "variable">("all");
  const [form, setForm] = useState({
    name: "",
    amount: "",
    dueDate: "",
    type: "fixed" as "fixed" | "variable",
    category: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const currentMonth = format(new Date(), "yyyy-MM");

  useEffect(() => {
    if (!loading && !profile) router.push("/");
    if (!loading && !isGM) router.push("/dashboard");
  }, [loading, profile, isGM, router]);

  useEffect(() => {
    if (profile && isGM) fetchPayments();
  }, [profile, isGM]);

  const fetchPayments = async () => {
    setPageLoading(true);
    try {
      const q = query(
        collection(db, "payments"),
        where("month", "==", currentMonth),
        orderBy("dueDate", "asc")
      );
      const snap = await getDocs(q);
      const data: Payment[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Payment));
      setPayments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!form.name || !form.amount || !form.dueDate || !form.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "payments"), {
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        dueDate: form.dueDate,
        type: form.type,
        category: form.category.trim(),
        status: "pending",
        notes: form.notes.trim(),
        month: currentMonth,
        createdAt: serverTimestamp(),
      });
      toast.success("Payment added!");
      setForm({ name: "", amount: "", dueDate: "", type: "fixed", category: "", notes: "" });
      setShowForm(false);
      fetchPayments();
    } catch (error) {
      toast.error("Error adding payment");
    } finally {
      setSubmitting(false);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await updateDoc(doc(db, "payments", id), {
        status: "paid",
        paidBy: profile?.name,
        paidAt: serverTimestamp(),
      });
      toast.success("Marked as paid!");
      fetchPayments();
    } catch (error) {
      toast.error("Error updating payment");
    }
  };

  const deletePayment = async (id: string) => {
    try {
      await updateDoc(doc(db, "payments", id), { status: "overdue" });
      toast.success("Payment removed");
      fetchPayments();
    } catch (error) {
      toast.error("Error removing payment");
    }
  };

  const filtered = payments.filter((p) =>
    activeTab === "all" ? true : p.type === activeTab
  );

  const totalFixed = payments
    .filter((p) => p.type === "fixed")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalVariable = payments
    .filter((p) => p.type === "variable")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

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
              <h1 className="text-xl font-bold text-navy-700">Monthly Payments</h1>
              <p className="text-xs text-gray-400">{format(new Date(), "MMMM yyyy")}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> Add Payment
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Fixed" amount={totalFixed} color="navy" />
          <SummaryCard label="Variable" amount={totalVariable} color="coral" />
          <SummaryCard label="Paid" amount={totalPaid} color="teal" />
          <SummaryCard label="Pending" amount={totalPending} color="yellow" />
        </div>

        {/* Total Committed */}
        <div className="card mb-6 bg-gradient-to-r from-teal-400 to-teal-500 text-white">
          <p className="text-sm opacity-80 mb-1">Total Committed This Month</p>
          <p className="text-3xl font-bold">
            ${(totalFixed + totalVariable).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-3 w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{
                width: `${totalFixed + totalVariable > 0 ? (totalPaid / (totalFixed + totalVariable)) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-xs opacity-70 mt-1">
            ${totalPaid.toFixed(2)} paid of ${(totalFixed + totalVariable).toFixed(2)}
          </p>
        </div>

        {/* Add Payment Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Add Payment</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setForm({ ...form, type: "fixed" })}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all ${
                    form.type === "fixed"
                      ? "bg-navy-700 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  Fixed
                </button>
                <button
                  onClick={() => setForm({ ...form, type: "variable" })}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all ${
                    form.type === "variable"
                      ? "bg-coral-400 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  Variable
                </button>
              </div>
              <input
                className="input"
                placeholder="Payment name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Category (e.g. Rent, Utilities, Supplier) *"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <input
                type="number"
                className="input"
                placeholder="Amount ($) *"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Due Date *</label>
                <input
                  type="date"
                  className="input"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="flex gap-3">
                <button
                  onClick={submitPayment}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Adding..." : "Add Payment"}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {["all", "fixed", "variable"].map((tab) => (
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

        {/* Payments List */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <CreditCard size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No payments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((payment) => (
              <div key={payment.id} className="card fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      payment.type === "fixed"
                        ? "bg-navy-50 text-navy-700"
                        : "bg-coral-50 text-coral-400"
                    }`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-navy-700 text-sm">{payment.name}</p>
                      <p className="text-xs text-gray-400">{payment.category}</p>
                      <p className="text-xs text-gray-400">
                        Due: {format(new Date(payment.dueDate), "MMM d")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-navy-700">
                      ${payment.amount.toFixed(2)}
                    </p>
                    <span className={`${
                      payment.status === "paid"
                        ? "badge-green"
                        : payment.status === "overdue"
                        ? "badge-red"
                        : "badge-yellow"
                    } flex items-center gap-1 mt-1`}>
                      {payment.status === "paid" ? <Check size={10} /> :
                       payment.status === "overdue" ? <AlertTriangle size={10} /> :
                       <Clock size={10} />}
                      {payment.status}
                    </span>
                  </div>
                </div>

                {payment.notes && (
                  <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                    {payment.notes}
                  </p>
                )}

                {payment.status === "pending" && isGM && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => markAsPaid(payment.id)}
                      className="btn-primary py-2 px-4 text-sm flex items-center gap-1 flex-1"
                    >
                      <Check size={14} /> Mark Paid
                    </button>
                    <button
                      onClick={() => deletePayment(payment.id)}
                      className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {payment.status === "paid" && payment.paidBy && (
                  <p className="text-xs text-teal-400 mt-2">
                    ✓ Paid by {payment.paidBy}
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

function SummaryCard({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color: string;
}) {
  const colorMap: any = {
    navy: "text-navy-700",
    coral: "text-coral-400",
    teal: "text-teal-400",
    yellow: "text-yellow-500",
  };
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colorMap[color]}`}>
        ${amount.toFixed(2)}
      </p>
    </div>
  );
}
