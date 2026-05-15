// @ts-nocheck
import express from "express";
import { ensureAuthenticated } from "../middleware/checkAuth";
import * as notifications from "../controller/notificationController";
import { sseClients } from "../notificationEmitter";

const router = express.Router();

router.get("/api/list", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const items = await notifications.getNotificationsForUser(user.id);
  const unreadCount = await notifications.getUnreadCount(user.id);
  res.json({ notifications: items, unreadCount });
});

router.get("/api/unread-count", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const count = await notifications.getUnreadCount(user.id);
  res.json({ unreadCount: count });
});

router.post("/api/mark-read/:id", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const notifId = Number(req.params.id);
  await notifications.markRead(notifId, user.id);
  const count = await notifications.getUnreadCount(user.id);
  res.json({ success: true, unreadCount: count });
});

router.post("/api/mark-all-read", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  await notifications.markAllRead(user.id);
  res.json({ success: true, unreadCount: 0 });
});

router.get("/stream", ensureAuthenticated, (req, res) => {
  const user = req.user as any;
  const userId = user.id;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");

  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId)!.add(res);

  req.on("close", () => {
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(userId);
    }
  });
});

export default router;
