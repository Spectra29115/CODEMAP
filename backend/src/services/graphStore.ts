import { GraphSnapshot } from "../types";

const graphStore = new Map<string, GraphSnapshot>();

export function setSnapshot(graphId: string, snapshot: GraphSnapshot): void {
  graphStore.set(graphId, snapshot);
}

export function getSnapshot(graphId: string): GraphSnapshot | undefined {
  return graphStore.get(graphId);
}

export function findSnapshotByFile(fileId: string): GraphSnapshot | undefined {
  for (const snapshot of graphStore.values()) {
    if (snapshot.summaries[fileId]) {
      return snapshot;
    }
  }
  return undefined;
}
