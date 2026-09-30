"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import {
  Activity,
  LayoutDashboard,
  Radio,
  Clock,
  Cpu,
  Settings,
  Brain,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      group: "OVERVIEW",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      group: "MONITOR",
      items: [
        {
          label: "Live EEG",
          href: "/live",
          icon: Radio,
        },
        {
          label: "Sessions",
          href: "/sessions",
          icon: Clock,
        },
      ],
    },
    {
      group: "ANALYSIS",
      items: [
        {
          label: "Analysis",
          href: "/analysis",
          icon: Brain,
          badge: "Future ML",
        },
      ],
    },
    {
      group: "SYSTEM",
      items: [
        {
          label: "Devices",
          href: "/devices",
          icon: Cpu,
        },
        {
          label: "Settings",
          href: "/settings",
          icon: Settings,
        },
      ],
    },
  ];

  // Helper for breadcrumbs
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return ["Platform", "Dashboard"];
    return ["Platform", ...parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1))];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-[#070b14] flex text-slate-100 font-sans antialiased">
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[260px] bg-[#0a0f1c] border-r border-white/[0.04] shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-white/[0.04] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-white/90 text-sm tracking-tight block">
                EEG Wearable
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.15em] block">
                IoT Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-3 py-5 overflow-y-auto space-y-5">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-0.5">
              <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500/70 tracking-[0.15em] uppercase">
                {grp.group}
              </div>
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-blue-600/[0.12] text-blue-400 shadow-sm shadow-blue-500/[0.05]"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-blue-400" : "text-slate-500"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-white/[0.04] text-slate-500 border border-white/[0.06]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Live Device Status Footer */}
        <div className="p-4 border-t border-white/[0.04]">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-slate-300 text-[12px]">IoT EEG-001</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">94%</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 font-mono truncate">
              ESP32 Wi-Fi • TGAM1 ASIC • 512Hz
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0f1c] border-r border-white/[0.06] transform transition-transform duration-200 ease-in-out flex flex-col ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 border-b border-white/[0.04] flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white/90 text-sm">
              EEG Wearable Platform
            </span>
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-0.5">
              <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500/70 tracking-[0.15em] uppercase">
                {grp.group}
              </div>
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-600/[0.12] text-blue-400"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/[0.04]">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/[0.08] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-[#0a0f1c]/80 backdrop-blur-xl border-b border-white/[0.04] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb}>
                    <span className={idx === breadcrumbs.length - 1 ? "text-slate-300 font-medium" : ""}>
                      {crumb}
                    </span>
                    {idx < breadcrumbs.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight leading-tight">
                {title || breadcrumbs[breadcrumbs.length - 1]}
              </h1>
            </div>
          </div>

          {/* Right: Indicators & User Dropdown */}
          <div className="flex items-center gap-3">
            {/* Live Connection Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/[0.15] text-emerald-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>IoT Bridge Ready</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/[0.08] border border-blue-500/[0.12] text-blue-400 text-[11px] font-mono">
              <span>Demo Mode</span>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-xs shadow-lg shadow-blue-500/20">
                  {user?.name ? user.name.charAt(0) : "R"}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-medium text-white leading-tight">
                    {user?.name || "Researcher"}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {user?.institution ? user.institution.slice(0, 24) : "Research Lab"}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-[#111827] rounded-xl border border-white/[0.08] shadow-2xl shadow-black/40 py-2 z-50"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-white/[0.06]">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <span className="mt-1.5 inline-block text-[9px] px-1.5 py-0.5 rounded bg-blue-600/[0.15] text-blue-400 font-mono uppercase tracking-wider">
                      {user?.role || "Researcher"}
                    </span>
                  </div>

                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.04] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Account Settings</span>
                  </Link>
                  <Link
                    href="/devices"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.04] transition-colors"
                  >
                    <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    <span>Manage Devices</span>
                  </Link>

                  <div className="border-t border-white/[0.06] my-1" />

                  <button
                    onClick={() => logout()}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/[0.08] cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
