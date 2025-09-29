import { Request as ExReq, Response as ExRes } from "express";
import { Connection } from "../../../../models";
import { Op } from "sequelize";

export default async (req: ExReq, res: ExRes) => {
  const { userId: otherUserId } = req.params;
  const currentUserId = req.userId;
  const projectId = req.project.id!;

  try {
    // Validate input
    if (!otherUserId || typeof otherUserId !== "string") {
      res.status(400).json({
        error: "Missing or invalid userId in request parameters",
        code: "connection/invalid-user-id",
      });
      return;
    }

    // Cannot disconnect from yourself
    if (currentUserId === otherUserId) {
      res.status(400).json({
        error: "Cannot disconnect from yourself",
        code: "connection/self-disconnect",
      });
      return;
    }

    // Find any connection between the two users
    const connection = await Connection.findOne({
      where: {
        projectId,
        [Op.or]: [
          { requesterId: currentUserId, receiverId: otherUserId },
          { requesterId: otherUserId, receiverId: currentUserId }
        ],
        status: {
          [Op.in]: ["pending", "accepted"]
        },
      },
    });

    if (!connection) {
      res.status(404).json({
        error: "No connection found between these users that can be removed.",
        code: "connection/not-found",
      });
      return;
    }

    // Determine the action based on connection status and user role
    let action: string;
    let message: string;

    if (connection.status === "pending") {
      if (connection.requesterId === currentUserId) {
        // Current user sent the request -> withdraw
        action = "withdraw";
        message = "Connection request withdrawn successfully.";
      } else {
        // Other user sent the request -> decline
        action = "decline";
        message = "Connection request declined successfully.";
      }
    } else if (connection.status === "accepted") {
      // Either user can disconnect
      action = "disconnect";
      message = "Connection removed successfully.";
    } else {
      // Should not happen due to query filter, but handle for type safety
      res.status(500).json({
        error: "Unknown connection status",
        code: "connection/unknown-status",
      });
      return;
    }

    // For decline, update status instead of deleting
    if (action === "decline") {
      await connection.update({
        status: "declined",
        respondedAt: new Date(),
      });

      res.status(200).json({
        id: connection.id,
        status: "declined",
        respondedAt: connection.respondedAt,
      });
    } else {
      // For withdraw and disconnect, delete the connection record
      await connection.destroy();

      res.status(200).json({
        message,
        action,
      });
    }

    // No notification sent when withdrawing/declining/disconnecting (per requirements)
  } catch (err: any) {
    console.error("Error removing connection:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};