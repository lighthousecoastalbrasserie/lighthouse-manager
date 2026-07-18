"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import {
  ArrowLeft,
  Plus,
  Users,
  Edit2,
  Trash2,
  Save,
  X,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Manager {
  id: string;
  name: string;
  role: "general_manager" | "agm" | "assistant_manager";
  pin: string;
  department?: string;
  active: boolean;
  createdAt: any;
}

const ROLES = [
  { value: "general_manager", label: "General Manager", color: "bg-teal-400" },
  { value: "agm", label: "AGM", color: "bg-coral-400" },
  { value: "assistant_manager", label: "Assistant Manager", color: "bg-navy-700" },
];

export default function AdminPage() {
  const { profile, loading, isGM } = useAuth();
  const router = useRouter();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState<{ [key: string]: boolean }>({});
  const [form, setForm] = useState({
    name: "",
    role: "assistant_manager" as Manager["role"],
    pin: "",
    department: "",
  });
  const [editForm, setEditForm] = useState<Partial<Manager>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !profile) router.push("/");
    if (!loading && !isGM) router.push("/dashboard");
  }, [loading, profile, isGM, router]);

  useEffect(() => {
    if (profile && isGM) fetchManagers();
  }, [profile]);

  const fetchManagers = async () => {
    setPageLoading(true);
    try {
      const q = query(
        collection(db, "managers"),
        orderBy("createdAt", "asc")
      );
      const snap = await getDocs(q);
      const data: Manager[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Manager));
      setManagers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitManager = async () => {
    if (!form.name.trim() || !form.pin || form.pin.length !== 4) {
      toast.error("Please enter a name and a 4-digit PIN");
      return;
    }

    // Check PIN is unique
    const pinExists = managers.some((m) => m.pin === form.pin);
    if (pinExists) {
      toast.error("This PIN is already in use. Please choose a different one.");
      return;
    }

    setSubmitting(true);
    try {
      // Create Firebase Auth user
      const email = `${form.pin}@lighthouse-manager.com`;
      const password = `lh_${form.pin}_secure`;
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Save manager profile to Firestore
      await addDoc(collection(db, "managers"), {
        uid: userCredential.user.uid,
        name: form.name.trim(),
        role: form.role,
        pin: form.pin,
        department: form.department.trim(),
        active: true,
        createdAt: serverTimestamp(),
      });

      toast.success(`Manager ${form.name} added with PIN ${form.pin}!`);
      setForm({ name: "", role: "assistant_manager", pin: "", department: "" });
      setShowForm(false);
      fetchManagers();
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        toast.error("This PIN is already registered. Choose a different PIN.");
      } else {
        toast.error("Error adding manager");
      }
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async (id: string) => {
    try {
      await updateDoc(doc(db, "managers", id), {
        name: editForm.name,
        role: editForm.role,
        department: editForm.department,
        active: editForm.active,
        updatedAt: serverTimestamp(),
      });
      toast.success("Manager updated!");
      setEditingId(null);
      fetchManagers();
    } catch (error) {
      toast.error("Error updating manager");
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "managers", id), { active: !current });
      toast.success(current ? "Manager deactivated" : "Manager activated");
      fetchManagers();
    } catch (error) {
      toast.error("Error updating manager");
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "general_manager") return "badge-green";
    if (role === "agm") return "badge-coral";
    return "bg-navy-50 text-navy-700 text-xs font-semibold px-3 py-1 rounded-full";
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find((r) => r.value === role)?.label || role;
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
            <Link
              href="/dashboard"
              className="p-2 hover:bg-teal-50 rounded-xl text-teal-400"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-navy-700">Manager Admin</h1>
              <p className="text-xs text-gray-400">PIN & Access Management</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={16} /> Add Manager
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Security Notice */}
        <div className="card mb-6 bg-teal-50 border-2 border-teal-200">
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-teal-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-teal-600 mb-1">
                Security Notice
              </p>
              <p className="text-xs text-teal-500">
                PINs are used for authentication. Each PIN must be unique and exactly 4 digits. Only share PINs directly with the manager they belong to.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-teal-400">
              {managers.filter((m) => m.active).length}
            </p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-coral-400">
              {managers.filter((m) => !m.active).length}
            </p>
            <p className="text-xs text-gray-400">Inactive</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-navy-700">
              {managers.length}
            </p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>

        {/* Add Manager Form */}
        {showForm && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Add New Manager</h2>
            <div className="space-y-4">
              <input
                className="input"
                placeholder="Full name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              {/* Role Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Role *
                </label>
                <div className="space-y-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() =>
                        setForm({ ...form, role: role.value as Manager["role"] })
                      }
                      className={`w-full py-3 px-4 rounded-xl text-sm font-semibold text-left transition-all ${
                        form.role === role.value
                          ? `${role.color} text-white`
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN Input */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  4-Digit PIN *
                </label>
                <input
                  type="number"
                  className="input text-2xl tracking-widest font-bold"
                  placeholder="0000"
                  maxLength={4}
                  value={form.pin}
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 4);
                    setForm({ ...form, pin: val });
                  }}
                />
              </div>

              <input
                className="input"
                placeholder="Department (optional)"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />

              <div className="flex gap-3">
                <button
                  onClick={submitManager}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Creating..." : "Add Manager"}
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

        {/* Managers List */}
        {managers.length === 0 ? (
          <div className="card text-center py-12">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No managers added yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Add yourself first as General Manager
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {managers.map((manager) => (
              <div
                key={manager.id}
                className={`card fade-in ${!manager.active ? "opacity-60" : ""}`}
              >
                {editingId === manager.id ? (
                  <div className="space-y-3">
                    <input
                      className="input"
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                    <select
                      className="input"
                      value={editForm.role || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          role: e.target.value as Manager["role"],
                        })
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      placeholder="Department"
                      value={editForm.department || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, department: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(manager.id)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                      >
                        <Save size={14} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-400 font-bold text-lg">
                        {manager.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-navy-700">{manager.name}</p>
                        <span className={getRoleBadge(manager.role)}>
                          {getRoleLabel(manager.role)}
                        </span>
                        {manager.department && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {manager.department}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400">
                            PIN:{" "}
                            <span className="font-bold text-navy-700 tracking-widest">
                              {showPins[manager.id] ? manager.pin : "••••"}
                            </span>
                          </p>
                          <button
                            onClick={() =>
                              setShowPins((prev) => ({
                                ...prev,
                                [manager.id]: !prev[manager.id],
                              }))
                            }
                            className="text-gray-400 hover:text-teal-400"
                          >
                            {showPins[manager.id] ? (
                              <EyeOff size={12} />
                            ) : (
                              <Eye size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(manager.id, manager.active)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                          manager.active
                            ? "bg-teal-50 text-teal-400 hover:bg-teal-100"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        {manager.active ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(manager.id);
                          setEditForm(manager);
                        }}
                        className="p-2 rounded-xl bg-teal-50 text-teal-400 hover:bg-teal-100"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
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
