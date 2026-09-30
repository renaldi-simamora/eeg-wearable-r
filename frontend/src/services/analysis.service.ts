import { apiClient } from "./api";
import { ModelCardInfo, MLPrediction, AIInsight } from "@/types";
import { mockModelCards } from "@/lib/mock/analysis";

export interface SessionAnalysisData {
  sessionId: string;
  status: string;
  message: string;
  notice: string;
  pipelineReady: boolean;
  futureServiceUrl: string;
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
        message: "Machine-learning classification will appear here.",
        notice: "Machine-learning results will be available after the ML service is integrated.",
        pipelineReady: true,
        futureServiceUrl: "http://localhost:5000/predict (Python FastAPI ML service)",
        predictions: [],
        insights: [],
      };
    }
  },
};
