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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  Target,
  Edit2,
  Check,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format, startOfWeek, endOfWeek } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SalesGoal {
  id: string;
  period: "weekly" | "monthly";
  periodKey: string;
  goal: number;
  actual: number;
  setBy: string;
  setByName: string;
  createdAt: any;
}

interface SalesEntry {
  id: string;
  amount: number;
  date: string;
  loggedBy: string;
  loggedByName: string;
  notes: string;
  period: "weekly" | "monthly";
  periodKey: string;
  createdAt: any;
}

export default function SalesGoalsPage() {
  const { profile, loading, isGM } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [entries, setEntries] = useState<SalesEntry[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SalesGoal | null>(null);
  const [goalForm, setGoalForm] = useState({
    period: "weekly" as "weekly" | "monthly",
    goal: "",
  });
  const [salesForm, setSalesForm] = useState({
    amount: "",
    notes: "",
    period: "weekly" as "weekly" | "monthly",
  });
  const [submitting, setSubmitting] = useState(false);

  const today = new Date();
  const currentMonth = format(today, "yyyy-MM");
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const currentWeekKey = `${weekStart}_${weekEnd}`;

  useEffect(() => {
    if (!loading && !profile) router.push("/");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setPageLoading(true);
    try {
      // Fetch goals
      const goalsSnap = await getDocs(
        query(
          collection(db, "sales_goals"),
          where("periodKey", "in", [currentMonth, currentWeekKey])
        )
      );
      const goalsData: SalesGoal[] = [];
      goalsSnap.forEach((d) => goalsData.push({ id: d.id, ...d.data() } as SalesGoal));
      setGoals(goalsData);

      // Fetch entries
      const entriesSnap = await getDocs(
        query(
          collection(db, "sales_entries"),
          where("periodKey", "in", [currentMonth, currentWeekKey])
        )
      );
      const entriesData: SalesEntry[] = [];
      entriesSnap.forEach((d) => entriesData.push({ id: d.id, ...d.data() } as SalesEntry));
      setEntries(entriesData);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitGoal = async () => {
    if (!goalForm.goal) {
      toast.error("Please enter a goal amount");
      return;
    }
    setSubmitting(true);
    try {
      const periodKey = goalForm.period === "monthly" ? currentMonth : currentWeekKey;
      const existing = goals.find(
        (g) => g.period === goalForm.period && g.periodKey === periodKey
      );

      if (existing) {
        await updateDoc(doc(db, "sales_goals", existing.id), {
          goal: parseFloat(goalForm.goal),
          setBy: profile?.uid,
          setByName: profile?.name,
          updatedAt: serverTimestamp(),
        });
        toast.success("Goal updated!");
      } else {
        await addDoc(collection(db, "sales_goals"), {
          period: goalForm.period,
          periodKey,
          goal: parseFloat(goalForm.goal),
          actual: 0,
          setBy: profile?.uid,
          setByName: profile?.name,
          createdAt: serverTimestamp(),
        });
        toast.success("Goal set!");
      }
      setGoalForm({ period: "weekly", goal: "" });
      setShowGoalForm(false);
      fetchData();
    } catch (error) {
      toast.error("Error setting goal");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSales = async () => {
    if (!salesForm.amount) {
      toast.error("Please enter a sales amount");
      return;
    }
    setSubmitting(true);
    try {
      const periodKey =
        salesForm.period === "monthly" ? currentMonth : currentWeekKey;
      await addDoc(collection(db, "sales_entries"), {
        amount: parseFloat(salesForm.amount),
        notes: salesForm.notes.trim(),
        period: salesForm.period,
        periodKey,
        date: format(today, "yyyy-MM-dd"),
        loggedBy: profile?.uid,
        loggedByName: profile?.name,
        createdAt: serverTimestamp(),
      });
      toast.success("Sales logged!");
      setSalesForm({ amount: "", notes: "", period: "weekly" });
      setShowSalesForm(false);
      fetchData();
    } catch (error) {
      toast.error("Error logging sales");
    } finally {
      setSubmitting(false);
    }
  };

  const getActual = (period: "weekly" | "monthly", periodKey: string) => {
    return entries
      .filter((e) => e.period === period && e.periodKey === periodKey)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const weeklyGoal = goals.find(
    (g) => g.period === "weekly" && g.periodKey === currentWeekKey
  );
  const monthlyGoal = goals.find(
    (g) => g.period === "monthly" && g.periodKey === currentMonth
  );
  const weeklyActual = getActual("weekly", currentWeekKey);
  const monthlyActual = getActual("monthly", currentMonth);

  const chartData = [
    {
      name: "This Week",
      Goal: weeklyGoal?.goal || 0,
      Actual: weeklyActual,
    },
    {
      name: "This Month",
      Goal: monthlyGoal?.goal || 0,
      Actual: monthlyActual,
    },
  ];

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
            <h1 className="text-xl font-bold text-navy-700">Sales Goals</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSalesForm(!showSalesForm)}
              className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm"
            >
              <Plus size={16} /> Log Sales
            </button>
            {isGM && (
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
              >
                <Target size={16} /> Set Goal
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Goal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <GoalCard
            label="This Week"
            period={`${weekStart} → ${weekEnd}`}
            goal={weeklyGoal?.goal || 0}
            actual={weeklyActual}
          />
          <GoalCard
            label="This Month"
            period={format(today, "MMMM yyyy")}
            goal={monthlyGoal?.goal || 0}
            actual={monthlyActual}
          />
        </div>

        {/* Chart */}
        {(weeklyGoal || monthlyGoal) && (
          <div className="card mb-6">
            <h2 className="font-bold text-navy-700 mb-4">📊 Goals vs Actual</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) =>
                    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  }
                />
                <Legend />
                <Bar dataKey="Goal" fill="#E8637A" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Actual" fill="#4DC8C8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Set Goal Form */}
        {showGoalForm && isGM && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Set Sales Goal</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setGoalForm({ ...goalForm, period: "weekly" })}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all ${
                    goalForm.period === "weekly"
                      ? "bg-teal-400 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setGoalForm({ ...goalForm, period: "monthly" })}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all ${
                    goalForm.period === "monthly"
                      ? "bg-navy-700 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  Monthly
                </button>
              </div>
              <input
                type="number"
                className="input"
                placeholder="Goal amount ($)"
                value={goalForm.goal}
                onChange={(e) => setGoalForm({ ...goalForm, goal: e.target.value })}
              />
              <div className="flex gap-3">
                <button
                  onClick={submitGoal}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Set Goal"}
                </button>
                <button
                  onClick={() => setShowGoalForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Log Sales Form */}
        {showSalesForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Log Sales</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSalesForm({ ...salesForm, period: "weekly" })}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all ${
                    salesForm.period === "weekly"
                      ? "bg-teal-400 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setSalesForm({ ...salesForm, period: "monthly" })}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all ${
                    salesForm.period === "monthly"
                      ? "bg-navy-700 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  Monthly
                </button>
              </div>
              <input
                type="number"
                className="input"
                placeholder="Sales amount ($)"
                value={salesForm.amount}
                onChange={(e) =>
                  setSalesForm({ ...salesForm, amount: e.target.value })
                }
              />
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Notes (optional)"
                value={salesForm.notes}
                onChange={(e) =>
                  setSalesForm({ ...salesForm, notes: e.target.value })
                }
              />
              <div className="flex gap-3">
                <button
                  onClick={submitSales}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Log Sales"}
                </button>
                <button
                  onClick={() => setShowSalesForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Entries */}
        {entries.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-navy-700 mb-4">Recent Sales Entries</h2>
            <div className="space-y-3">
              {entries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy-700">
                      {entry.loggedByName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.date} · {entry.period}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-gray-400">{entry.notes}</p>
                    )}
                  </div>
                  <p className="font-bold text-teal-400">
                    ${entry.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GoalCard({
  label,
  period,
  goal,
  actual,
}: {
  label: string;
  period: string;
  goal: number;
  actual: number;
}) {
  const percentage = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0;
  const isAhead = actual >= goal && goal > 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-navy-700">{label}</p>
          <p className="text-xs text-gray-400">{period}</p>
        </div>
        <TrendingUp
          size={20}
          className={isAhead ? "text-teal-400" : "text-gray-300"}
        />
      </div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">Actual</span>
        <span className="text-gray-400">Goal</span>
      </div>
      <div className="flex justify-between font-bold mb-3">
        <span className="text-teal-400 text-xl">
          ${actual.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="text-navy-700 text-xl">
          ${goal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${
            isAhead ? "bg-teal-400" : "bg-coral-400"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-2 text-right">
        {percentage.toFixed(1)}% of goal
      </p>
    </div>
  );
}
