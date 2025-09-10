import { Request as ExReq, Response as ExRes } from "express";
import { AppNotification } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    const updatedCount = await AppNotification.update(
      { isRead: true },
      {
        where: {
          userId: loggedInUserId,
          projectId,
          isRead: false,
        },
      }
    );

    res.status(200).json({
      markedAsRead: updatedCount[0],
    });
  } catch (err: any) {
    console.error("Error marking all notifications as read: ", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "app-notification/server-error",
      details: err.message,
    });
  }
};