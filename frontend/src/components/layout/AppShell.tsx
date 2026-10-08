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
    <div className="h-screen h-[100dvh] bg-[#070b14] flex text-slate-100 font-sans antialiased overflow-hidden">
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[240px] h-full bg-[#090e1c] border-r border-slate-800 shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" aria-label="EEG Wearable Platform Dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-slate-700 transition-colors">
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-semibold text-white text-xs tracking-tight block">
                EEG Wearable
              </span>
              <span className="text-[9px] font-mono text-cyan-400/90 uppercase tracking-widest block font-medium">
                IoT Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-2.5 py-4 overflow-y-auto space-y-4">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-0.5">
              <div className="px-2.5 pb-1.5 text-[9px] font-semibold text-slate-500 tracking-wider uppercase font-mono">
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
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-800/80 text-white border-l-2 border-cyan-500 pl-2"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isActive ? "text-cyan-400" : "text-slate-500"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-cyan-300 border border-slate-700">
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
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-slate-300 text-[11px]">IoT EEG-001</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-medium">94%</span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono truncate">
              ESP32 Wi-Fi • TGAM1 • 512Hz
            </p>
          </div>

          {/* Direct Sign Out Button */}
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400" />
              <span>Sign Out</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Exit
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/70 transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#090e1c] border-r border-slate-800 transform transition-transform duration-200 ease-in-out flex flex-col ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between">
          <Link
            href="/dashboard"
            aria-label="EEG Wearable Platform Dashboard"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <span className="font-semibold text-white text-xs">
              EEG Wearable Platform
            </span>
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-0.5">
              <div className="px-2.5 pb-1 text-[9px] font-semibold text-slate-500 tracking-wider uppercase font-mono">
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
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-800 text-white border-l-2 border-cyan-500 pl-2"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Layout Canvas Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Compact Header (56px) - Pinned at Top */}
        <header className="h-14 shrink-0 bg-[#090e1c] border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 select-none">
          {/* Left: Mobile Toggle & Context Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Open Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">
                {breadcrumbs.slice(0, -1).join(" / ")}
              </span>
              <span className="text-slate-600">/</span>
              <h1 className="font-semibold text-white tracking-tight">
                {title || breadcrumbs[breadcrumbs.length - 1]}
              </h1>
            </div>
          </div>

          {/* Right: Indicators, Actions & User Dropdown */}
          <div className="flex items-center gap-2.5">
            {action && <div className="hidden sm:flex items-center">{action}</div>}

            {/* IoT Bridge Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>IoT Bridge Ready</span>
            </div>

            {/* Demo Simulation Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] font-mono">
              <span>Demo Mode</span>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center font-semibold text-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "R"}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-medium text-slate-200 leading-tight">
                    {user?.name || "Researcher"}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">
                    {user?.institution || "Biomedical Lab"}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-slate-900 rounded-xl border border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-slate-800">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.name || "Researcher"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <span className="mt-1 inline-block text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono uppercase tracking-wider">
                      {user?.role || "Researcher"}
                    </span>
                  </div>

                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Account Settings</span>
                  </Link>
                  <Link
                    href="/devices"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Cpu className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manage Devices</span>
                  </Link>

                  <div className="border-t border-slate-800 my-1" />

                  <button
                    onClick={() => logout()}
                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
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
        <div className="flex-1 overflow-y-auto min-h-0">
          <main id="main-content" role="main" aria-label="Dashboard Content" className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
