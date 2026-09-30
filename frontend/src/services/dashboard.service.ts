import { apiClient } from "./api";
import { DashboardSummary } from "@/types";
import { mockDashboardSummary } from "@/lib/mock/dashboard";

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    try {
      return await apiClient<DashboardSummary>("/dashboard/summary");
    } catch {
      // Fallback to mock dashboard data
      return mockDashboardSummary;
    }
  },
};
