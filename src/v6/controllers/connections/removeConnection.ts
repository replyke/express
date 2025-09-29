import { Request as ExReq, Response as ExRes } from "express";
import { Connection } from "../../../models";
import { Op } from "sequelize";

export default async (req: ExReq, res: ExRes) => {
  const { connectionId } = req.params;
  const currentUserId = req.userId;
  const projectId = req.project.id!;

  try {
    // Validate input
    if (!connectionId || typeof connectionId !== "string") {
      res.status(400).json({
        error: "Missing or invalid connectionId in request parameters",
        code: "connection/invalid-connection-id",
      });
      return;
    }

    // Find the connection
    const connection = await Connection.findOne({
      where: {
        id: connectionId,
        projectId,
        status: {
          [Op.in]: ["pending", "accepted"],
        },
      },
    });

    if (!connection) {
      res.status(404).json({
        error: "Connection not found or cannot be withdrawn.",
        code: "connection/not-found",
      });
      return;
    }

    // Check authorization based on status
    if (connection.status === "pending") {
      // Only the requester can withdraw a pending request
      if (connection.requesterId !== currentUserId) {
        res.status(403).json({
          error:
            "Only the requester can withdraw a pending connection request.",
          code: "connection/unauthorized",
        });
        return;
      }
    } else if (connection.status === "accepted") {
      // Either connected user can disconnect
      if (
        connection.requesterId !== currentUserId &&
        connection.receiverId !== currentUserId
      ) {
        res.status(403).json({
          error: "Only connected users can disconnect.",
          code: "connection/unauthorized",
        });
        return;
      }
    }

    // Delete the connection record
    await connection.destroy();

    res.status(200).json({
      message:
        connection.status === "pending"
          ? "Connection request withdrawn successfully."
          : "Connection removed successfully.",
    });

    // No notification sent when withdrawing/disconnecting (per requirements)
  } catch (err: any) {
    console.error("Error withdrawing connection:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};
