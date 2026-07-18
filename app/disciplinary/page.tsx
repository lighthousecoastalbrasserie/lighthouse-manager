 "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context";
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface DisciplinaryEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "late" | "written" | "yellow" | "red" | "termination";
  date: string;
  description: string;
  minutesLate?: number;
  loggedBy: string;
  loggedByName: string;
  acknowledged: boolean;
  acknowledgeNote?: string;
  createdAt: any;
}

interface Employee {
  id: string;
  fullName: string;
  position: string;
  department: string;
  lateCount: number;
  disciplinaryStep: string;
}

export default function DisciplinaryPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<DisciplinaryEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "late" | "warnings">("all");
  const [form, setForm] = useState({
    employeeId: "",
    type: "late" as DisciplinaryEntry["type"],
    description: "",
    minutesLate: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !profile) router.push("/");
    if (!loading && !isGM && !isAGM) router.push("/dashboard");
  }, [loading, profile, isGM, isAGM, router]);

  useEffect(() => {
    if (profile && (isGM || isAGM)) {
      fetchEmployees();
      fetchEntries();
    }
  }, [profile, activeTab]);

  const fetchEmployees = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "employees"), orderBy("fullName", "asc"))
      );
      const data: Employee[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Employee));
      setEmployees(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchEntries = async () => {
    setPageLoading(true);
    try {
      let q;
      if (activeTab === "late") {
        q = query(
          collection(db, "disciplinary"),
          where("type", "==", "late"),
          orderBy("createdAt", "desc")
        );
      } else if (activeTab === "warnings") {
        q = query(
          collection(db, "disciplinary"),
          where("type", "in", ["written", "yellow", "red", "termination"]),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "disciplinary"),
          orderBy("createdAt", "desc")
        );
      }
      const snap = await getDocs(q);
      const data: DisciplinaryEntry[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as DisciplinaryEntry));
      setEntries(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitEntry = async () => {
    if (!form.employeeId || !form.description.trim()) {
      toast.error("Please select an employee and add a description");
      return;
    }
    setSubmitting(true);
    try {
      const employee = employees.find((e) => e.id === form.employeeId);
      if (!employee) return;

      // Add disciplinary entry
      await addDoc(collection(db, "disciplinary"), {
        employeeId: form.employeeId,
        employeeName: employee.fullName,
        type: form.type,
        date: form.date,
        description: form.description.trim(),
        minutesLate: form.type === "late" ? parseInt(form.minutesLate) : null,
        loggedBy: profile?.uid,
        loggedByName: profile?.name,
        acknowledged: false,
        createdAt: serverTimestamp(),
      });

      // Update employee record
      if (form.type === "late") {
        const newLateCount = (employee.lateCount || 0) + 1;
        const updateData: any = { lateCount: newLateCount };

        // Auto trigger written warning at 3 lates
        if (newLateCount >= 3) {
          updateData.lateCount = 0; // Reset counter
          updateData.disciplinaryStep = "written";

          // Auto-create written warning
          await addDoc(collection(db, "disciplinary"), {
            employeeId: form.employeeId,
            employeeName: employee.fullName,
            type: "written",
            date: form.date,
            description: `Auto-generated: Written warning issued after 3 late arrivals.`,
            loggedBy: profile?.uid,
            loggedByName: profile?.name,
            acknowledged: false,
            autoGenerated: true,
            createdAt: serverTimestamp(),
          });

          toast.success(
            `⚠️ 3 lates reached — Written Warning auto-issued for ${employee.fullName}!`,
            { duration: 5000 }
          );
        } else {
          toast.success(
            `Late logged. ${employee.fullName} now has ${newLateCount}/3 lates.`
          );
        }
        await updateDoc(doc(db, "employees", form.employeeId), updateData);
      } else {
        // Update disciplinary step
        const stepMap: any = {
          written: "written",
          yellow: "yellow",
          red: "red",
          termination: "terminated",
        };
        await updateDoc(doc(db, "employees", form.employeeId), {
          disciplinaryStep: stepMap[form.type] || "written",
          status: form.type === "termination" ? "terminated" : "active",
        });
        toast.success(`${form.type} warning issued for ${employee.fullName}`);
      }

      setForm({
        employeeId: "",
        type: "late",
        description: "",
        minutesLate: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
      setShowForm(false);
      fetchEmployees();
      fetchEntries();
    } catch (error) {
      toast.error("Error logging entry");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const map: any = {
      late: "bg-blue-50 text-blue-500 text-xs font-semibold px-3 py-1 rounded-full",
      written: "bg-purple-50 text-purple-500 text-xs font-semibold px-3 py-1 rounded-full",
      yellow: "badge-yellow",
      red: "badge-red",
      termination: "bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full",
    };
    return map[type] || "badge-yellow";
  };

  const getTypeEmoji = (type: string) => {
    const map: any = {
      late: "⏰",
      written: "📝",
      yellow: "🟡",
      red: "🔴",
      termination: "🚪",
    };
    return map[type] || "⚠️";
  };

  const onWarning = employees.filter((e) => e.disciplinaryStep !== "none");

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
            <h1 className="text-xl font-bold text-navy-700">Disciplinary</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> Log Entry
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Employees on Warning */}
        {onWarning.length > 0 && (
          <div className="card mb-6 border-2 border-yellow-200">
            <p className="font-bold text-navy-700 mb-3">
              ⚠️ Currently on Warning ({onWarning.length})
            </p>
            <div className="space-y-2">
              {onWarning.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-yellow-500" />
                    <div>
                      <p className="text-sm font-semibold text-navy-700">
                        {emp.fullName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {emp.position} · {emp.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-500 font-semibold">
                      ⏰ {emp.lateCount}/3
                    </span>
                    <span className={getTypeBadge(emp.disciplinaryStep)}>
                      {getTypeEmoji(emp.disciplinaryStep)} {emp.disciplinaryStep}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Log Disciplinary Entry</h2>
            <div className="space-y-4">
              {/* Employee Select */}
              <select
                className="input"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              >
                <option value="">Select employee *</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} — {e.position}
                  </option>
                ))}
              </select>

              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Entry Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["late", "written", "yellow", "red", "termination"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, type: type as DisciplinaryEntry["type"] })}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold capitalize transition-all ${
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

              {/* Date */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              {/* Minutes Late */}
              {form.type === "late" && (
                <input
                  type="number"
                  className="input"
                  placeholder="Minutes late"
                  value={form.minutesLate}
                  onChange={(e) => setForm({ ...form, minutesLate: e.target.value })}
                />
              )}

              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Description / notes *"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div className="flex gap-3">
                <button
                  onClick={submitEntry}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Log Entry"}
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
          {["all", "late", "warnings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm capitalize transition-all ${
                activeTab === tab
                  ? "bg-teal-400 text-white"
                  : "bg-white text-gray-400 hover:bg-teal-50"
              }`}
            >
              {tab === "late" ? "⏰ Lates" : tab === "warnings" ? "⚠️ Warnings" : "All"}
            </button>
          ))}
        </div>

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="card text-center py-12">
            <AlertTriangle size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No disciplinary entries found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="card fade-in">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === entry.id ? null : entry.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getTypeEmoji(entry.type)}</div>
                    <div>
                      <p className="font-bold text-navy-700 text-sm">
                        {entry.employeeName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.date} · by {entry.loggedByName}
                      </p>
                      {entry.minutesLate && (
                        <p className="text-xs text-blue-400">
                          <Clock size={10} className="inline mr-1" />
                          {entry.minutesLate} min late
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getTypeBadge(entry.type)}>
                      {entry.type}
                    </span>
                    {expandedId === entry.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedId === entry.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 fade-in">
                    <div className="bg-gray-50 p-3 rounded-xl mb-3">
                      <p className="text-xs font-semibold text-gray-400 mb-1">
                        Description
                      </p>
                      <p className="text-sm text-navy-700">{entry.description}</p>
                    </div>
                    {entry.acknowledged ? (
                      <p className="text-xs text-teal-400">
                        ✓ Acknowledged: {entry.acknowledgeNote}
                      </p>
                    ) : (
                      isGM && (
                        <AcknowledgeForm
                          onAcknowledge={async (note) => {
                            await updateDoc(doc(db, "disciplinary", entry.id), {
                              acknowledged: true,
                              acknowledgeNote: note,
                              acknowledgedAt: serverTimestamp(),
                            });
                            toast.success("Entry acknowledged!");
                            fetchEntries();
                          }}
                        />
                      )
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

function AcknowledgeForm({
  onAcknowledge,
}: {
  onAcknowledge: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2">
      <input
        className="input"
        placeholder="Employee acknowledgment note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        onClick={() => onAcknowledge(note)}
        className="btn-primary w-full text-sm py-2"
      >
        Mark as Acknowledged
      </button>
    </div>
  );
}
