import * as db from "../fake-db";

async function addNotification(
  recipientId: number,
  actorId: number,
  type: string,
  resourceId: number
) {
  return db.addNotification(recipientId, actorId, type, resourceId);
}

async function getNotificationsForUser(userId: number, limit = 20) {
  return db.getNotificationsForUser(userId, limit);
}

async function getUnreadCount(userId: number) {
  return db.getUnreadNotificationCount(userId);
}

async function markRead(notificationId: number, userId: number) {
  return db.markNotificationRead(notificationId, userId);
}

async function markAllRead(userId: number) {
  return db.markAllNotificationsRead(userId);
}

export {
  addNotification,
  getNotificationsForUser,
  getUnreadCount,
  markRead,
  markAllRead,
};
