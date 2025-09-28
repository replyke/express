import { Request as ExReq, Response as ExRes } from "express";
import { Connection } from "../../../models";

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
        status: "pending",
      },
    });

    if (!connection) {
      res.status(404).json({
        error: "Pending connection request not found.",
        code: "connection/not-found",
      });
      return;
    }

    // Only the receiver can decline the connection
    if (connection.receiverId !== currentUserId) {
      res.status(403).json({
        error: "Only the receiver can decline a connection request.",
        code: "connection/unauthorized",
      });
      return;
    }

    // Update connection status to declined
    await connection.update({
      status: "declined",
      respondedAt: new Date(),
    });

    res.status(200).json({
      id: connection.id,
      status: "declined",
      respondedAt: connection.respondedAt,
    });

    // No notification sent when declining (per requirements)
  } catch (err: any) {
    console.error("Error declining connection:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};