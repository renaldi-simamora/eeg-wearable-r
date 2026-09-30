"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { deviceService } from "@/services/device.service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, formatDuration } from "@/lib/utils";
import {
  Search,
  Filter,
  Eye,
  Plus,
  Clock,
  Radio,
  ArrowUpDown,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";

export default function SessionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "duration">("date_desc");

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionService.getSessions(),
  });

  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceService.getDevices(),
  });

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s) => {
        const matchesSearch =
          s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.deviceName && s.deviceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.deviceCode && s.deviceCode.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesDevice = deviceFilter === "all" || s.deviceId === deviceFilter;
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;

        return matchesSearch && matchesDevice && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
        }
        if (sortBy === "date_asc") {
          return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
        }
        if (sortBy === "duration") {
          return b.duration - a.duration;
        }
        return 0;
      });
  }, [sessions, searchTerm, deviceFilter, statusFilter, sortBy]);

  return (
    <AppShell title="Recording Sessions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Recording Sessions Archive
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Browse, filter, and inspect physiological recording sessions and signal datasets.
            </p>
          </div>

          <Link href="/live">
            <Button variant="primary" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Record New Session</span>
            </Button>
          </Link>
        </div>

        {/* Controls Bar: Search & Filters */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by session ID, device name..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Device */}
            <div className="lg:col-span-3">
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Devices</option>
                {(devices || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.deviceCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div className="lg:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="running">Running</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Sort */}
            <div className="lg:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="duration">Longest Duration</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No sessions recorded yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No experimental runs match your search parameters. Start a live acquisition run to generate data.
              </p>
              <Link href="/live" className="inline-block pt-2">
                <Button variant="primary" size="sm">
                  Start Live Session
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Session ID</th>
                    <th className="py-3.5 px-6">Date & Time</th>
                    <th className="py-3.5 px-6">Device</th>
                    <th className="py-3.5 px-6">Duration</th>
                    <th className="py-3.5 px-6">Signal Quality</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-mono font-medium text-slate-900">
                        #{s.id.slice(-6)}
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        {formatDate(s.startedAt)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-900 block">
                          {s.deviceName || "TGAM1 Headset Alpha"}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 block">
                          {s.deviceCode || "EEG-001"}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-800 font-medium">
                        {formatDuration(s.duration)}
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant={
                            (s.signalQuality || 90) >= 80 ? "success" : "warning"
                          }
                          size="sm"
                        >
                          {s.signalQuality || 94}% Good
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono capitalize ${
                            s.status === "completed"
                              ? "bg-slate-100 text-slate-700"
                              : s.status === "running"
                              ? "bg-emerald-50 text-emerald-700 font-semibold"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {s.status === "running" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          <span>{s.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link href={`/sessions/${s.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredSessions.map((s) => (
                <div key={s.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-900 text-sm">
                      Session #{s.id.slice(-6)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono capitalize ${
                        s.status === "completed"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-emerald-50 text-emerald-700 font-semibold"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Device
                      </span>
                      <span className="font-medium text-slate-800">
                        {s.deviceName || "TGAM1 Alpha"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Duration
                      </span>
                      <span className="font-mono text-slate-800">
                        {formatDuration(s.duration)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Date & Time
                      </span>
                      <span className="text-slate-600">
                        {formatDate(s.startedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-50 text-xs">
                    <Badge variant="success" size="sm">
                      {s.signalQuality || 94}% Sig
                    </Badge>
                    <Link href={`/sessions/${s.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
