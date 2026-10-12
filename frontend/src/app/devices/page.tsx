"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceService } from "@/services/device.service";
import { Device } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import {
  Cpu,
  BatteryCharging,
  Plus,
  Trash2,
} from "lucide-react";

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDeviceCode, setNewDeviceCode] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");

  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceService.getDevices(),
  });

  // Mutation to toggle connect / disconnect
  const toggleConnectionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "connected" | "disconnected" }) =>
      deviceService.updateDevice(id, {
        status,
        signalQuality: status === "connected" ? 94 : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  // Mutation to create new device
  const createDeviceMutation = useMutation({
    mutationFn: (payload: { deviceCode: string; name: string }) =>
      deviceService.createDevice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setIsAddOpen(false);
      setNewDeviceCode("");
      setNewDeviceName("");
    },
  });

  // Mutation to delete device
  const deleteDeviceMutation = useMutation({
    mutationFn: (id: string) => deviceService.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      if (selectedDevice) setIsDetailOpen(false);
    },
  });

  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceCode || !newDeviceName) return;
    createDeviceMutation.mutate({
      deviceCode: newDeviceCode,
      name: newDeviceName,
    });
  };

  const openDetails = (device: Device) => {
    setSelectedDevice(device);
    setIsDetailOpen(true);
  };

  return (
    <AppShell title="Device Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#1C1E1A] tracking-tight">
              Wearable Biosensor Devices
            </h2>
            <p className="text-xs sm:text-sm text-[#5E6659] mt-1">
              Register, configure, monitor telemetry, and manage wireless IoT EEG hardware nodes.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-2 rounded-full"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Device</span>
          </Button>
        </div>

        {/* Device Table View */}
        <Card className="overflow-hidden bg-white border-stone-200/80 rounded-2xl shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-[#5E6659]">
              <thead className="bg-[#FAFBF8] text-[10px] uppercase tracking-wider text-stone-500 font-semibold border-b border-stone-200/80 font-mono">
                <tr>
                  <th className="py-3.5 px-6">Device Name</th>
                  <th className="py-3.5 px-6">Device Code</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Battery</th>
                  <th className="py-3.5 px-6">Signal Quality</th>
                  <th className="py-3.5 px-6">Firmware</th>
                  <th className="py-3.5 px-6">Last Seen</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(devices || []).map((dev) => (
                  <tr key={dev.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#1C1E1A]">
                      {dev.name}
                    </td>
                    <td className="py-4 px-6 font-mono text-[#5B6D49] font-medium">
                      {dev.deviceCode}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono capitalize font-medium ${
                          dev.status === "connected"
                            ? "bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6]"
                            : dev.status === "warning"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-stone-100 text-stone-600 border border-stone-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dev.status === "connected"
                              ? "bg-[#5B6D49]"
                              : dev.status === "warning"
                              ? "bg-amber-500"
                              : "bg-stone-400"
                          }`}
                        />
                        <span>{dev.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono">
                      <span className="flex items-center gap-1.5 text-[#1C1E1A] font-semibold">
                        <BatteryCharging className="w-3.5 h-3.5 text-[#2D7A58]" />
                        <span>{dev.batteryLevel}%</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-[#1C1E1A]">
                      {dev.signalQuality > 0 ? `${dev.signalQuality}% Good` : "—"}
                    </td>
                    <td className="py-4 px-6 font-mono text-stone-500">
                      {dev.firmwareVersion}
                    </td>
                    <td className="py-4 px-6 text-stone-500 text-[11px] font-mono">
                      {formatDate(dev.lastSeen)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant={dev.status === "connected" ? "outline" : "primary"}
                          size="sm"
                          className="h-7 text-xs rounded-full border-stone-200"
                          onClick={() =>
                            toggleConnectionMutation.mutate({
                              id: dev.id,
                              status:
                                dev.status === "connected"
                                  ? "disconnected"
                                  : "connected",
                            })
                          }
                        >
                          {dev.status === "connected" ? "Disconnect" : "Connect"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-stone-600 hover:text-[#1C1E1A] rounded-full"
                          onClick={() => openDetails(dev)}
                        >
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="md:hidden divide-y divide-stone-100">
            {(devices || []).map((dev) => (
              <div key={dev.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1C1E1A] text-sm">{dev.name}</h4>
                      <span className="font-mono text-[11px] text-[#5B6D49]">
                        {dev.deviceCode}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      dev.status === "connected"
                        ? "success"
                        : dev.status === "warning"
                        ? "warning"
                        : "neutral"
                    }
                    size="sm"
                  >
                    {dev.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-mono block">Battery</span>
                    <span className="font-mono font-semibold text-[#1C1E1A]">
                      {dev.batteryLevel}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-mono block">Signal</span>
                    <span className="font-mono font-semibold text-[#1C1E1A]">
                      {dev.signalQuality > 0 ? `${dev.signalQuality}%` : "No Signal"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-mono block">Firmware</span>
                    <span className="font-mono text-stone-500">
                      {dev.firmwareVersion}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-mono block">Last Seen</span>
                    <span className="text-stone-500 text-[11px] font-mono">
                      {formatDate(dev.lastSeen)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-stone-100 gap-2">
                  <Button
                    variant={dev.status === "connected" ? "outline" : "primary"}
                    size="sm"
                    className="flex-1 rounded-full border-stone-200"
                    onClick={() =>
                      toggleConnectionMutation.mutate({
                        id: dev.id,
                        status:
                          dev.status === "connected"
                            ? "disconnected"
                            : "connected",
                      })
                    }
                  >
                    {dev.status === "connected" ? "Disconnect" : "Connect"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => openDetails(dev)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Device Details: ${selectedDevice.name}`}
          description={`Hardware specifications and telemetry diagnostics for ${selectedDevice.deviceCode}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 space-y-2.5 font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                <span className="text-stone-500 font-sans">EEG Front-End Module</span>
                <span className="font-semibold text-[#1C1E1A]">NeuroSky TGAM1 ASIC</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                <span className="text-stone-500 font-sans">Micro-controller (MCU)</span>
                <span className="font-semibold text-[#1C1E1A]">ESP32-WROOM-32 (240MHz)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                <span className="text-stone-500 font-sans">Wireless Connectivity</span>
                <span className="font-semibold text-[#1C1E1A]">Wi-Fi 802.11 b/g/n (2.4 GHz)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                <span className="text-stone-500 font-sans">Battery Capacity</span>
                <span className="font-semibold text-[#2D7A58]">
                  {selectedDevice.batteryLevel}% (LiPo 3.7V 500mAh)
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                <span className="text-stone-500 font-sans">Firmware Build</span>
                <span className="font-semibold text-stone-700">
                  {selectedDevice.firmwareVersion}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-stone-500 font-sans">Active Electrode Contact</span>
                <span className="font-semibold text-[#5B6D49]">FP1 Forehead Dry Contact</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteDeviceMutation.mutate(selectedDevice.id)}
                className="gap-1.5 rounded-full"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Device</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-full border-stone-200"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Device Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register New Wearable Device"
        description="Pair an ESP32 wearable headband node with the Go backend gateway."
      >
        <form onSubmit={handleCreateDevice} className="space-y-4">
          <Input
            id="deviceCode"
            label="Device Identifier Code"
            placeholder="e.g. EEG-004"
            value={newDeviceCode}
            onChange={(e) => setNewDeviceCode(e.target.value)}
            required
          />

          <Input
            id="deviceName"
            label="Display Name"
            placeholder="e.g. TGAM1 Wearable Headset Delta"
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            required
          />

          <div className="p-3.5 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 text-xs text-[#5E6659]">
            <span className="font-semibold text-[#1C1E1A] block mb-0.5">Provisioning Note:</span>
            <span>Once registered, the device node transmits telemetry packets over WebSocket directly to the Go backend.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddOpen(false)}
              className="rounded-full border-stone-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={createDeviceMutation.isPending}
              className="rounded-full"
            >
              Register Device
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
