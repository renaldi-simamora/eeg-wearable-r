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
  Wifi,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
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

export function AppShell({ children, title, subtitle, action }: AppShellProps) {
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
    <div className="h-screen h-[100dvh] bg-[#F7F8F5] flex text-[#1C1E1A] font-sans antialiased overflow-hidden">
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[250px] h-full bg-white border-r border-stone-200/90 shrink-0 select-none shadow-[1px_0_12px_-4px_rgba(0,0,0,0.02)]">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-stone-100 flex items-center justify-between">
          <Link href="/dashboard" aria-label="NeuroPulse Dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] group-hover:scale-105 transition-transform shadow-2xs">
              <Activity className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold text-[#1C1E1A] text-sm tracking-tight block">
                NeuroPulse
              </span>
              <span className="text-[10px] font-mono text-[#5B6D49] uppercase tracking-wider block font-medium">
                Biosensing Workstation
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-3 py-5 overflow-y-auto space-y-5">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-semibold text-stone-400 tracking-wider uppercase font-mono">
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
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#EDF1E7] text-[#2F3E26] font-semibold border border-[#DEE5D6] shadow-2xs"
                        : "text-stone-600 hover:text-[#1C1E1A] hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-[#5B6D49]" : "text-stone-400"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-white text-[#5B6D49] border border-[#DEE5D6] shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Live Device Status & Sign Out */}
        <div className="p-3.5 border-t border-stone-100 space-y-2.5 bg-[#FAFBF8]">
          <div className="p-3 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-stone-800 text-[11px]">IoT EEG-001</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full font-semibold">94%</span>
            </div>
            <p className="text-[10px] text-stone-500 font-mono truncate pt-0.5">
              ESP32 Wi-Fi • TGAM1 • 512Hz
            </p>
          </div>

          {/* Direct Sign Out Button */}
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-rose-600 hover:bg-rose-50 border border-stone-200/70 hover:border-rose-200 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5 text-stone-400 group-hover:text-rose-500" />
              <span>Sign Out</span>
            </div>
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
              Exit
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-stone-200 transform transition-transform duration-200 ease-in-out flex flex-col shadow-2xl ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 border-b border-stone-100 flex items-center justify-between">
          <Link
            href="/dashboard"
            aria-label="NeuroPulse Dashboard"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
              <Activity className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-bold text-[#1C1E1A] text-sm">
              NeuroPulse Platform
            </span>
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 px-4 py-5 overflow-y-auto space-y-4">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-semibold text-stone-400 tracking-wider uppercase font-mono">
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
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#EDF1E7] text-[#2F3E26] font-semibold border border-[#DEE5D6]"
                        : "text-stone-600 hover:text-[#1C1E1A] hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#5B6D49]" : "text-stone-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-white text-[#5B6D49] border border-[#DEE5D6]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-stone-100 bg-[#FAFBF8]">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Layout Canvas Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Compact Header (60px) - Pinned at Top */}
        <header className="h-16 shrink-0 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 flex items-center justify-between z-30 select-none shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
          {/* Left: Mobile Toggle & Context Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Open Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 font-medium">
                {breadcrumbs.slice(0, -1).join(" / ")}
              </span>
              <span className="text-stone-300">/</span>
              <h1 className="font-bold text-[#1C1E1A] tracking-tight text-sm">
                {title || breadcrumbs[breadcrumbs.length - 1]}
              </h1>
            </div>
          </div>

          {/* Right: Indicators, Actions & User Dropdown */}
          <div className="flex items-center gap-3">
            {action && <div className="hidden sm:flex items-center">{action}</div>}

            {/* IoT Bridge Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-[11px] font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>IoT Bridge Ready</span>
            </div>

            {/* Demo Simulation Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6] text-[10px] font-mono font-medium">
              <span>Demo Mode</span>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-stone-100 transition-colors text-left cursor-pointer border border-transparent hover:border-stone-200"
              >
                <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] text-[#5B6D49] flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-semibold text-[#1C1E1A] leading-tight">
                    {user?.name || "Super Admin NeuroPulse"}
                  </div>
                  <div className="text-[10px] text-stone-500 leading-tight truncate max-w-[130px]">
                    {user?.institution || "IPB University"}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:block" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-stone-200/90 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-stone-100">
                    <p className="text-xs font-bold text-[#1C1E1A] truncate">
                      {user?.name || "Super Admin NeuroPulse"}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">{user?.email}</p>
                    <span className="mt-1.5 inline-block text-[9px] px-2 py-0.5 rounded-full bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6] font-mono uppercase tracking-wider font-semibold">
                      {user?.role || "Researcher"}
                    </span>
                  </div>

                  <Link
                    href="/settings"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 hover:text-[#1C1E1A] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-stone-400" />
                    <span>Account Settings</span>
                  </Link>
                  <Link
                    href="/devices"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 hover:text-[#1C1E1A] transition-colors"
                  >
                    <Cpu className="w-4 h-4 text-stone-400" />
                    <span>Manage Devices</span>
                  </Link>

                  <div className="border-t border-stone-100 my-1" />

                  <button
                    onClick={() => logout()}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#F7F8F5]">
          <main id="main-content" role="main" aria-label="Dashboard Content" className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
