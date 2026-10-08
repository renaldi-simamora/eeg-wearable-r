"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Shield,
  LogOut,
  Save,
  CheckCircle2,
  Bell,
  Radio,
} from "lucide-react";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();

  // Profile form state
  const [name, setName] = useState(user?.name || "Dr. Renaldi Simamora");
  const [email] = useState(user?.email || "researcher@biomedical.ac.id");
  const [institution, setInstitution] = useState(
    user?.institution || "Dept. of Electrical & Biomedical Engineering"
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Monitoring preferences state
  const [defaultDevice, setDefaultDevice] = useState("EEG-001");
  const [defaultChannel, setDefaultChannel] = useState("FP1");
  const [samplingRate, setSamplingRate] = useState("512");
  const [defaultDuration, setDefaultDuration] = useState("15");
  const [autoSave, setAutoSave] = useState(true);

  // Notifications state
  const [sessionAlerts, setSessionAlerts] = useState(true);
  const [qualityAlerts, setQualityAlerts] = useState(true);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      updateUser({
        ...user,
        name,
        institution,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  return (
    <AppShell title="Platform Settings">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="pb-4 border-b border-slate-800">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Settings & Preferences
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure researcher profile credentials, telemetry preferences, and experiment archiving defaults.
          </p>
        </div>

        {/* SECTION 1: ACCOUNT & PROFILE */}
        <Card>
          <CardHeader className="py-3.5 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-semibold text-white">
                Account & Researcher Profile
              </CardTitle>
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile updated</span>
              </span>
            )}
          </CardHeader>
          <form onSubmit={handleSaveProfile}>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="fullName"
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  id="email"
                  type="email"
                  label="Institutional Email"
                  value={email}
                  disabled
                  hint="Managed by administrator"
                />
              </div>

              <Input
                id="institution"
                label="Institution / Laboratory"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </CardContent>
            <CardFooter className="py-3 px-5 justify-end bg-slate-950/40 border-t border-slate-800/80 rounded-b-xl">
              <Button type="submit" variant="primary" size="sm" className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* SECTION 2: MONITORING & HARDWARE */}
        <Card>
          <CardHeader className="py-3.5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                <Radio className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-semibold text-white">
                Monitoring & Acquisition Configuration
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Default device */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Default Device
                </label>
                <select
                  value={defaultDevice}
                  onChange={(e) => setDefaultDevice(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer font-sans"
                >
                  <option value="EEG-001">TGAM1 Alpha (EEG-001)</option>
                  <option value="EEG-002">TGAM1 Beta (EEG-002)</option>
                  <option value="EEG-003">TGAM1 Gamma (EEG-003)</option>
                </select>
              </div>

              {/* Default Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Default Montage Channel
                </label>
                <select
                  value={defaultChannel}
                  onChange={(e) => setDefaultChannel(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer font-sans"
                >
                  <option value="FP1">FP1 (Left Prefrontal)</option>
                  <option value="FP2">FP2 (Right Prefrontal)</option>
                  <option value="Cz">Cz (Central Vertex)</option>
                </select>
              </div>

              {/* Sampling Rate */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Sampling Frequency
                </label>
                <select
                  value={samplingRate}
                  onChange={(e) => setSamplingRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer font-sans"
                >
                  <option value="512">512 Hz (Hardware TGAM1)</option>
                  <option value="256">256 Hz (Subsampled)</option>
                  <option value="128">128 Hz (Low Power)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
              {/* Target duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Default Target Session Duration
                </label>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer font-sans"
                >
                  <option value="5">5 Minutes (Brief Baseline)</option>
                  <option value="15">15 Minutes (Standard Protocol)</option>
                  <option value="30">30 Minutes (Cognitive Task Run)</option>
                  <option value="60">60 Minutes (Longitudinal Study)</option>
                </select>
              </div>

              {/* Auto Save */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide block mb-2">
                  Database Continuous Persistence
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                  <span>Auto-commit spectral features every 10 seconds</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: NOTIFICATIONS & ALERTS */}
        <Card>
          <CardHeader className="py-3.5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                <Bell className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-semibold text-white">
                Notifications & Telemetry Alerts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={sessionAlerts}
                onChange={(e) => setSessionAlerts(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
              <div>
                <span className="font-medium text-white block">Session State Notifications</span>
                <span className="text-[11px] text-slate-500">Notify upon session start, pause, auto-save, and completion.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-slate-300 pt-1">
              <input
                type="checkbox"
                checked={qualityAlerts}
                onChange={(e) => setQualityAlerts(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
              <div>
                <span className="font-medium text-white block">Signal Quality Alerts</span>
                <span className="text-[11px] text-slate-500">Trigger alert if electrode contact impedance degrades below 75%.</span>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* SECTION 4: SECURITY & AUTHENTICATION */}
        <Card>
          <CardHeader className="py-3.5 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                <Shield className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-semibold text-white">
                Security & Session Management
              </CardTitle>
            </div>
            {passwordSaved && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password updated</span>
              </span>
            )}
          </CardHeader>
          <form onSubmit={handleSavePassword}>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="currentPassword"
                  type="password"
                  label="Current Password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  id="newPassword"
                  type="password"
                  label="New Password"
                  placeholder="Min. 6 chars + numbers"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="py-3 px-5 justify-between bg-slate-950/40 border-t border-slate-800/80 rounded-b-xl">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => logout()}
                className="gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Platform</span>
              </Button>

              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={!currentPassword || !newPassword}
              >
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
