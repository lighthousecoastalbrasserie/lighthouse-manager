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
  FileText,
  Sun,
  Moon,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface ShiftLog {
  id: string;
  shift: "opening" | "closing";
  date: string;
  loggedBy: string;
  loggedByName: string;
  staffingNotes: string;
  salesNotes: string;
  incidentNotes: string;
  generalNotes: string;
  createdAt: any;
}

export default function ShiftLogPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    shift: "opening" as "opening" | "closing",
    staffingNotes: "",
    salesNotes: "",
    incidentNotes: "",
    generalNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!loading && !profile) router.push("/");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) fetchLogs();
  }, [profile]);

  const fetchLogs = async () => {
    setPageLoading(true);
    try {
      let q;
      if (isGM || isAGM) {
        q = query(
          collection(db, "shift_logs"),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "shift_logs"),
          where("loggedBy", "==", profile?.uid),
          orderBy("createdAt", "desc")
        );
      }
      const snap = await getDocs(q);
      const data: ShiftLog[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as ShiftLog));
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitLog = async () => {
    if (
      !form.generalNotes.trim() &&
      !form.staffingNotes.trim() &&
      !form.salesNotes.trim()
    ) {
      toast.error("Please add at least one note");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "shift_logs"), {
        shift: form.shift,
        date: today,
        loggedBy: profile?.uid,
        loggedByName: profile?.name,
        staffingNotes: form.staffingNotes.trim(),
        salesNotes: form.salesNotes.trim(),
        incidentNotes: form.incidentNotes.trim(),
        generalNotes: form.generalNotes.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Shift log saved!");
      setForm({
        shift: "opening",
        staffingNotes: "",
        salesNotes: "",
        incidentNotes: "",
        generalNotes: "",
      });
      setShowForm(false);
      fetchLogs();
    } catch (error) {
      toast.error("Error saving shift log");
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="text-xl font-bold text-navy-700">Shift Log</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> New Log
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* New Log Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">New Shift Log</h2>

            {/* Shift Type */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setForm({ ...form, shift: "opening" })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  form.shift === "opening"
                    ? "bg-teal-400 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Sun size={16} /> Opening
              </button>
              <button
                onClick={() => setForm({ ...form, shift: "closing" })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  form.shift === "closing"
                    ? "bg-navy-700 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Moon size={16} /> Closing
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-navy-700 mb-1 block">
                  👥 Staffing Notes
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Any staffing issues, call-outs, late arrivals..."
                  value={form.staffingNotes}
                  onChange={(e) =>
                    setForm({ ...form, staffingNotes: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-navy-700 mb-1 block">
                  💰 Sales Notes
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="How was the night? Busy periods, slow periods..."
                  value={form.salesNotes}
                  onChange={(e) =>
                    setForm({ ...form, salesNotes: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-navy-700 mb-1 block">
                  🚨 Incident Notes
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Any incidents, complaints, or issues..."
                  value={form.incidentNotes}
                  onChange={(e) =>
                    setForm({ ...form, incidentNotes: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-navy-700 mb-1 block">
                  📝 General Notes
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Anything else worth noting..."
                  value={form.generalNotes}
                  onChange={(e) =>
                    setForm({ ...form, generalNotes: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={submitLog}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Save Shift Log"}
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

        {/* Logs List */}
        {logs.length === 0 ? (
          <div className="card text-center py-12">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No shift logs yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="card fade-in">
                {/* Log Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      log.shift === "opening"
                        ? "bg-teal-50 text-teal-400"
                        : "bg-navy-50 text-navy-700"
                    }`}>
                      {log.shift === "opening" ? <Sun size={20} /> : <Moon size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-navy-700 capitalize">
                        {log.shift} Shift
                      </p>
                      <p className="text-xs text-gray-400">
                        {log.loggedByName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={12} />
                    {log.date}
                  </div>
                </div>

                {/* Log Sections */}
                <div className="space-y-3">
                  {log.staffingNotes && (
                    <LogSection
                      emoji="👥"
                      label="Staffing"
                      content={log.staffingNotes}
                    />
                  )}
                  {log.salesNotes && (
                    <LogSection
                      emoji="💰"
                      label="Sales"
                      content={log.salesNotes}
                    />
                  )}
                  {log.incidentNotes && (
                    <LogSection
                      emoji="🚨"
                      label="Incidents"
                      content={log.incidentNotes}
                      highlight
                    />
                  )}
                  {log.generalNotes && (
                    <LogSection
                      emoji="📝"
                      label="General"
                      content={log.generalNotes}
                    />
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

function LogSection({
  emoji,
  label,
  content,
  highlight = false,
}: {
  emoji: string;
  label: string;
  content: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-xl ${highlight ? "bg-coral-50" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold mb-1 ${highlight ? "text-coral-400" : "text-gray-400"}`}>
        {emoji} {label}
      </p>
      <p className="text-sm text-navy-700">{content}</p>
    </div>
  );
}
