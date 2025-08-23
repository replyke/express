import { Request as ExReq } from "express";

import validateNotificationParams from "./validateNotificationParams";
import { NotificationParams } from "../interfaces/IAppNotification";
import { AppNotification } from "../models";
import { getCoreConfig } from "../config";

export default async function createNotification(
  req: ExReq,
  params: NotificationParams
): Promise<void> {
  setImmediate(async () => {
    if (!validateNotificationParams(params)) {
      console.error(`Invalid notification data for type: ${params.type}`);
      return;
    }

    // In production this should be active.
    if (params.userId === params.metadata.initiatorId) return;

    try {
      await AppNotification.create(params);
      const { webhookHandlers } = getCoreConfig();
      await webhookHandlers.notificationCreated(req, {
        projectId: params.projectId,
        data: params,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  });
}
