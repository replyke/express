import { Request as ExReq, Response as ExRes } from "express";
import { User, Connection } from "../../../models";
import { Op } from "sequelize";

export default async (req: ExReq, res: ExRes) => {
  const currentUserId = req.userId;
  const projectId = req.project.id!;

  try {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Query for all accepted connections where user is either requester or receiver
    const { rows: connections, count: totalCount } =
      await Connection.findAndCountAll({
        where: {
          projectId,
          status: "accepted",
          [Op.or]: [
            { requesterId: currentUserId },
            { receiverId: currentUserId },
          ],
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
          },
          {
            model: User,
            as: "receiver",
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
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

    // Transform the data to show the connected user (not the current user)
    const transformedConnections = connections.map((connection: any) => {
      const connectedUser =
        connection.requesterId === currentUserId
          ? connection.receiver
          : connection.requester;

      return {
        id: connection.id,
        connectedUser: connectedUser.toJSON(),
        connectedAt: connection.respondedAt,
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      connections: transformedConnections,
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
    console.error("Error fetching connections:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};
