"use client";

import React from "react";
import Link from "next/link";
import { Session } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration, formatDate } from "@/lib/utils";
import { ArrowRight, Eye } from "lucide-react";

interface RecentSessionsTableProps {
  sessions: Session[];
}

export function RecentSessionsTable({ sessions }: RecentSessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-400 text-sm">
          No sessions recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-4 flex items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold text-white">
            Recent Recording Sessions
          </CardTitle>
          <p className="text-[11px] text-slate-500">
            Chronological log of EEG experimental acquisition runs
          </p>
        </div>
        <Link href="/sessions">
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-400">
            <span>View All Sessions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardHeader>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-y border-white/[0.04]">
            <tr>
              <th className="py-3 px-6">Session ID</th>
              <th className="py-3 px-6">Date & Time</th>
              <th className="py-3 px-6">Device</th>
              <th className="py-3 px-6">Duration</th>
              <th className="py-3 px-6">Signal Quality</th>
              <th className="py-3 px-6">Classification</th>
              <th className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-6 font-mono font-medium text-white">
                  #{s.id.slice(-6)}
                </td>
                <td className="py-3.5 px-6 text-slate-400">
                  {formatDate(s.startedAt)}
                </td>
                <td className="py-3.5 px-6">
                  <span className="font-medium text-slate-200">
                    {s.deviceName || "TGAM1 Alpha"}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-500">
                    {s.deviceCode || "EEG-001"}
                  </span>
                </td>
                <td className="py-3.5 px-6 font-mono text-slate-300">
                  {formatDuration(s.duration)}
                </td>
                <td className="py-3.5 px-6">
                  <Badge variant="success" size="sm">
                    {s.signalQuality || 94}% Good
                  </Badge>
                </td>
                <td className="py-3.5 px-6">
                  <span className="text-[11px] font-mono text-slate-500">
                    Not available yet
                  </span>
                </td>
                <td className="py-3.5 px-6 text-right">
                  <Link href={`/sessions/${s.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
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
      <div className="md:hidden divide-y divide-white/[0.04]">
        {sessions.map((s) => (
          <div key={s.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-white">
                Session #{s.id.slice(-6)}
              </span>
              <Badge variant="success" size="sm">
                {s.signalQuality || 94}% Sig
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">
                  Device
                </span>
                <span className="font-medium text-slate-200">
                  {s.deviceName || "TGAM1 Alpha"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">
                  Duration
                </span>
                <span className="font-mono text-slate-200">
                  {formatDuration(s.duration)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-500 block uppercase">
                  Date
                </span>
                <span className="text-slate-400">
                  {formatDate(s.startedAt)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
              <span className="text-[11px] text-slate-500 font-mono">
                ML: Not available yet
              </span>
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
  );
}
