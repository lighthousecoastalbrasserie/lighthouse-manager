"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import {
  CheckSquare,
  DollarSign,
  CreditCard,
  TrendingUp,
  Users,
  AlertTriangle,
  Truck,
  FileText,
  LogOut,
  Bell,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { signOut } from "@/lib/auth";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface DashboardStats {
  cashInHand: number;
  pendingCashRequests: number;
  overduePayments: number;
  openIncidents: number;
  openMaintenance: number;
  checklistsCompleted: number;
  checklistsTotal: number;
  employeesOnDisciplinary: number;
}

export default function DashboardPage() {
  const { profile, loading, isGM, isAGM } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    cashInHand: 0,
    pendingCashRequests: 0,
    overduePayments: 0,
    openIncidents: 0,
    openMaintenance: 0,
    checklistsCompleted: 0,
    checklistsTotal: 0,
    employeesOnDisciplinary: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile && isGM) {
      fetchStats();
    } else {
      setStatsLoading(false);
    }
  }, [profile, isGM]);

  const fetchStats = async () => {
    try {
      // Cash in hand
      const cashSnap = await getDocs(collection(db, "cash_summary"));
      let cashInHand = 0;
      cashSnap.forEach((doc) => {
        cashInHand = doc.data().balance || 0;
      });

      // Pending cash requests
      const cashReqSnap = await getDocs(
        query(collection(db, "cash_requests"), where("status", "==", "pending"))
      );

      // Overdue payments
      const today = new Date();
      const paymentsSnap = await getDocs(
        query(collection(db, "payments"), where("status", "==", "pending"))
      );
      let overdueCount = 0;
      paymentsSnap.forEach((doc) => {
        const dueDate = doc.data().dueDate?.toDate();
        if (dueDate && dueDate < today) overdueCount++;
      });

      // Open incidents
      const incidentsSnap = await getDocs(
        query(collection(db, "incidents"), where("status", "==", "open"))
      );

      // Open maintenance
      const maintenanceSnap = await getDocs(
        query(collection(db, "maintenance"), where("status", "==", "open"))
      );

      // Employees on disciplinary
      const disciplinarySnap = await getDocs(
        query(
          collection(db, "employees"),
          where("disciplinaryStep", "!=", "none")
        )
      );

      // Today's checklists
      const todayStr = format(today, "yyyy-MM-dd");
      const checklistSnap = await getDocs(
        query(
          collection(db, "checklists"),
          where("date", "==", todayStr)
        )
      );
      let completed = 0;
      checklistSnap.forEach((doc) => {
        if (doc.data().completed) completed++;
      });

      setStats({
        cashInHand,
        pendingCashRequests: cashReqSnap.size,
        overduePayments: overdueCount,
        openIncidents: incidentsSnap.size,
        openMaintenance: maintenanceSnap.size,
        checklistsCompleted: completed,
        checklistsTotal: checklistSnap.size,
        employeesOnDisciplinary: disciplinarySnap.size,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/");
  };

  const modules = [
    {
      title: "Checklists",
      description: "Opening & Closing",
      icon: CheckSquare,
      href: "/checklists",
      color: "teal",
      access: true,
    },
    {
      title: "Cash Requests",
      description: "Request & Usage Log",
      icon: DollarSign,
      href: "/cash-requests",
      color: "coral",
      access: true,
    },
    {
      title: "Monthly Payments",
      description: "Fixed & Variable",
      icon: CreditCard,
      href: "/payments",
      color: "teal",
      access: isGM,
    },
    {
      title: "Cash Income",
      description: "Daily Income & Deposits",
      icon: TrendingUp,
      href: "/cash-income",
      color: "coral",
      access: isGM || isAGM,
    },
    {
      title: "Shift Log",
      description: "Manager Notes",
      icon: FileText,
      href: "/shift-log",
      color: "teal",
      access: true,
    },
    {
      title: "Incidents",
      description: "Incident Reports",
      icon: Bell,
      href: "/incidents",
      color: "coral",
      access: true,
    },
    {
      title: "Waste & Comps",
      description: "Comp & Waste Log",
      icon: ClipboardList,
      href: "/waste-comps",
      color: "teal",
      access: true,
    },
    {
      title: "Maintenance",
      description: "Equipment & Repairs",
      icon: Wrench,
      href: "/maintenance",
      color: "coral",
      access: true,
    },
    {
      title: "Sales Goals",
      description: "Weekly & Monthly Targets",
      icon: TrendingUp,
      href: "/sales-goals",
      color: "teal",
      access: true,
    },
    {
      title: "Employees",
      description: "HR & Documents",
      icon: Users,
      href: "/employees",
      color: "coral",
      access: isGM || isAGM,
    },
    {
      title: "Disciplinary",
      description: "Warnings & Lateness",
      icon: AlertTriangle,
      href: "/disciplinary",
      color: "teal",
      access: isGM || isAGM,
    },
    {
      title: "Purveyors",
      description: "Vendor & Supplier List",
      icon: Truck,
      href: "/purveyors",
      color: "coral",
      access: isGM || isAGM,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg">
        <div className="text-teal-400 text-lg font-semibold animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-bg">
      {/* Header */}
      <header className="bg-white shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Lighthouse"
            width={160}
            height={50}
            className="object-contain"
          />
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-navy-700">
                {profile?.name}
              </p>
              <p className="text-xs text-teal-400 capitalize">
                {profile?.role?.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl hover:bg-coral-50 text-coral-400 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="page-container">
        {/* Welcome */}
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-bold text-navy-700">
            Good {getTimeOfDay()},{" "}
            <span className="text-teal-400">{profile?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-gray-400 mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* GM Stats Bar */}
        {isGM && !statsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 fade-in">
            <StatCard
              label="Cash In Hand"
              value={`$${stats.cashInHand.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              color="teal"
              urgent={false}
            />
            <StatCard
              label="Pending Requests"
              value={stats.pendingCashRequests.toString()}
              color={stats.pendingCashRequests > 0 ? "coral" : "teal"}
              urgent={stats.pendingCashRequests > 0}
            />
            <StatCard
              label="Overdue Payments"
              value={stats.overduePayments.toString()}
              color={stats.overduePayments > 0 ? "coral" : "teal"}
              urgent={stats.overduePayments > 0}
            />
            <StatCard
              label="Open Incidents"
              value={stats.openIncidents.toString()}
              color={stats.openIncidents > 0 ? "coral" : "teal"}
              urgent={stats.openIncidents > 0}
            />
          </div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 fade-in">
          {modules
            .filter((m) => m.access)
            .map((module) => (
              <Link key={module.href} href={module.href}>
                <div className="card card-hover cursor-pointer group h-full">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-200 group-hover:scale-110 ${
                      module.color === "teal"
                        ? "bg-teal-50 text-teal-400"
                        : "bg-coral-50 text-coral-400"
                    }`}
                  >
                    <module.icon size={24} />
                  </div>
                  <h3 className="font-bold text-navy-700 text-sm mb-1">
                    {module.title}
                  </h3>
                  <p className="text-gray-400 text-xs">{module.description}</p>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  urgent,
}: {
  label: string;
  value: string;
  color: string;
  urgent: boolean;
}) {
  return (
    <div
      className={`card ${urgent ? "border-2 border-coral-300 pulse-teal" : ""}`}
    >
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p
        className={`text-2xl font-bold ${
          color === "teal" ? "text-teal-400" : "text-coral-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
