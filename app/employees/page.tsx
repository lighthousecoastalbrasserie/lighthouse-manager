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
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  ArrowLeft,
  Plus,
  Users,
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  fullName: string;
  address: string;
  dob: string;
  hiredDate: string;
  position: string;
  department: string;
  employmentType: string;
  phone: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  status: "active" | "inactive" | "terminated";
  disciplinaryStep: "none" | "written" | "yellow" | "red" | "terminated";
  lateCount: number;
  documents: {
    w4: string;
    l4: string;
    i9: string;
    id: string;
    atcBarCard: string;
    others: string[];
  };
  createdAt: any;
}

const DEPARTMENTS = ["Bar", "FOH", "BOH", "Security", "Management"];
const POSITIONS = [
  "Bartender", "Barback", "Server", "Host/Hostess",
  "Cook", "Dishwasher", "Security Guard", "Manager",
  "Assistant Manager", "General Manager", "Busser", "Runner",
];

export default function EmployeesPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [form, setForm] = useState({
    fullName: "",
    address: "",
    dob: "",
    hiredDate: "",
    position: "",
    department: "Bar",
    employmentType: "full-time",
    phone: "",
    email: "",
    emergencyContact: "",
    emergencyPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !profile) router.push("/");
    if (!loading && !isGM && !isAGM) router.push("/dashboard");
  }, [loading, profile, isGM, isAGM, router]);

  useEffect(() => {
    if (profile && (isGM || isAGM)) fetchEmployees();
  }, [profile]);

  const fetchEmployees = async () => {
    setPageLoading(true);
    try {
      const q = query(
        collection(db, "employees"),
        orderBy("fullName", "asc")
      );
      const snap = await getDocs(q);
      const data: Employee[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Employee));
      setEmployees(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const submitEmployee = async () => {
    if (!form.fullName.trim() || !form.position || !form.department || !form.hiredDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "employees"), {
        ...form,
        fullName: form.fullName.trim(),
        status: "active",
        disciplinaryStep: "none",
        lateCount: 0,
        documents: {
          w4: "",
          l4: "",
          i9: "",
          id: "",
          atcBarCard: "",
          others: [],
        },
        createdAt: serverTimestamp(),
      });
      toast.success("Employee added!");
      setForm({
        fullName: "",
        address: "",
        dob: "",
        hiredDate: "",
        position: "",
        department: "Bar",
        employmentType: "full-time",
        phone: "",
        email: "",
        emergencyContact: "",
        emergencyPhone: "",
      });
      setShowForm(false);
      fetchEmployees();
    } catch (error) {
      toast.error("Error adding employee");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadDocument = async (
    employeeId: string,
    docType: string,
    file: File
  ) => {
    setUploadingDoc(docType);
    try {
      const storageRef = ref(
        storage,
        `employees/${employeeId}/${docType}_${Date.now()}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const employee = employees.find((e) => e.id === employeeId);
      if (!employee) return;

      await updateDoc(doc(db, "employees", employeeId), {
        [`documents.${docType}`]: url,
      });
      toast.success(`${docType.toUpperCase()} uploaded!`);
      fetchEmployees();
    } catch (error) {
      toast.error("Error uploading document");
    } finally {
      setUploadingDoc(null);
    }
  };

  const getDisciplinaryColor = (step: string) => {
    if (step === "none") return "badge-green";
    if (step === "written") return "bg-blue-50 text-blue-500 text-xs font-semibold px-3 py-1 rounded-full";
    if (step === "yellow") return "badge-yellow";
    if (step === "red") return "badge-red";
    return "bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full";
  };

  const filtered = employees.filter((e) => {
    const matchSearch = e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === "all" || e.department === filterDept;
    return matchSearch && matchDept;
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
            <h1 className="text-xl font-bold text-navy-700">Employees</h1>
          </div>
          {isGM && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
            >
              <Plus size={16} /> Add Employee
            </button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <input
            className="input flex-1"
            placeholder="Search by name or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="input w-36"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="all">All Depts</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-teal-400">
              {employees.filter((e) => e.status === "active").length}
            </p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {employees.filter((e) => e.disciplinaryStep !== "none").length}
            </p>
            <p className="text-xs text-gray-400">On Warning</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-coral-400">
              {employees.filter((e) => e.status === "terminated").length}
            </p>
            <p className="text-xs text-gray-400">Terminated</p>
          </div>
        </div>

        {/* Add Employee Form */}
        {showForm && isGM && (
          <div className="card mb-6 fade-in">
            <h2 className="font-bold text-navy-700 mb-4">New Employee</h2>
            <div className="space-y-4">
              <input
                className="input"
                placeholder="Full name *"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              <input
                className="input"
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Date of Birth</label>
                  <input
                    type="date"
                    className="input"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Hired Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.hiredDate}
                    onChange={(e) => setForm({ ...form, hiredDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="input"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  className="input"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                >
                  <option value="">Select position *</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                {["full-time", "part-time", "seasonal"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setForm({ ...form, employmentType: type })}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                      form.employmentType === type
                        ? "bg-teal-400 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <input
                className="input"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                className="input"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="input"
                placeholder="Emergency contact name"
                value={form.emergencyContact}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
              />
              <input
                className="input"
                placeholder="Emergency contact phone"
                value={form.emergencyPhone}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
              />
              <div className="flex gap-3">
                <button
                  onClick={submitEmployee}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "Saving..." : "Add Employee"}
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

        {/* Employee List */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No employees found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((employee) => (
              <div key={employee.id} className="card fade-in">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === employee.id ? null : employee.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-400 font-bold text-lg">
                      {employee.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-navy-700">{employee.fullName}</p>
                      <p className="text-xs text-gray-400">
                        {employee.position} · {employee.department}
                      </p>
                      <p className="text-xs text-gray-400">
                        Hired: {employee.hiredDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getDisciplinaryColor(employee.disciplinaryStep)}>
                      {employee.disciplinaryStep === "none" ? "Good" : employee.disciplinaryStep}
                    </span>
                    {expandedId === employee.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedId === employee.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 fade-in space-y-4">
                    {/* Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <InfoItem label="Phone" value={employee.phone} />
                      <InfoItem label="Email" value={employee.email} />
                      <InfoItem label="DOB" value={employee.dob} />
                      <InfoItem label="Type" value={employee.employmentType} />
                      <InfoItem label="Emergency" value={employee.emergencyContact} />
                      <InfoItem label="Emergency Phone" value={employee.emergencyPhone} />
                    </div>
                    {employee.address && (
                      <InfoItem label="Address" value={employee.address} />
                    )}

                    {/* Late Count */}
                    <div className="bg-yellow-50 p-3 rounded-xl flex items-center justify-between">
                      <p className="text-sm font-semibold text-yellow-600">
                        ⏰ Late Count
                      </p>
                      <span className="text-xl font-bold text-yellow-500">
                        {employee.lateCount}/3
                      </span>
                    </div>

                    {/* Documents */}
                    <div>
                      <p className="text-sm font-bold text-navy-700 mb-3">📄 Documents</p>
                      <div className="grid grid-cols-2 gap-2">
                        {["w4", "l4", "i9", "id", "atcBarCard"].map((docType) => (
                          <DocumentRow
                            key={docType}
                            label={docType.toUpperCase().replace("ATCBARCARD", "ATC Bar Card")}
                            url={employee.documents?.[docType as keyof typeof employee.documents] as string}
                            onUpload={(file) => uploadDocument(employee.id, docType, file)}
                            uploading={uploadingDoc === docType}
                            canEdit={isGM}
                          />
                        ))}
                      </div>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-3 rounded-xl">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-navy-700">{value || "—"}</p>
    </div>
  );
}

function DocumentRow({
  label,
  url,
  onUpload,
  uploading,
  canEdit,
}: {
  label: string;
  url: string;
  onUpload: (file: File) => void;
  uploading: boolean;
  canEdit: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2">
        {url ? (
          <Check size={14} className="text-teal-400" />
        ) : (
          <X size={14} className="text-gray-300" />
        )}
        <span className="text-xs font-semibold text-navy-700">{label}</span>
      </div>
      <div className="flex gap-1">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg bg-teal-50 text-teal-400 hover:bg-teal-100"
          >
            <FileText size={14} />
          </a>
        )}
        {canEdit && (
          <label className="p-1 rounded-lg bg-coral-50 text-coral-400 hover:bg-coral-100 cursor-pointer">
            <Upload size={14} />
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
