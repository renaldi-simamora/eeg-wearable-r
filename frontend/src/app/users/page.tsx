"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { userService } from "@/services/user.service";
import { User, UserRole, UserStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  KeyRound,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  Briefcase,
  Clock,
  Sparkles,
  Info,
  X,
} from "lucide-react";

export default function UserManagementPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const isAuthorized = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  // State: Data
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State: Filters, Search, Sorting, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [sortField, setSortField] = useState<"name" | "username" | "division" | "status" | "createdAt" | "lastLogin">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // State: Reset Password Form
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // State: Confirmation Modal for Status Toggle
  const [statusModalUser, setStatusModalUser] = useState<User | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // State: Notifications (Toasts / In-Card Feedback)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const resetFormRef = useRef<HTMLDivElement>(null);

  // Fetch Users
  const loadUsers = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error("[UserManagement] Error loading users:", err);
      setFeedback({
        type: "error",
        message: err.message || "Gagal memuat daftar pengguna sistem.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!currentUser) {
        router.push("/login?redirect=/users");
      } else if (isAuthorized) {
        loadUsers();
      } else {
        setIsLoading(false);
      }
    }
  }, [isAuthLoading, currentUser, isAuthorized]);

  // Dismiss feedback automatically after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Unique divisions for filter dropdown
  const divisions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.division && u.division.trim().length > 0) {
        set.add(u.division.trim());
      }
    });
    return Array.from(set).sort();
  }, [users]);

  // Statistics
  const totalUsers = users.length;
  const activeUsers = useMemo(() => users.filter((u) => (u.status || "active") === "active").length, [users]);
  const inactiveUsers = totalUsers - activeUsers;

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === "" ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.position && u.position.toLowerCase().includes(q));

      // 2. Division Filter
      const matchDivision =
        selectedDivision === "ALL" ||
        (u.division && u.division.trim().toLowerCase() === selectedDivision.trim().toLowerCase());

      // 3. Status Filter
      const userStatus = (u.status || "active").toLowerCase();
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && userStatus === "active") ||
        (statusFilter === "INACTIVE" && userStatus === "inactive");

      return matchSearch && matchDivision && matchStatus;
    }).sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";

      if (sortField === "lastLogin") {
        const aTime = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
        const bTime = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }

      if (sortField === "createdAt") {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [users, searchQuery, selectedDivision, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Handle Sort Toggle
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Quick Select User for Password Reset
  const handleSelectUserForReset = (targetUser: User) => {
    setTargetUserId(targetUser.id);
    setNewPassword("");
    setConfirmPassword("");
    if (resetFormRef.current) {
      resetFormRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Process Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      setFeedback({ type: "error", message: "Silakan pilih akun pengguna target terlebih dahulu." });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ type: "error", message: "Kata sandi baru minimal harus 8 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "Konfirmasi kata sandi tidak cocok dengan kata sandi baru." });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await userService.resetPassword(targetUserId, {
        newPassword,
        confirmPassword,
      });
      const selectedUserObj = users.find((u) => u.id === targetUserId);
      setFeedback({
        type: "success",
        message: res.message || `Kata sandi untuk pengguna ${selectedUserObj?.name || "terpilih"} berhasil direset.`,
      });
      setNewPassword("");
      setConfirmPassword("");
      setTargetUserId("");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Gagal mereset kata sandi pengguna.",
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Open Status Confirmation Modal
  const promptStatusChange = (targetUser: User) => {
    // Protection: Prevent self-deactivation
    if (currentUser && targetUser.id === currentUser.id && (targetUser.status || "active") === "active") {
      setFeedback({
        type: "error",
        message: "Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif digunakan.",
      });
      return;
    }

    // Protection: Prevent superadmin & virza admin deactivation
    if (
      (targetUser.email.toLowerCase() === "admin@gmail.com" ||
        targetUser.email.toLowerCase() === "virzasiutaa@gmail.com" ||
        targetUser.role === "superadmin") &&
      (targetUser.status || "active") === "active"
    ) {
      setFeedback({
        type: "error",
        message: `Akun Administrator (${targetUser.email}) memiliki proteksi sistem dan tidak dapat dinonaktifkan.`,
      });
      return;
    }

    setStatusModalUser(targetUser);
  };

  // Execute Status Change
  const confirmStatusChange = async () => {
    if (!statusModalUser) return;
    const newStatus: UserStatus = (statusModalUser.status || "active") === "active" ? "inactive" : "active";

    setIsUpdatingStatus(true);
    try {
      const updatedUser = await userService.updateUserStatus(statusModalUser.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === statusModalUser.id ? { ...u, status: newStatus } : u))
      );
      setFeedback({
        type: "success",
        message: `Status akun ${statusModalUser.name} berhasil diubah menjadi ${
          newStatus === "active" ? "Aktif" : "Non-Aktif"
        }.`,
      });
      setStatusModalUser(null);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Gagal mengubah status aktivasi akun.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Helper: Role badge styling
  const getRoleBadge = (role: string) => {
    const r = (role || "").toLowerCase();
    switch (r) {
      case "superadmin":
        return <Badge variant="danger" size="sm" className="font-mono text-[10px] tracking-wide uppercase">Superadmin</Badge>;
      case "admin":
        return <Badge variant="warning" size="sm" className="font-mono text-[10px] tracking-wide uppercase bg-emerald-100 text-emerald-800 border-emerald-300">Admin</Badge>;
      case "head":
        return <Badge variant="warning" size="sm" className="font-mono text-[10px] tracking-wide uppercase">Head</Badge>;
      case "engineer":
        return <Badge variant="info" size="sm" className="font-mono text-[10px] tracking-wide uppercase">Engineer</Badge>;
      case "researcher":
        return <Badge variant="default" size="sm" className="font-mono text-[10px] tracking-wide uppercase">Researcher</Badge>;
      default:
        return <Badge variant="neutral" size="sm" className="font-mono text-[10px] tracking-wide uppercase">Staff</Badge>;
    }
  };

  // Helper: User avatar initials
  const getInitials = (name?: string, username?: string) => {
    const base = (name || username || "U").trim();
    const parts = base.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return base.slice(0, 2).toUpperCase();
  };

  // Auth Loading State
  if (isAuthLoading) {
    return (
      <AppShell title="User Management" subtitle="Memeriksa otorisasi akun...">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <RefreshCw className="w-8 h-8 text-[#5F6E52] animate-spin" />
          <p className="text-xs font-mono text-stone-500">Memverifikasi hak akses pengguna...</p>
        </div>
      </AppShell>
    );
  }

  // Access Restriction Gate: Only admin & superadmin are authorized
  if (!isAuthorized) {
    return (
      <AppShell
        title="User Management"
        subtitle="Akses Dibatasi — Hak Akses Khusus Administrator"
      >
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-8 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Akses Ditolak: Hak Akses Administrator Diperlukan
            </h2>
            <p className="text-sm text-stone-600 mb-6 leading-relaxed">
              Halaman <strong>User Management</strong> hanya dapat diakses oleh akun Administrator (<strong>virzasiutaa@gmail.com</strong>) dan Superadmin (<strong>admin@gmail.com</strong>).
              <br />
              Akun Anda saat ini (<strong>{currentUser?.email || "Tidak Diketahui"}</strong>) terdaftar dengan peran <Badge variant="neutral" className="ml-1 capitalize font-mono text-xs">{currentUser?.role || "researcher"}</Badge>.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-mono mb-8">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Policy: Restricted to Role [Admin, Superadmin]</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5F6E52] text-white text-sm font-semibold hover:bg-[#4E5B43] transition-colors shadow-xs"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="User Management"
      subtitle="Kelola status aktivasi akun dan kata sandi seluruh pengguna di semua divisi sistem."
      action={
        <button
          type="button"
          onClick={() => {
            setIsRefreshing(true);
            loadUsers(false);
          }}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-mono font-medium text-stone-700 hover:bg-stone-50 shadow-2xs cursor-pointer transition-colors"
          title="Segarkan Data Pengguna"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#5B6D49] ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Menyegarkan..." : "Segarkan"}</span>
        </button>
      }
    >
      <div className="space-y-6 pb-12">
        {/* Top Badges Bar (Matching Screenshot Reference Identity) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="danger" size="md" className="gap-1.5 shadow-2xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Superadmin (Semua Divisi)</span>
          </Badge>
          <Badge variant="neutral" size="md" className="gap-1.5 shadow-2xs font-mono text-stone-600">
            <Users className="w-3.5 h-3.5 text-[#5B6D49]" />
            <span>User Management Workstation</span>
          </Badge>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-in fade-in duration-200 shadow-xs ${
              feedback.type === "success"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                : feedback.type === "error"
                ? "bg-rose-50/90 border-rose-200 text-rose-900"
                : "bg-sky-50/90 border-sky-200 text-sky-900"
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : feedback.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* A. DASHBOARD STATISTIK PENGGUNA (3 Summary Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Users */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-[#5B6D49]/30">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold block">
                Total Akun Terdaftar
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-[#1C1E1A] tracking-tight">
                  {isLoading ? "..." : totalUsers}
                </span>
                <span className="text-xs text-stone-400 font-mono">pengguna</span>
              </div>
              <span className="text-[11px] text-stone-500 block">Seluruh divisi & departemen</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-2xs">
              <Users className="w-6 h-6 stroke-[2]" />
            </div>
          </div>

          {/* Card 2: Active Users */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-emerald-500/30">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold block">
                Akun Aktif
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-emerald-800 tracking-tight">
                  {isLoading ? "..." : activeUsers}
                </span>
                <span className="text-xs text-emerald-600/80 font-mono">
                  ({totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%)
                </span>
              </div>
              <span className="text-[11px] text-stone-500 block">Akses penuh ke sistem platform</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <CheckCircle2 className="w-6 h-6 stroke-[2]" />
            </div>
          </div>

          {/* Card 3: Inactive Users */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-rose-500/30">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-700 font-semibold block">
                Akun Non-Aktif
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-rose-800 tracking-tight">
                  {isLoading ? "..." : inactiveUsers}
                </span>
                <span className="text-xs text-rose-600/80 font-mono">ditangguhkan</span>
              </div>
              <span className="text-[11px] text-stone-500 block">Tidak dapat login ke dalam sistem</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
              <UserX className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* MAIN TWO-COLUMN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================================== */}
          {/* LEFT COLUMN: Reset Password Card & Panduan Card (5 cols)     */}
          {/* ============================================================== */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card: Reset Password Pengguna */}
            <div
              ref={resetFormRef}
              className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1E1A] tracking-tight">
                    Reset Password Pengguna
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Pilih pengguna dan tentukan kata sandi baru (Administrator)
                  </p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                {/* Target Pengguna */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                    <span>Target Pengguna <span className="text-rose-500">*</span></span>
                    {targetUserId && (
                      <button
                        type="button"
                        onClick={() => setTargetUserId("")}
                        className="text-[10px] text-stone-400 hover:text-stone-700 underline"
                      >
                        Batal Pilih
                      </button>
                    )}
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-xs text-[#1C1E1A] bg-stone-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B6D49]/40 transition-all font-sans cursor-pointer"
                  >
                    <option value="">-- Pilih Pengguna --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (@{u.username || u.email.split("@")[0]}) — {u.division || "Umum"}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-stone-500 flex items-center gap-1 pt-0.5">
                    <Sparkles className="w-3 h-3 text-[#5B6D49]" />
                    <span>Klik icon kunci pada baris tabel pengguna untuk memilih cepat.</span>
                  </p>
                </div>

                {/* Password Baru */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 block">
                    Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Minimal 8 karakter"
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-stone-200 text-xs text-[#1C1E1A] bg-stone-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B6D49]/40 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Password Baru */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 block">
                    Konfirmasi Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Ketik ulang password baru"
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-stone-200 text-xs text-[#1C1E1A] bg-stone-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B6D49]/40 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Password validation indicators */}
                  {newPassword.length > 0 && (
                    <div className="pt-1 space-y-0.5 text-[10px] font-mono">
                      <div className={`flex items-center gap-1 ${newPassword.length >= 8 ? "text-emerald-600" : "text-amber-600"}`}>
                        <span>{newPassword.length >= 8 ? "✓" : "○"} Minimal 8 karakter</span>
                      </div>
                      {confirmPassword.length > 0 && (
                        <div className={`flex items-center gap-1 ${newPassword === confirmPassword ? "text-emerald-600" : "text-rose-600"}`}>
                          <span>{newPassword === confirmPassword ? "✓ Kata sandi cocok" : "✕ Kata sandi tidak cocok"}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Reset Button (Matching red button in screenshot reference) */}
                <button
                  type="submit"
                  disabled={isSubmittingPassword || !targetUserId || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C84B4B] hover:bg-[#B33E3E] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white text-xs font-semibold font-sans transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <KeyRound className={`w-3.5 h-3.5 ${isSubmittingPassword ? "animate-spin" : ""}`} />
                  <span>{isSubmittingPassword ? "Memproses Reset..." : "Reset Password Pengguna"}</span>
                </button>
              </form>
            </div>

            {/* Card: Panduan Pengelolaan Akun (Matching Screenshot) */}
            <div className="bg-[#FAFBF8] rounded-2xl border border-stone-200/80 p-5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.02)] space-y-3">
              <div className="flex items-center gap-2 text-[#5B6D49]">
                <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                <span className="text-xs font-bold font-sans tracking-tight text-stone-800">
                  Panduan Pengelolaan Akun
                </span>
              </div>
              <ul className="space-y-2 text-[11px] text-stone-600 leading-relaxed pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] mt-1.5 shrink-0" />
                  <span>
                    Akun baru yang mendaftar secara otomatis berstatus <strong>Non-Aktif</strong> sampai disetujui administrator.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] mt-1.5 shrink-0" />
                  <span>
                    Gunakan tombol <strong>Aktifkan / Nonaktifkan</strong> pada tabel untuk mengontrol hak akses staf dan peneliti.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] mt-1.5 shrink-0" />
                  <span>
                    Pengguna dengan status <strong>Non-Aktif</strong> tidak akan dapat melakukan login ke dalam sistem platform.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] mt-1.5 shrink-0" />
                  <span>
                    Sebagai <strong>Superadmin</strong>, Anda dapat mengelola akun dan mereset kata sandi di seluruh divisi riset.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] mt-1.5 shrink-0" />
                  <span>
                    Akun yang sedang aktif digunakan dan akun Superadmin dilindungi dengan proteksi anti-deaktivasi.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: Daftar Pengguna Data Table (8 cols)              */}
          {/* ============================================================== */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Table Header Controls */}
            <div className="p-5 border-b border-stone-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-2xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1C1E1A] tracking-tight">
                      Daftar Pengguna
                    </h2>
                    <p className="text-[11px] text-stone-500 font-mono">
                      Menampilkan {filteredUsers.length} pengguna dari {selectedDivision === "ALL" ? "seluruh divisi" : `divisi ${selectedDivision}`}
                    </p>
                  </div>
                </div>

                {/* Division Filter Dropdown (Matching Screenshot Top Right) */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDivision}
                    onChange={(e) => {
                      setSelectedDivision(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-700 bg-stone-50 hover:bg-stone-100/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B6D49]/40 cursor-pointer font-sans"
                  >
                    <option value="ALL">Semua Divisi</option>
                    {divisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Bar & Status Tabs Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Search Input */}
                <div className="relative flex-1 max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari user / nama / jabatan..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-stone-200 text-xs text-[#1C1E1A] bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B6D49]/40 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs (Semua / Aktif / Non-Aktif) */}
                <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200/80 text-xs self-start sm:self-auto font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                      statusFilter === "ALL"
                        ? "bg-white text-stone-900 shadow-2xs font-semibold"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Semua ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("ACTIVE");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                      statusFilter === "ACTIVE"
                        ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Aktif ({activeUsers})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("INACTIVE");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                      statusFilter === "INACTIVE"
                        ? "bg-rose-600 text-white shadow-2xs font-semibold"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Non-Aktif ({inactiveUsers})
                  </button>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[10px] font-mono uppercase tracking-wider text-stone-500">
                    <th
                      className="py-3 px-4 font-semibold cursor-pointer select-none hover:text-stone-900"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>PENGGUNA</span>
                        <ArrowUpDown className="w-3 h-3 text-stone-400" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-semibold cursor-pointer select-none hover:text-stone-900"
                      onClick={() => handleSort("division")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>DIVISI / JABATAN</span>
                        <ArrowUpDown className="w-3 h-3 text-stone-400" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-semibold cursor-pointer select-none hover:text-stone-900"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>STATUS</span>
                        <ArrowUpDown className="w-3 h-3 text-stone-400" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-semibold cursor-pointer select-none hover:text-stone-900"
                      onClick={() => handleSort("lastLogin")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>LOGIN TERAKHIR</span>
                        <ArrowUpDown className="w-3 h-3 text-stone-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      <span>AKSI</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-400 font-mono">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-[#5B6D49]" />
                          <span>Memuat data pengguna sistem...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-400 font-mono">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="w-6 h-6 text-stone-300" />
                          <span>Tidak ada pengguna yang sesuai dengan filter atau pencarian.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((item) => {
                      const isSelf = currentUser?.id === item.id;
                      const isAdminProtected =
                        item.email.toLowerCase() === "admin@gmail.com" ||
                        item.email.toLowerCase() === "virzasiutaa@gmail.com" ||
                        item.role === "superadmin";
                      const isActive = (item.status || "active") === "active";

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-stone-50/70 transition-colors ${
                            targetUserId === item.id ? "bg-[#EDF1E7]/40 ring-1 ring-[#5B6D49]/30" : ""
                          }`}
                        >
                          {/* Column 1: Pengguna (Avatar, Username, Name, Role Badge) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {/* Avatar Initials Circle */}
                              <div className="w-9 h-9 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] text-[#3D4C32] font-bold font-mono text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {getInitials(item.name, item.username)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-stone-900 font-mono text-xs truncate">
                                    {item.username || item.email.split("@")[0]}
                                  </span>
                                  {getRoleBadge(item.role)}
                                </div>
                                <span className="text-[11px] text-stone-500 block truncate">
                                  {item.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Divisi / Jabatan */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-stone-800 text-xs block font-mono">
                              {item.division || "Umum"}
                            </span>
                            <span className="text-[11px] text-stone-500 block truncate">
                              {item.position || "Staff"}
                            </span>
                          </td>

                          {/* Column 3: Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Aktif</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Non-Aktif</span>
                              </span>
                            )}
                          </td>

                          {/* Column 4: Login Terakhir */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                            {item.lastLogin ? formatDate(item.lastLogin) : "-"}
                          </td>

                          {/* Column 5: Aksi (Buttons matching screenshot reference) */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* Quick Password Reset Binding Button */}
                              <button
                                type="button"
                                onClick={() => handleSelectUserForReset(item)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  targetUserId === item.id
                                    ? "bg-rose-50 border-rose-300 text-rose-700"
                                    : "bg-stone-50 border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                                }`}
                                title="Pilih akun ini untuk Reset Kata Sandi"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Status Action Button */}
                              {isSelf ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-stone-100 text-stone-400 border border-stone-200 select-none">
                                  <Lock className="w-3 h-3 text-stone-400" />
                                  <span>Akun Anda</span>
                                </span>
                              ) : isAdminProtected && isActive ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-stone-100 text-stone-400 border border-stone-200 select-none">
                                  <Shield className="w-3 h-3 text-stone-400" />
                                  <span>Protected</span>
                                </span>
                              ) : isActive ? (
                                <button
                                  type="button"
                                  onClick={() => promptStatusChange(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Nonaktifkan</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => promptStatusChange(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white bg-[#5B6D49] hover:bg-[#4E5C3E] transition-all cursor-pointer shadow-2xs"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Aktifkan</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Entry Counter Footer */}
            <div className="p-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-stone-500">
              <div>
                Menampilkan{" "}
                <span className="font-semibold text-stone-800">
                  {filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                sampai{" "}
                <span className="font-semibold text-stone-800">
                  {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                </span>{" "}
                dari <span className="font-semibold text-stone-800">{filteredUsers.length}</span> pengguna
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-stone-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-medium transition-all ${
                        currentPage === pg
                          ? "bg-[#5B6D49] text-white shadow-2xs font-bold"
                          : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-stone-600 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* STATUS TOGGLE CONFIRMATION MODAL                               */}
      {/* ============================================================== */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  (statusModalUser.status || "active") === "active"
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                }`}
              >
                {(statusModalUser.status || "active") === "active" ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  {(statusModalUser.status || "active") === "active"
                    ? "Konfirmasi Nonaktifkan Akun"
                    : "Konfirmasi Aktifkan Akun"}
                </h4>
                <span className="text-[11px] text-stone-500 font-mono">
                  {statusModalUser.email}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 leading-relaxed">
              {(statusModalUser.status || "active") === "active" ? (
                <>
                  Apakah Anda yakin ingin menonaktifkan akun <strong>{statusModalUser.name}</strong> (@{statusModalUser.username})?
                  Pengguna ini <strong>tidak akan dapat login</strong> ke platform sampai diaktifkan kembali oleh administrator.
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin mengaktifkan akun <strong>{statusModalUser.name}</strong> (@{statusModalUser.username})?
                  Pengguna ini akan segera <strong>mendapatkan hak akses login</strong> sesuai divisinya.
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  (statusModalUser.status || "active") === "active"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#5B6D49] hover:bg-[#4E5C3E]"
                }`}
              >
                {isUpdatingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (statusModalUser.status || "active") === "active" ? (
                  <span>Ya, Nonaktifkan Akun</span>
                ) : (
                  <span>Ya, Aktifkan Akun</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

