import { ConvexError } from "convex/values";
import type { z } from "zod";

type Parameters = Record<string, string | number | boolean | undefined>;
const responseErrors: Record<number, string> = {
  400: "The seed filter rejected these criteria. Check the values and try again.",
  401: "The seed filter rejected its API key. Ask an administrator to check the Convex configuration.",
  403: "The seed filter rejected its API key. Ask an administrator to check the Convex configuration.",
  404: "This filtered seed is no longer available.",
};

export function parseParameters<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ConvexError(
      issue?.code === "unrecognized_keys"
        ? "Unknown filter."
        : (issue?.message ?? "Invalid filter criteria.")
    );
  }
  return result.data;
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  parameters: Parameters = {},
  timeoutMs = 15000
): Promise<T> {
  const base = process.env.SEED_FILTER_API_URL;
  const key = process.env.SEED_FILTER_API_KEY;
  if (!base || !key)
    throw new ConvexError(
      "Seed filter is not configured. Set SEED_FILTER_API_URL and SEED_FILTER_API_KEY in Convex."
    );
  try {
    const url = new URL(base);
    const localHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localHttp) throw new Error("Invalid URL");
    url.pathname = `/api/${path}`;
    url.search = new URLSearchParams(
      Object.entries(parameters)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([key, value]) => [key, String(value)])
    ).toString();
    url.hash = "";
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok)
      throw new ConvexError(
        responseErrors[response.status] ??
          "The seed filter is unavailable. Try again shortly."
      );
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success)
      throw new ConvexError("The seed filter returned an unexpected response.");
    return parsed.data;
  } catch (error) {
    if (error instanceof ConvexError) throw error;
    throw new ConvexError(
      "Could not reach the seed filter. Check its configuration or try again."
    );
  }
}
