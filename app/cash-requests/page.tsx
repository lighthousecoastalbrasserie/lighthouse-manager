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
  DollarSign,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface CashRequest {
  id: string;
  amount: number;
  reason: string;
  requestedBy: string;
  requestedByName: string;
  status: "pending" | "approved" | "used" | "settled" | "rejected";
  approvedBy?: string;
  approvedByName?: string;
  usedAt?: Date;
  settledAt?: Date;
  notes?: string;
  createdAt: any;
}

export default function CashRequestsPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<CashRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ amount: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  useEffect(() => {
    if (!loading && !profile) router.push("/");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) fetchRequests();
  }, [profile, activeTab]);

  const fetchRequests = async () => {
    setPageLoading(true);
    try {
      let q;
      if (isGM || isAGM) {
        q = activeTab === "pending"
          ? query(collection(db, "cash_requests"), where("status", "==", "pending"), orderBy("createdAt", "desc"))
          : query(collection(db, "cash_requests"), orderBy("createdAt", "desc"));
      } else {
        q = query(
          collection(db, "cash_requests"),
          where("requestedBy", "==", profile?.uid),
          orderBy("createdAt", "desc")
        );
      }
      const snap = await getDocs(q);
      const data: CashRequest[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as CashRequest));
      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!form.amount || !form.reason.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "cash_requests"), {
        amount: parseFloat(form.amount),
        reason: form.reason.trim(),
        requestedBy: profile?.uid,
        requestedByName: profile?.name,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast.success("Cash request submitted!");
      setForm({ amount: "", reason: "" });
      setShowForm(false);
      fetchRequests();
    } catch (error) {
      toast.error("Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: CashRequest["status"],
    notes?: string
  ) => {
    try {
      const updateData: any = { status };
      if (status === "approved") {
        updateData.approvedBy = profile?.uid;
        updateData.approvedByName = profile?.name;
        updateData.approvedAt = serverTimestamp();
      }
      if (status === "used") updateData.usedAt = serverTimestamp();
      if (status === "settled") updateData.settledAt = serverTimestamp();
      if (notes) updateData.notes = notes;

      await updateDoc(doc(db, "cash_requests", id), updateData);
      toast.success(`Request ${status}!`);
      fetchRequests();
    } catch (error) {
      toast.error("Error updating request");
    }
  };

  const getStatusBadge = (status: CashRequest["status"]) => {
    const map = {
      pending: "badge-yellow",
      approved: "badge-green",
      used: "bg-blue-50 text-blue-500 text-xs font-semibold px-3 py-1 rounded-full",
      settled: "badge-green",
      rejected: "badge-red",
    };
    return map[status] || "badge-yellow";
  };

  const getStatusIcon = (status: CashRequest["status"]) => {
    if (status === "pending") return <Clock size={14} />;
    if (status === "approved" || status === "settled") return <Check size={14} />;
    if (status === "rejected") return <X size={14} />;
    return <DollarSign size={14} />;
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
            <h1 className="text-xl font-bold text-navy-700">Cash Requests</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> New Request
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* New Request Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">New Cash Request</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-navy-700 mb-1 block">
                  Amount ($)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-navy-700 mb-1 block">
                  Reason / Purpose
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Explain why this cash is needed..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={submitRequest}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
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

        {/* Tabs for GM/AGM */}
        {(isGM || isAGM) && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
                activeTab === "pending"
                  ? "bg-coral-400 text-white"
                  : "bg-white text-gray-400 hover:bg-coral-50"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
                activeTab === "all"
                  ? "bg-navy-700 text-white"
                  : "bg-white text-gray-400 hover:bg-gray-50"
              }`}
            >
              All Requests
            </button>
          </div>
        )}

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="card text-center py-12">
            <DollarSign size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No cash requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="card fade-in">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-coral-50 rounded-xl flex items-center justify-center text-coral-400">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-navy-700">
                        ${req.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">{req.requestedByName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${getStatusBadge(req.status)} flex items-center gap-1`}>
                      {getStatusIcon(req.status)}
                      {req.status}
                    </span>
                    {expandedId === req.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedId === req.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 fade-in">
                    <p className="text-sm text-navy-700 mb-2">
                      <span className="font-semibold">Reason:</span> {req.reason}
                    </p>
                    {req.createdAt && (
                      <p className="text-xs text-gray-400 mb-2">
                        Requested:{" "}
                        {format(req.createdAt.toDate?.() || new Date(), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                    {req.approvedByName && (
                      <p className="text-xs text-teal-400 mb-2">
                        ✓ Approved by {req.approvedByName}
                      </p>
                    )}
                    {req.notes && (
                      <p className="text-xs text-gray-400 mb-3">
                        Note: {req.notes}
                      </p>
                    )}

                    {/* GM Actions */}
                    {isGM && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {req.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateStatus(req.id, "approved")}
                              className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() => updateStatus(req.id, "rejected")}
                              className="btn-danger py-2 px-4 text-sm flex items-center gap-1"
                            >
                              <X size={14} /> Reject
                            </button>
                          </>
                        )}
                        {req.status === "approved" && (
                          <button
                            onClick={() => updateStatus(req.id, "used")}
                            className="btn-primary py-2 px-4 text-sm"
                          >
                            Mark as Used
                          </button>
                        )}
                        {req.status === "used" && (
                          <button
                            onClick={() => updateStatus(req.id, "settled")}
                            className="btn-primary py-2 px-4 text-sm"
                          >
                            Mark as Settled
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
