"use client";

import React from "react";
import Link from "next/link";
import { Session } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDuration, formatDate } from "@/lib/utils";
import { ArrowRight, Eye, Clock } from "lucide-react";

interface RecentSessionsTableProps {
  sessions: Session[];
}

export function RecentSessionsTable({ sessions }: RecentSessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm">
        <CardContent className="py-14 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-[#1C1E1A] font-semibold text-sm">No sessions recorded yet</p>
          <p className="text-xs text-stone-500">Begin an acquisition session to record brainwave telemetry.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-white border-stone-200/80 rounded-2xl shadow-sm">
      <CardHeader className="py-4 px-6 flex items-center justify-between border-b border-stone-200/80">
        <div>
          <CardTitle className="text-base font-semibold text-[#1C1E1A]">
            Recent Recording Sessions
          </CardTitle>
          <p className="text-[11px] text-[#5E6659] mt-0.5">
            Chronological log of acquired electroencephalographic sessions
          </p>
        </div>
        <Link href="/sessions">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-[#5B6D49] hover:text-[#4E5E3E] rounded-full">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardHeader>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-[#5E6659]">
          <thead className="bg-[#FAFBF8] text-[10px] uppercase tracking-wider text-stone-500 font-mono font-semibold border-b border-stone-200/80">
            <tr>
              <th className="py-3 px-6">Session</th>
              <th className="py-3 px-6">Device</th>
              <th className="py-3 px-6">Duration</th>
              <th className="py-3 px-6">Signal Quality</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6">Date</th>
              <th className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-stone-50/70 transition-colors">
                <td className="py-4 px-6 font-mono font-semibold text-[#1C1E1A]">
                  #{s.id.slice(-6)}
                </td>
                <td className="py-4 px-6">
                  <span className="font-medium text-[#1C1E1A] block">
                    {s.deviceName || "TGAM1 Headset Alpha"}
                  </span>
                  <span className="text-[10px] font-mono text-[#5B6D49] block font-medium">
                    {s.deviceCode || "EEG-001"}
                  </span>
                </td>
                <td className="py-4 px-6 font-mono text-[#1C1E1A]">
                  {formatDuration(s.duration)}
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1.5 text-[#2D7A58] font-mono text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2D7A58]" />
                    <span>{s.signalQuality || 94}% Good</span>
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono capitalize font-medium ${
                      s.status === "running"
                        ? "bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6]"
                        : "bg-stone-100 text-stone-700 border border-stone-200"
                    }`}
                  >
                    {s.status === "running" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] animate-pulse" />
                    )}
                    <span>{s.status || "Completed"}</span>
                  </span>
                </td>
                <td className="py-4 px-6 text-stone-500 text-[11px] font-mono">
                  {formatDate(s.startedAt)}
                </td>
                <td className="py-4 px-6 text-right">
                  <Link href={`/sessions/${s.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 rounded-full border-stone-200 hover:border-stone-300">
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
      <div className="md:hidden divide-y divide-stone-100">
        {sessions.map((s) => (
          <div key={s.id} className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#1C1E1A]">
                Session #{s.id.slice(-6)}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono capitalize font-medium ${
                  s.status === "running"
                    ? "bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6]"
                    : "bg-stone-100 text-stone-700 border border-stone-200"
                }`}
              >
                {s.status || "Completed"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 block uppercase font-mono">
                  Device
                </span>
                <span className="font-medium text-[#1C1E1A]">
                  {s.deviceName || "TGAM1 Alpha"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase font-mono">
                  Duration
                </span>
                <span className="font-mono text-[#1C1E1A]">
                  {formatDuration(s.duration)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-stone-500 block uppercase font-mono">
                  Date
                </span>
                <span className="text-stone-500 text-[11px] font-mono">
                  {formatDate(s.startedAt)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-stone-100">
              <span className="text-xs text-[#2D7A58] font-mono font-medium">
                Sig {s.signalQuality || 94}% Good
              </span>
              <Link href={`/sessions/${s.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-full border-stone-200">
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
