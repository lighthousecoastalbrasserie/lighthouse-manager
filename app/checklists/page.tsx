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
import { CheckSquare, Square, Plus, ArrowLeft, Sun, Moon } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  isFixed: boolean;
  type: "opening" | "closing";
}

interface Checklist {
  id: string;
  type: "opening" | "closing";
  date: string;
  assignedTo: string;
  assignedToName: string;
  completed: boolean;
  items: ChecklistItem[];
  createdAt: Date;
}

export default function ChecklistsPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"opening" | "closing">("opening");
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [myChecklist, setMyChecklist] = useState<Checklist | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!loading && !profile) router.push("/");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) fetchChecklists();
  }, [profile, activeTab]);

  const fetchChecklists = async () => {
    setPageLoading(true);
    try {
      const q = query(
        collection(db, "checklists"),
        where("date", "==", today),
        where("type", "==", activeTab)
      );
      const snap = await getDocs(q);
      const data: Checklist[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Checklist));

      setChecklists(data);
      const mine = data.find((c) => c.assignedTo === profile?.uid);
      setMyChecklist(mine || null);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const toggleItem = async (itemIndex: number) => {
    if (!myChecklist) return;
    const updatedItems = [...myChecklist.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      completed: !updatedItems[itemIndex].completed,
      completedBy: profile?.name,
      completedAt: new Date(),
    };
    const allDone = updatedItems.every((i) => i.completed);
    await updateDoc(doc(db, "checklists", myChecklist.id), {
      items: updatedItems,
      completed: allDone,
    });
    setMyChecklist({ ...myChecklist, items: updatedItems, completed: allDone });
    if (allDone) toast.success("Checklist completed! 🎉");
  };

  const addExtraTask = async () => {
    if (!newTask.trim() || !myChecklist) return;
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      task: newTask.trim(),
      completed: false,
      isFixed: false,
      type: activeTab,
    };
    const updatedItems = [...myChecklist.items, newItem];
    await updateDoc(doc(db, "checklists", myChecklist.id), {
      items: updatedItems,
    });
    setMyChecklist({ ...myChecklist, items: updatedItems });
    setNewTask("");
    setShowAddTask(false);
    toast.success("Task added!");
  };

  const createChecklist = async () => {
    try {
      const fixedTasks = getFixedTasks(activeTab);
      const newChecklist = {
        type: activeTab,
        date: today,
        assignedTo: profile?.uid,
        assignedToName: profile?.name,
        completed: false,
        items: fixedTasks,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "checklists"), newChecklist);
      setMyChecklist({ id: ref.id, ...newChecklist, createdAt: new Date() });
      toast.success("Checklist started!");
    } catch (error) {
      console.error(error);
      toast.error("Error creating checklist");
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
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-teal-50 rounded-xl text-teal-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-navy-700">Shift Checklists</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("opening")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "opening"
                ? "bg-teal-400 text-white"
                : "bg-white text-gray-400 hover:bg-teal-50"
            }`}
          >
            <Sun size={16} /> Opening
          </button>
          <button
            onClick={() => setActiveTab("closing")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "closing"
                ? "bg-navy-700 text-white"
                : "bg-white text-gray-400 hover:bg-gray-50"
            }`}
          >
            <Moon size={16} /> Closing
          </button>
        </div>

        {/* GM View — all checklists */}
        {isGM && checklists.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-bold text-navy-700 mb-4">Today's Overview</h2>
            <div className="space-y-3">
              {checklists.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-navy-700 text-sm">{c.assignedToName}</p>
                    <p className="text-xs text-gray-400">
                      {c.items.filter((i) => i.completed).length}/{c.items.length} tasks
                    </p>
                  </div>
                  <span className={c.completed ? "badge-green" : "badge-yellow"}>
                    {c.completed ? "Complete" : "In Progress"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Checklist */}
        {myChecklist ? (
          <div className="card fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-navy-700">
                  {activeTab === "opening" ? "☀️ Opening" : "🌙 Closing"} Checklist
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {myChecklist.items.filter((i) => i.completed).length} of{" "}
                  {myChecklist.items.length} completed
                </p>
              </div>
              <span className={myChecklist.completed ? "badge-green" : "badge-yellow"}>
                {myChecklist.completed ? "Done ✓" : "In Progress"}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
              <div
                className="bg-teal-400 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(myChecklist.items.filter((i) => i.completed).length / myChecklist.items.length) * 100}%`,
                }}
              />
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              {myChecklist.items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(index)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                    item.completed
                      ? "bg-teal-50 border-2 border-teal-200"
                      : "bg-gray-50 border-2 border-transparent hover:border-teal-100"
                  }`}
                >
                  {item.completed ? (
                    <CheckSquare size={20} className="text-teal-400 shrink-0" />
                  ) : (
                    <Square size={20} className="text-gray-300 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${item.completed ? "line-through text-gray-400" : "text-navy-700"}`}>
                      {item.task}
                    </p>
                    {item.completedBy && (
                      <p className="text-xs text-teal-400 mt-0.5">
                        ✓ {item.completedBy}
                      </p>
                    )}
                  </div>
                  {!item.isFixed && (
                    <span className="text-xs text-gray-300">extra</span>
                  )}
                </button>
              ))}
            </div>

            {/* Add Extra Task */}
            {(isGM || isAGM) && (
              <div className="mt-4">
                {showAddTask ? (
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Add extra task..."
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addExtraTask()}
                      autoFocus
                    />
                    <button onClick={addExtraTask} className="btn-primary px-4">
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddTask(false)}
                      className="btn-secondary px-4"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="flex items-center gap-2 text-teal-400 hover:text-teal-500 text-sm font-semibold mt-2"
                  >
                    <Plus size={16} /> Add Extra Task
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="card text-center fade-in">
            <p className="text-gray-400 mb-4">
              No {activeTab} checklist started for today.
            </p>
            <button onClick={createChecklist} className="btn-primary">
              Start {activeTab === "opening" ? "☀️ Opening" : "🌙 Closing"} Checklist
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getFixedTasks(type: "opening" | "closing"): ChecklistItem[] {
  const opening = [
    "Check all doors and windows are secure",
    "Turn on all lights and equipment",
    "Check POS system is working",
    "Count and verify opening cash bank",
    "Check bar inventory levels",
    "Verify reservation list for the day",
    "Check cleanliness of all areas",
    "Brief staff on daily specials",
    "Check temperature of all fridges",
    "Verify all staff arrived on time",
  ];

  const closing = [
    "Count and record closing cash",
    "Reconcile all payment methods",
    "Secure all alcohol and inventory",
    "Clean and sanitize all surfaces",
    "Turn off all equipment and lights",
    "Lock all doors and windows",
    "Complete end of day report",
    "Check all fridges are at correct temp",
    "Take out trash and recycling",
    "Set alarm before leaving",
  ];

  const tasks = type === "opening" ? opening : closing;
  return tasks.map((task, i) => ({
    id: `fixed_${i}`,
    task,
    completed: false,
    isFixed: true,
    type,
  }));
}
