import { Request as ExReq, Response as ExRes } from "express";
import { User, Connection } from "../../../models";
import createNotification from "../../../helpers/createNotification";

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
      include: [
        { model: User, as: "requester" },
        { model: User, as: "receiver" }
      ]
    });

    if (!connection) {
      res.status(404).json({
        error: "Pending connection request not found.",
        code: "connection/not-found",
      });
      return;
    }

    // Only the receiver can accept the connection
    if (connection.receiverId !== currentUserId) {
      res.status(403).json({
        error: "Only the receiver can accept a connection request.",
        code: "connection/unauthorized",
      });
      return;
    }

    // Update connection status to accepted
    await connection.update({
      status: "accepted",
      respondedAt: new Date(),
    });

    res.status(200).json({
      id: connection.id,
      status: "accepted",
      respondedAt: connection.respondedAt,
    });

    // Send notification to the original requester
    const receiverJSON = (connection as any).receiver.toJSON();
    createNotification(req, {
      userId: connection.requesterId,
      projectId,
      type: "connection-accepted",
      action: "open-profile",
      metadata: {
        connectionId: connection.id,
        initiatorId: receiverJSON.id!,
        initiatorName: receiverJSON.name,
        initiatorUsername: receiverJSON.username,
        initiatorAvatar: receiverJSON.avatar,
      },
    });
  } catch (err: any) {
    console.error("Error accepting connection:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};