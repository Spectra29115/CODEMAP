import axios from "axios";
import type { GraphData, FileSummary, OnboardingStep, QueryResult } from "@/types/graph";
import {
  buildDummyGraph,
  getDummySummary,
  dummyOnboarding,
  dummyQuery,
} from "./dummyData";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const client = axios.create({
  baseURL: BASE_URL || undefined,
  timeout: 12_000,
});

const isApiConfigured = () => Boolean(BASE_URL);

// Simulate latency for the dummy data so loading states feel real
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async analyzeRepo(repoUrl: string): Promise<{ graphId: string }> {
    if (isApiConfigured()) {
      const { data } = await client.post("/analyze", { repoUrl });
      return data;
    }
    await wait(900);
    return { graphId: "demo-graph" };
  },

  async getGraph(graphId: string, repoUrl = ""): Promise<GraphData> {
    if (isApiConfigured()) {
      const { data } = await client.get(`/graph/${graphId}`);
      return data;
    }
    await wait(400);
    return buildDummyGraph(repoUrl);
  },

  async getSummary(fileId: string): Promise<FileSummary> {
    if (isApiConfigured()) {
      const { data } = await client.get(`/summary/${fileId}`);
      return data;
    }
    await wait(250);
    const s = getDummySummary(fileId);
    if (!s) throw new Error("Summary not found");
    return s;
  },

  async query(graphId: string, q: string): Promise<QueryResult> {
    if (isApiConfigured()) {
      const { data } = await client.post("/query", { graphId, query: q });
      return data;
    }
    await wait(500);
    return dummyQuery(q);
  },

  async getOnboarding(graphId: string): Promise<OnboardingStep[]> {
    if (isApiConfigured()) {
      const { data } = await client.get(`/onboarding/${graphId}`);
      return data;
    }
    await wait(200);
    return dummyOnboarding;
  },
};
