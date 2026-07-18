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
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft,
  Plus,
  Truck,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Purveyor {
  id: string;
  name: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
  accountNumber: string;
  repName: string;
  deliveryDays: string[];
  deliveryNotes: string;
  notes: string;
  createdAt: any;
}

const CATEGORIES = [
  "Liquor", "Beer", "Wine", "Food", "Produce",
  "Dairy", "Linen", "Cleaning", "Paper Goods",
  "Equipment", "Other",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PurveyorsPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [purveyors, setPurveyors] = useState<Purveyor[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [form, setForm] = useState({
    name: "",
    category: "Liquor",
    contactName: "",
    phone: "",
    email: "",
    accountNumber: "",
    repName: "",
    deliveryDays: [] as string[],
    deliveryNotes: "",
    notes: "",
  });
  const [editForm, setEditForm] = useState<Partial<Purveyor>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !profile) router.push("/");
    if (!loading && !isGM && !isAGM) router.push("/dashboard");
  }, [loading, profile, isGM, isAGM, router]);

  useEffect(() => {
    if (profile && (isGM || isAGM)) fetchPurveyors();
  }, [profile]);

  const fetchPurveyors = async () => {
    setPageLoading(true);
    try {
      const q = query(
        collection(db, "purveyors"),
        orderBy("name", "asc")
      );
      const snap = await getDocs(q);
      const data: Purveyor[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Purveyor));
      setPurveyors(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitPurveyor = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error("Please fill in name and category");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "purveyors"), {
        ...form,
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        accountNumber: form.accountNumber.trim(),
        repName: form.repName.trim(),
        deliveryNotes: form.deliveryNotes.trim(),
        notes: form.notes.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Purveyor added!");
      setForm({
        name: "",
        category: "Liquor",
        contactName: "",
        phone: "",
        email: "",
        accountNumber: "",
        repName: "",
        deliveryDays: [],
        deliveryNotes: "",
        notes: "",
      });
      setShowForm(false);
      fetchPurveyors();
    } catch (error) {
      toast.error("Error adding purveyor");
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async (id: string) => {
    try {
      await updateDoc(doc(db, "purveyors", id), {
        ...editForm,
        updatedAt: serverTimestamp(),
      });
      toast.success("Purveyor updated!");
      setEditingId(null);
      fetchPurveyors();
    } catch (error) {
      toast.error("Error updating purveyor");
    }
  };

  const deletePurveyor = async (id: string) => {
    if (!confirm("Delete this purveyor?")) return;
    try {
      await deleteDoc(doc(db, "purveyors", id));
      toast.success("Purveyor deleted");
      fetchPurveyors();
    } catch (error) {
      toast.error("Error deleting purveyor");
    }
  };

  const toggleDeliveryDay = (day: string) => {
    const days = form.deliveryDays.includes(day)
      ? form.deliveryDays.filter((d) => d !== day)
      : [...form.deliveryDays, day];
    setForm({ ...form, deliveryDays: days });
  };

  const filtered = purveyors.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.repName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    return matchSearch && matchCat;
  });

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
            <h1 className="text-xl font-bold text-navy-700">Purveyors</h1>
          </div>
          {isGM && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
            >
              <Plus size={16} /> Add Purveyor
            </button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <input
            className="input flex-1"
            placeholder="Search by name, contact, or rep..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="input w-36"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Add Form */}
        {showForm && isGM && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">Add Purveyor</h2>
            <div className="space-y-4">
              <input
                className="input"
                placeholder="Company name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Contact name"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
              <input
                className="input"
                placeholder="Rep name"
                value={form.repName}
                onChange={(e) => setForm({ ...form, repName: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <input
                className="input"
                placeholder="Account number"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              />

              {/* Delivery Days */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Delivery Days
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDeliveryDay(day)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        form.deliveryDays.includes(day)
                          ? "bg-teal-400 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Delivery notes (time, instructions...)"
                value={form.deliveryNotes}
                onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
              />
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="General notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="flex gap-3">
                <button
                  onClick={submitPurveyor}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Add Purveyor"}
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

        {/* Purveyors List */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <Truck size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No purveyors found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((purveyor) => (
              <div key={purveyor.id} className="card fade-in">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === purveyor.id ? null : purveyor.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-400">
                      <Truck size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-navy-700">{purveyor.name}</p>
                      <p className="text-xs text-gray-400">{purveyor.category}</p>
                      {purveyor.deliveryDays?.length > 0 && (
                        <p className="text-xs text-teal-400">
                          🚚 {purveyor.deliveryDays.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGM && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(purveyor.id);
                            setEditForm(purveyor);
                            setExpandedId(purveyor.id);
                          }}
                          className="p-2 rounded-xl bg-teal-50 text-teal-400 hover:bg-teal-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePurveyor(purveyor.id);
                          }}
                          className="p-2 rounded-xl bg-coral-50 text-coral-400 hover:bg-coral-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {expandedId === purveyor.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedId === purveyor.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 fade-in">
                    {editingId === purveyor.id && isGM ? (
                      <div className="space-y-3">
                        <input
                          className="input"
                          placeholder="Contact name"
                          value={editForm.contactName || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, contactName: e.target.value })
                          }
                        />
                        <input
                          className="input"
                          placeholder="Rep name"
                          value={editForm.repName || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, repName: e.target.value })
                          }
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            className="input"
                            placeholder="Phone"
                            value={editForm.phone || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, phone: e.target.value })
                            }
                          />
                          <input
                            className="input"
                            placeholder="Email"
                            value={editForm.email || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, email: e.target.value })
                            }
                          />
                        </div>
                        <input
                          className="input"
                          placeholder="Account number"
                          value={editForm.accountNumber || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, accountNumber: e.target.value })
                          }
                        />
                        <textarea
                          className="input resize-none"
                          rows={2}
                          placeholder="Notes"
                          value={editForm.notes || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, notes: e.target.value })
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(purveyor.id)}
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
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {purveyor.contactName && (
                            <InfoRow label="Contact" value={purveyor.contactName} />
                          )}
                          {purveyor.repName && (
                            <InfoRow label="Rep" value={purveyor.repName} />
                          )}
                          {purveyor.accountNumber && (
                            <InfoRow label="Account #" value={purveyor.accountNumber} />
                          )}
                        </div>
                        <div className="flex gap-3">
                          {purveyor.phone && (
                            <a
                              href={`tel:${purveyor.phone}`}
                              className="flex items-center gap-2 bg-teal-50 text-teal-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-100 transition-colors"
                            >
                              <Phone size={14} /> {purveyor.phone}
                            </a>
                          )}
                          {purveyor.email && (
                            <a
                              href={`mailto:${purveyor.email}`}
                              className="flex items-center gap-2 bg-coral-50 text-coral-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-coral-100 transition-colors"
                            >
                              <Mail size={14} /> Email
                            </a>
                          )}
                        </div>
                        {purveyor.deliveryNotes && (
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="text-xs font-semibold text-gray-400 mb-1">
                              🚚 Delivery Notes
                            </p>
                            <p className="text-sm text-navy-700">{purveyor.deliveryNotes}</p>
                          </div>
                        )}
                        {purveyor.notes && (
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="text-xs font-semibold text-gray-400 mb-1">
                              📝 Notes
                            </p>
                            <p className="text-sm text-navy-700">{purveyor.notes}</p>
                          </div>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-3 rounded-xl">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-navy-700">{value}</p>
    </div>
  );
}
