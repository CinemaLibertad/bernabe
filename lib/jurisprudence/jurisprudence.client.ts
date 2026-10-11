import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { JurisprudenceSearchResponse } from "./jurisprudence.model";

const region = "southamerica-east1";

export async function searchJurisprudence(query: string, offset = 0) {
  const functions = getFunctions(getApp(), region);
  const invoke = httpsCallable<{ query: string; limit: number; offset: number }, JurisprudenceSearchResponse>(functions, "searchJurisprudence");
  const response = await invoke({ query, limit: 10, offset });
  return response.data;
}

export async function getJurisprudenceDetails(providerId: string) {
  const functions = getFunctions(getApp(), region);
  const invoke = httpsCallable<{ providerId: string }, { provider: "juridica-multisource"; result: import("./jurisprudence.model").JurisprudenceResult }>(functions, "getJurisprudenceDetails");
  const response = await invoke({ providerId });
  return response.data.result;
}
