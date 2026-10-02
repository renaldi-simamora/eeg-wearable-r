import { apiClient } from "./api";
import { ModelCardInfo, MLPrediction, AIInsight } from "@/types";
import { mockModelCards } from "@/lib/mock/analysis";

export interface SessionAnalysisData {
  sessionId: string;
  status: string;
  message?: string;
  predictions: MLPrediction[];
  insights: AIInsight[];
}

export const analysisService = {
  async getModels(): Promise<ModelCardInfo[]> {
    try {
      return await apiClient<ModelCardInfo[]>("/models");
    } catch {
      return mockModelCards;
    }
  },

  async getAnalysisBySession(sessionId: string): Promise<SessionAnalysisData> {
    try {
      return await apiClient<SessionAnalysisData>(`/analysis/${sessionId}`);
    } catch {
      return {
        sessionId,
        status: "unprocessed",
        predictions: [],
        insights: [],
      };
    }
  },

  async getAnalysis(sessionId: string): Promise<SessionAnalysisData> {
    return this.getAnalysisBySession(sessionId);
  },

  async classifySession(sessionId: string): Promise<MLPrediction> {
    return await apiClient<MLPrediction>(`/analysis/${sessionId}/classify`, {
      method: "POST",
    });
  },
};
