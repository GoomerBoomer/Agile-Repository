import type { Response } from "express";

export const sseClients = new Map<number, Set<Response>>();

export function sendToUser(userId: number, data: Record<string, unknown>) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}
