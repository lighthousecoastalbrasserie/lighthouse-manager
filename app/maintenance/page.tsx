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
  Wrench,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved";
  loggedBy: string;
  loggedByName: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolutionNotes?: string;
  cost?: number;
  date: string;
  createdAt: any;
}

export default function MaintenancePage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "all">("open");
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    priority: "medium" as MaintenanceItem["priority"],
  });
  const [submitting, setSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!loading && !profile) router.push("/");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) fetchItems();
  }, [profile, activeTab]);

  const fetchItems = async () => {
    setPageLoading(true);
    try {
      let q;
      if (activeTab === "open") {
        q = query(
          collection(db, "maintenance"),
          where("status", "in", ["open", "in_progress"]),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "maintenance"),
          orderBy("createdAt", "desc")
        );
      }
      const snap = await getDocs(q);
      const data: MaintenanceItem[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as MaintenanceItem));
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitItem = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "maintenance"), {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        priority: form.priority,
        status: "open",
        loggedBy: profile?.uid,
        loggedByName: profile?.name,
        date: today,
        createdAt: serverTimestamp(),
      });
      toast.success("Maintenance issue logged!");
      setForm({ title: "", description: "", location: "", priority: "medium" });
      setShowForm(false);
      fetchItems();
    } catch (error) {
      toast.error("Error logging issue");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: MaintenanceItem["status"],
    notes?: string,
    cost?: string
  ) => {
    try {
      const updateData: any = { status };
      if (status === "resolved") {
        updateData.resolvedBy = profile?.uid;
        updateData.resolvedByName = profile?.name;
        updateData.resolutionNotes = notes;
        updateData.cost = cost ? parseFloat(cost) : 0;
        updateData.resolvedAt = serverTimestamp();
      }
      await updateDoc(doc(db, "maintenance", id), updateData);
      toast.success(`Status updated to ${status}!`);
      fetchItems();
    } catch (error) {
      toast.error("Error updating status");
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "low") return "badge-green";
    if (priority === "medium") return "badge-yellow";
    return "badge-red";
  };

  const getStatusColor = (status: string) => {
    if (status === "open") return "bg-coral-50 text-coral-400";
    if (status === "in_progress") return "bg-yellow-50 text-yellow-500";
    return "bg-teal-50 text-teal-400";
  };

  const getStatusIcon = (status: string) => {
    if (status === "open") return <AlertTriangle size={16} />;
    if (status === "in_progress") return <Clock size={16} />;
    return <CheckCircle size={16} />;
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
            <h1 className="text-xl font-bold text-navy-700">Maintenance</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> Log Issue
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Log Maintenance Issue</h2>
            <div className="space-y-4">
              <input
                className="input"
                placeholder="Issue title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                className="input"
                placeholder="Location (e.g. Bar, Kitchen, Bathroom) *"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Describe the issue in detail *"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Priority
                </label>
                <div className="flex gap-2">
                  {["low", "medium", "high"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, priority: p as MaintenanceItem["priority"] })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                        form.priority === p
                          ? p === "low"
                            ? "bg-teal-400 text-white"
                            : p === "medium"
                            ? "bg-yellow-400 text-white"
                            : "bg-coral-400 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={submitItem}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Log Issue"}
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
          <button
            onClick={() => setActiveTab("open")}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "open"
                ? "bg-coral-400 text-white"
                : "bg-white text-gray-400 hover:bg-coral-50"
            }`}
          >
            Open Issues
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "all"
                ? "bg-navy-700 text-white"
                : "bg-white text-gray-400 hover:bg-gray-50"
            }`}
          >
            All Issues
          </button>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="card text-center py-12">
            <Wrench size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No maintenance issues found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="card fade-in">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                    </div>
                    <div>
                      <p className="font-bold text-navy-700 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-400">
                        📍 {item.location} · {item.loggedByName}
                      </p>
                      <p className="text-xs text-gray-400">{item.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getPriorityBadge(item.priority)}>
                      {item.priority}
                    </span>
                    {expandedId === item.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 fade-in">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-xs font-semibold text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-navy-700">{item.description}</p>
                    </div>

                    {item.resolutionNotes && (
                      <div className="bg-teal-50 p-3 rounded-xl">
                        <p className="text-xs font-semibold text-teal-400 mb-1">
                          Resolution by {item.resolvedByName}
                        </p>
                        <p className="text-sm text-navy-700">{item.resolutionNotes}</p>
                        {item.cost && item.cost > 0 && (
                          <p className="text-xs text-coral-400 mt-1">
                            Cost: ${item.cost.toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {(isGM || isAGM) && item.status !== "resolved" && (
                      <div className="space-y-2">
                        {item.status === "open" && (
                          <button
                            onClick={() => updateStatus(item.id, "in_progress")}
                            className="btn-secondary w-full text-sm py-2"
                          >
                            Mark In Progress
                          </button>
                        )}
                        <ResolveMaintenanceForm
                          onResolve={(notes, cost) =>
                            updateStatus(item.id, "resolved", notes, cost)
                          }
                        />
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

function ResolveMaintenanceForm({
  onResolve,
}: {
  onResolve: (notes: string, cost: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");

  return (
    <div className="space-y-2">
      <textarea
        className="input resize-none"
        rows={2}
        placeholder="Resolution notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <input
        type="number"
        className="input"
        placeholder="Repair cost ($) optional"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
      />
      <button
        onClick={() => onResolve(notes, cost)}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        <CheckCircle size={16} /> Mark as Resolved
      </button>
    </div>
  );
}
