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

    // Don't allow checking connection status with self
    if (currentUserId === otherUserId) {
      res.status(400).json({
        error: "Cannot check connection status with yourself",
        code: "connection/self-check",
      });
      return;
    }

    // Find any connection between the two users (either direction)
    const connection = await Connection.findOne({
      where: {
        projectId,
        [Op.or]: [
          { requesterId: currentUserId, receiverId: otherUserId },
          { requesterId: otherUserId, receiverId: currentUserId }
        ]
      },
    });

    // No connection exists
    if (!connection) {
      res.status(200).json({ status: "none" });
      return;
    }

    // Build response based on connection status and user role
    const isCurrentUserRequester = connection.requesterId === currentUserId;

    switch (connection.status) {
      case "pending":
        res.status(200).json({
          status: "pending",
          type: isCurrentUserRequester ? "sent" : "received",
          connectionId: connection.id,
          createdAt: connection.createdAt,
        });
        break;

      case "accepted":
        res.status(200).json({
          status: "connected",
          connectionId: connection.id,
          connectedAt: connection.respondedAt,
          requestedAt: connection.createdAt,
        });
        break;

      case "declined":
        res.status(200).json({
          status: "declined",
          type: isCurrentUserRequester ? "sent" : "received",
          connectionId: connection.id,
          respondedAt: connection.respondedAt,
        });
        break;

      default:
        res.status(500).json({
          error: "Unknown connection status",
          code: "connection/unknown-status",
        });
    }
  } catch (err: any) {
    console.error("Error fetching connection status:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};