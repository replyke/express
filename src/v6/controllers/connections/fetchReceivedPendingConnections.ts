import { Request as ExReq, Response as ExRes } from "express";
import { User, Connection } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  const currentUserId = req.userId;
  const projectId = req.project.id!;

  try {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Query for received pending requests (requests sent to this user)
    const { rows: receivedRequests, count: totalCount } = await Connection.findAndCountAll({
      where: {
        projectId,
        receiverId: currentUserId,
        status: "pending",
      },
      include: [
        {
          model: User,
          as: "requester",
          attributes: {
            exclude: [
              "hash",
              "salt",
              "email",
              "isVerified",
              "isActive",
              "lastActive",
              "secureMetadata",
            ],
          },
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // Transform received requests
    const transformedRequests = receivedRequests.map((connection: any) => ({
      id: connection.id,
      type: "received",
      user: connection.requester.toJSON(),
      message: connection.message,
      createdAt: connection.createdAt,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      requests: transformedRequests,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        limit,
      },
    });
  } catch (err: any) {
    console.error("Error fetching received pending connections:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};