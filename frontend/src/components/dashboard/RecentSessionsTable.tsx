"use client";

import React from "react";
import Link from "next/link";
import { Session } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration, formatDate } from "@/lib/utils";
import { ArrowRight, Eye, Clock } from "lucide-react";

interface RecentSessionsTableProps {
  sessions: Session[];
}

export function RecentSessionsTable({ sessions }: RecentSessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-medium text-sm">No sessions recorded yet</p>
          <p className="text-xs text-slate-500">Begin an acquisition session to record brainwave telemetry.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3.5 px-5 flex items-center justify-between border-b border-slate-800/80">
        <div>
          <CardTitle className="text-sm font-semibold text-white">
            Recent Recording Sessions
          </CardTitle>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Chronological log of acquired electroencephalographic sessions
          </p>
        </div>
        <Link href="/sessions">
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-cyan-400 hover:text-cyan-300">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardHeader>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold border-b border-slate-800/80">
            <tr>
              <th className="py-3 px-5">Session</th>
              <th className="py-3 px-5">Device</th>
              <th className="py-3 px-5">Duration</th>
              <th className="py-3 px-5">Signal Quality</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5">Date</th>
              <th className="py-3 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-5 font-mono font-medium text-white">
                  #{s.id.slice(-6)}
                </td>
                <td className="py-3.5 px-5">
                  <span className="font-medium text-slate-200 block">
                    {s.deviceName || "TGAM1 Headset Alpha"}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 block">
                    {s.deviceCode || "EEG-001"}
                  </span>
                </td>
                <td className="py-3.5 px-5 font-mono text-slate-300">
                  {formatDuration(s.duration)}
                </td>
                <td className="py-3.5 px-5">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{s.signalQuality || 94}% Good</span>
                  </span>
                </td>
                <td className="py-3.5 px-5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono capitalize ${
                      s.status === "running"
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {s.status === "running" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    <span>{s.status || "Completed"}</span>
                  </span>
                </td>
                <td className="py-3.5 px-5 text-slate-400 text-[11px] font-mono">
                  {formatDate(s.startedAt)}
                </td>
                <td className="py-3.5 px-5 text-right">
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
      <div className="md:hidden divide-y divide-slate-800/60">
        {sessions.map((s) => (
          <div key={s.id} className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-white">
                Session #{s.id.slice(-6)}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono capitalize ${
                  s.status === "running"
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}
              >
                {s.status || "Completed"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">
                  Device
                </span>
                <span className="font-medium text-slate-200">
                  {s.deviceName || "TGAM1 Alpha"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">
                  Duration
                </span>
                <span className="font-mono text-slate-200">
                  {formatDuration(s.duration)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">
                  Date
                </span>
                <span className="text-slate-400 text-[11px] font-mono">
                  {formatDate(s.startedAt)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
              <span className="text-xs text-emerald-400 font-mono">
                Sig {s.signalQuality || 94}% Good
              </span>
              <Link href={`/sessions/${s.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
