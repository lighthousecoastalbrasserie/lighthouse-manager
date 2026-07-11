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
  Bell,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Incident {
  id: string;
  title: string;
  description: string;
  type: "fight" | "accident" | "complaint" | "equipment" | "other";
  severity: "low" | "medium" | "high";
  involvedParties: string;
  actionTaken: string;
  status: "open" | "resolved";
  loggedBy: string;
  loggedByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  date: string;
  createdAt: any;
}

export default function IncidentsPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "all">("open");
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "other" as Incident["type"],
    severity: "medium" as Incident["severity"],
    involvedParties: "",
    actionTaken: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!loading && !profile) router.push("/");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) fetchIncidents();
  }, [profile, activeTab]);

  const fetchIncidents = async () => {
    setPageLoading(true);
    try {
      let q;
      if (isGM || isAGM) {
        q = activeTab === "open"
          ? query(collection(db, "incidents"), where("status", "==", "open"), orderBy("createdAt", "desc"))
          : query(collection(db, "incidents"), orderBy("createdAt", "desc"));
      } else {
        q = query(
          collection(db, "incidents"),
          where("loggedBy", "==", profile?.uid),
          orderBy("createdAt", "desc")
        );
      }
      const snap = await getDocs(q);
      const data: Incident[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Incident));
      setIncidents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitIncident = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Please fill in title and description");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "incidents"), {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        involvedParties: form.involvedParties.trim(),
        actionTaken: form.actionTaken.trim(),
        status: "open",
        loggedBy: profile?.uid,
        loggedByName: profile?.name,
        date: today,
        createdAt: serverTimestamp(),
      });
      toast.success("Incident logged!");
      setForm({
        title: "",
        description: "",
        type: "other",
        severity: "medium",
        involvedParties: "",
        actionTaken: "",
      });
      setShowForm(false);
      fetchIncidents();
    } catch (error) {
      toast.error("Error logging incident");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveIncident = async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, "incidents", id), {
        status: "resolved",
        reviewedBy: profile?.uid,
        reviewedByName: profile?.name,
        reviewNotes: notes,
        resolvedAt: serverTimestamp(),
      });
      toast.success("Incident resolved!");
      fetchIncidents();
    } catch (error) {
      toast.error("Error resolving incident");
    }
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === "low") return "badge-green";
    if (severity === "medium") return "badge-yellow";
    return "badge-red";
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === "high") return <AlertTriangle size={14} className="text-red-400" />;
    if (severity === "medium") return <Clock size={14} className="text-yellow-400" />;
    return <CheckCircle size={14} className="text-teal-400" />;
  };

  const getTypeEmoji = (type: string) => {
    const map: any = {
      fight: "🥊",
      accident: "🚑",
      complaint: "💬",
      equipment: "🔧",
      other: "📋",
    };
    return map[type] || "📋";
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
            <h1 className="text-xl font-bold text-navy-700">Incident Log</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> Log Incident
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Log New Incident</h2>
            <div className="space-y-4">
              <input
                className="input"
                placeholder="Incident title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {["fight", "accident", "complaint", "equipment", "other"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, type: type as Incident["type"] })}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize transition-all ${
                        form.type === type
                          ? "bg-teal-400 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {getTypeEmoji(type)} {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Severity</label>
                <div className="flex gap-2">
                  {["low", "medium", "high"].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setForm({ ...form, severity: sev as Incident["severity"] })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                        form.severity === sev
                          ? sev === "low"
                            ? "bg-teal-400 text-white"
                            : sev === "medium"
                            ? "bg-yellow-400 text-white"
                            : "bg-coral-400 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="input resize-none"
                rows={4}
                placeholder="Describe what happened in detail *"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <input
                className="input"
                placeholder="Involved parties (names, staff, customers...)"
                value={form.involvedParties}
                onChange={(e) => setForm({ ...form, involvedParties: e.target.value })}
              />
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Action taken..."
                value={form.actionTaken}
                onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
              />
              <div className="flex gap-3">
                <button
                  onClick={submitIncident}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Log Incident"}
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
        {(isGM || isAGM) && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("open")}
              className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
                activeTab === "open"
                  ? "bg-coral-400 text-white"
                  : "bg-white text-gray-400 hover:bg-coral-50"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
                activeTab === "all"
                  ? "bg-navy-700 text-white"
                  : "bg-white text-gray-400 hover:bg-gray-50"
              }`}
            >
              All Incidents
            </button>
          </div>
        )}

        {/* Incidents List */}
        {incidents.length === 0 ? (
          <div className="card text-center py-12">
            <Bell size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No incidents found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div key={incident.id} className="card fade-in">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === incident.id ? null : incident.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-coral-50 rounded-xl flex items-center justify-center text-xl">
                      {getTypeEmoji(incident.type)}
                    </div>
                    <div>
                      <p className="font-bold text-navy-700 text-sm">
                        {incident.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {incident.loggedByName} · {incident.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getSeverityBadge(incident.severity)}>
                      {incident.severity}
                    </span>
                    <span className={incident.status === "open" ? "badge-yellow" : "badge-green"}>
                      {incident.status}
                    </span>
                    {expandedId === incident.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedId === incident.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 fade-in">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-xs font-semibold text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-navy-700">{incident.description}</p>
                    </div>
                    {incident.involvedParties && (
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-xs font-semibold text-gray-400 mb-1">Involved Parties</p>
                        <p className="text-sm text-navy-700">{incident.involvedParties}</p>
                      </div>
                    )}
                    {incident.actionTaken && (
                      <div className="bg-teal-50 p-3 rounded-xl">
                        <p className="text-xs font-semibold text-teal-400 mb-1">Action Taken</p>
                        <p className="text-sm text-navy-700">{incident.actionTaken}</p>
                      </div>
                    )}
                    {incident.reviewNotes && (
                      <div className="bg-navy-50 p-3 rounded-xl">
                        <p className="text-xs font-semibold text-navy-400 mb-1">
                          Review by {incident.reviewedByName}
                        </p>
                        <p className="text-sm text-navy-700">{incident.reviewNotes}</p>
                      </div>
                    )}

                    {/* Resolve Button */}
                    {(isGM || isAGM) && incident.status === "open" && (
                      <ResolveForm
                        onResolve={(notes) => resolveIncident(incident.id, notes)}
                      />
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

function ResolveForm({ onResolve }: { onResolve: (notes: string) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-2">
      <textarea
        className="input resize-none"
        rows={2}
        placeholder="Resolution notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        onClick={() => onResolve(notes)}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        <CheckCircle size={16} /> Mark as Resolved
      </button>
    </div>
  );
}
