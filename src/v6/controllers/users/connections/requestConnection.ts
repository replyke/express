import { Request as ExReq, Response as ExRes } from "express";
import { Op } from "sequelize";
import { User, Connection } from "../../../../models";
import createNotification from "../../../../helpers/createNotification";

export default async (req: ExReq, res: ExRes) => {
  const { userId: otherUserId } = req.params;
  const { message } = req.body;
  const currentUserId = req.userId;
  const projectId = req.project.id!;

  try {
    // Validate input
    if (!otherUserId || typeof otherUserId !== "string") {
      res.status(400).json({
        error: "Missing or invalid userId in request parameters",
        code: "connection/invalid-receiver-id",
      });
      return;
    }

    // Ensure requester and receiver are not the same
    if (currentUserId === otherUserId) {
      res.status(400).json({
        error: "A user cannot send a connection request to themselves.",
        code: "connection/self-request",
      });
      return;
    }

    // Check if both users exist
    const [requester, receiver] = await Promise.all([
      User.findByPk(currentUserId),
      User.findByPk(otherUserId),
    ]);

    if (!requester || !receiver) {
      res.status(404).json({
        error: "One or both users involved in the connection do not exist.",
        code: "connection/user-not-found",
      });
      return;
    }

    // Check if any connection already exists between these users
    const existingConnection = await Connection.findOne({
      where: {
        projectId,
        [Op.or]: [
          { requesterId: currentUserId, receiverId: otherUserId },
          { requesterId: otherUserId, receiverId: currentUserId },
        ],
      },
    });

    if (existingConnection) {
      let errorCode = "connection/already-exists";
      let errorMessage = "Connection already exists between these users.";

      if (existingConnection.status === "pending") {
        errorCode = "connection/request-pending";
        errorMessage =
          "A connection request is already pending between these users.";
      } else if (existingConnection.status === "accepted") {
        errorCode = "connection/already-connected";
        errorMessage = "Users are already connected.";
      } else if (existingConnection.status === "declined") {
        errorCode = "connection/request-declined";
        errorMessage =
          "Connection request was declined. Only the receiver can initiate a new request.";
      }

      res.status(409).json({
        error: errorMessage,
        code: errorCode,
      });
      return;
    }

    // Create the connection request
    const connection = await Connection.create({
      projectId,
      requesterId: currentUserId,
      receiverId: otherUserId,
      status: "pending",
      message: message?.trim() || null,
    });

    res.status(201).json({
      id: connection.id,
      status: connection.status,
      createdAt: connection.createdAt,
    });

    // Send notification to receiver
    const requesterJSON = requester.toJSON();
    createNotification(req, {
      userId: otherUserId,
      projectId,
      type: "connection-request",
      action: "open-profile",
      metadata: {
        connectionId: connection.id,
        initiatorId: requesterJSON.id!,
        initiatorName: requesterJSON.name,
        initiatorUsername: requesterJSON.username,
        initiatorAvatar: requesterJSON.avatar,
      },
    });
  } catch (err: any) {
    console.error("Error creating connection request:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};
