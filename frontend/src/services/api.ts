import axios from "axios";
import type {
    ChatRequest,
    ChatResult,
    FileAnalysisRequest,
    FileAnalysisResult,
    GraphData,
    FileSummary,
    OnboardingStep,
    QueryResult,
} from "@/types/graph";
import {
    buildDummyGraph,
    getDummySummary,
    dummyOnboarding,
    dummyQuery,
} from "./dummyData";

const RAW_BASE_URL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (import.meta.env.DEV ? "http://localhost:3001" : "https://codemap-eq9p.onrender.com");
const BASE_URL = RAW_BASE_URL
    ? RAW_BASE_URL.replace(/\/$/, "").endsWith("/api")
        ? RAW_BASE_URL.replace(/\/$/, "")
        : `${RAW_BASE_URL.replace(/\/$/, "")}/api`
    : "";

const client = axios.create({
    baseURL: BASE_URL || undefined,
    timeout: 12_000,
});

const isApiConfigured = () => Boolean(RAW_BASE_URL);

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

    async getSummary(fileId: string, graphId?: string): Promise<FileSummary> {
        if (isApiConfigured()) {
            const { data } = await client.get("/summary", {
                params: {
                    fileId,
                    graphId,
                },
            });
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

    async analyzeFile(payload: FileAnalysisRequest): Promise<FileAnalysisResult> {
        if (isApiConfigured()) {
            const { data } = await client.post("/file-analysis", payload);
            return data;
        }
        await wait(500);
        return {
            markdown: `- **What it does:** ${payload.fileName} appears to be a central file in the repository.
- **How it works:** It likely coordinates imports, exports, or application startup logic.
- **Files it connects to:** It likely links to neighboring modules in the same feature area.
- **Its role in the system:** It is treated as a high-priority file for architecture understanding.`,
        };
    },

    async chat(payload: ChatRequest): Promise<ChatResult> {
        if (isApiConfigured()) {
            const { data } = await client.post("/chat", payload);
            return data;
        }
        await wait(650);
        const last = payload.messages[payload.messages.length - 1]?.content ?? "";
        return {
            reply: `- **Answer:** I can see graph ${payload.graphId} in demo mode.
- **You asked:** ${last}
- **Next step:** connect backend API key for live Claude responses.`,
        };
    },
};
