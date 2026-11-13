import { apiClient } from "./api";
import { User, UserStatus } from "@/types";

export interface ResetPasswordDTO {
  newPassword: string;
  confirmPassword: string;
}

export const userService = {
  async getUsers(): Promise<User[]> {
    try {
      const res = await apiClient<User[]>("/users");
      if (Array.isArray(res)) {
        return res;
      }
      return [];
    } catch (err: any) {
      console.warn("[userService] Failed to fetch users from API, falling back to local dataset:", err);
      // Fallback mock dataset matching multi-division research setting
      return [
        {
          id: "user-admin-01",
          username: "superadmin",
          name: "Super Admin NeuroPulse",
          email: "admin@gmail.com",
          role: "superadmin",
          division: "IT & Telemetry",
          position: "Head of Platform & IT",
          status: "active",
          lastLogin: new Date().toISOString(),
          institution: "IPB University",
          createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2c0a80f7-64e5-48f7-a4b7-c1adfe1cae74",
          username: "virzasiutaa",
          name: "Virza Siuta",
          email: "virzasiutaa@gmail.com",
          role: "admin",
          division: "Biomedical & Hardware",
          position: "Administrator",
          status: "active",
          lastLogin: new Date().toISOString(),
          institution: "IPB University",
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "user-lab-02",
          username: "septi.a",
          name: "Septi Anggraini",
          email: "septi.tax@neuropulse.id",
          role: "head",
          division: "Clinical Research",
          position: "Head of Clinical Protocol",
          status: "active",
          lastLogin: new Date(Date.now() - 2 * 3600000).toISOString(),
          institution: "IPB University",
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "user-lab-03",
          username: "renaldi.s",
          name: "Renaldi Simamora",
          email: "renaldi.s@neuropulse.id",
          role: "engineer",
          division: "Biomedical & Hardware",
          position: "Lead Biomedical Engineer",
          status: "active",
          lastLogin: new Date(Date.now() - 18 * 3600000).toISOString(),
          institution: "IPB University",
          createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "user-lab-04",
          username: "budi.s",
          name: "Dr. Budi Santoso",
          email: "budi.santoso@neuropulse.id",
          role: "researcher",
          division: "AI & Signal Processing",
          position: "Lead Machine Learning Researcher",
          status: "active",
          lastLogin: new Date(Date.now() - 36 * 3600000).toISOString(),
          institution: "IPB University",
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "user-lab-05",
          username: "dina.p",
          name: "Dina Permatasari",
          email: "dina.p@neuropulse.id",
          role: "staff",
          division: "Clinical Research",
          position: "EEG Lab Technician",
          status: "active",
          lastLogin: new Date(Date.now() - 120 * 3600000).toISOString(),
          institution: "IPB University",
          createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "user-lab-06",
          username: "faisal.h",
          name: "Faisal Hakim",
          email: "faisal.h@neuropulse.id",
          role: "engineer",
          division: "Biomedical & Hardware",
          position: "Junior Hardware Associate",
          status: "inactive",
          lastLogin: null,
          institution: "IPB University",
          createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "user-lab-07",
          username: "tari.w",
          name: "Tari Wulandari",
          email: "tari.w@neuropulse.id",
          role: "staff",
          division: "GA & Laboratory Operations",
          position: "Lab Ethics & Compliance Officer",
          status: "active",
          lastLogin: new Date(Date.now() - 24 * 3600000).toISOString(),
          institution: "IPB University",
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }
  },

  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    const res = await apiClient<User>(`/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    return res;
  },

  async resetPassword(id: string, payload: ResetPasswordDTO): Promise<{ message: string }> {
    const res = await apiClient<{ message: string }>(`/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return res;
  },
};

