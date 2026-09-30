"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Sliders,
  Clock,
  Shield,
  LogOut,
  Save,
  CheckCircle2,
  Bell,
  Cpu,
  Palette,
} from "lucide-react";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();

  // Profile form state
  const [name, setName] = useState(user?.name || "Dr. Renaldi Simamora");
  const [email, setEmail] = useState(user?.email || "researcher@biomedical.ac.id");
  const [institution, setInstitution] = useState(
    user?.institution || "Dept. of Electrical & Biomedical Engineering"
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Preferences state
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);
  const [defaultDevice, setDefaultDevice] = useState("EEG-001");

  // Session settings state
  const [defaultDuration, setDefaultDuration] = useState("15");
  const [autoSave, setAutoSave] = useState(true);

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
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="pb-2 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            System & Researcher Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure profile credentials, telemetry preferences, and experiment archiving defaults.
          </p>
        </div>

        {/* SECTION 1: PROFILE */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Researcher Profile
              </CardTitle>
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile updated</span>
              </span>
            )}
          </CardHeader>
          <form onSubmit={handleSaveProfile}>
            <CardContent className="space-y-4">
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
                  label="Academic Email"
                  value={email}
                  disabled
                  title="Contact administrator to change email"
                />
              </div>

              <Input
                id="institution"
                label="Institution / Department"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="submit" variant="primary" size="sm" className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* SECTION 2: PREFERENCES */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Preferences & Hardware Defaults
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Theme selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Interface Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Academic Light (Default)</option>
                  <option value="dark">High-Tech Dark</option>
                  <option value="system">System Synchronized</option>
                </select>
              </div>

              {/* Default device */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Default Wearable Device
                </label>
                <select
                  value={defaultDevice}
                  onChange={(e) => setDefaultDevice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EEG-001">TGAM1 Alpha (EEG-001)</option>
                  <option value="EEG-002">TGAM1 Beta (EEG-002)</option>
                  <option value="EEG-003">TGAM1 Gamma (EEG-003)</option>
                </select>
              </div>

              {/* Notifications */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Telemetry Notifications
                </label>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications}
                      onChange={(e) => setNotifications(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">Impedance & packet alerts</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: SESSION SETTINGS */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Acquisition Session Defaults
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Default Target Session Duration (Minutes)
                </label>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="5">5 Minutes (Brief Baseline)</option>
                  <option value="15">15 Minutes (Standard Protocol)</option>
                  <option value="30">30 Minutes (Cognitive Task Run)</option>
                  <option value="60">60 Minutes (Longitudinal)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Continuous Auto-Save to Database
                </label>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">
                      Auto-commit spectral features every 10 seconds
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: SECURITY & ACCESS */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Security & Authentication
              </CardTitle>
            </div>
            {passwordSaved && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password updated</span>
              </span>
            )}
          </CardHeader>
          <form onSubmit={handleSavePassword}>
            <CardContent className="space-y-4">
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
            <CardFooter className="justify-between">
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
