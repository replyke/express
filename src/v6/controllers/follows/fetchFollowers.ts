import { Request as ExReq, Response as ExRes } from "express";
import { User, Follow } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  const currentUserId = req.userId;
  const projectId = req.project.id!;

  try {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Query for accounts that follow this user
    const { rows: follows, count: totalCount } = await Follow.findAndCountAll({
      where: {
        projectId,
        followedId: currentUserId,
      },
      include: [
        {
          model: User,
          as: "follower",
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

    // Transform response
    const transformedFollowers = follows.map((follow: any) => ({
      followId: follow.id,
      user: follow.follower.toJSON(),
      followedAt: follow.createdAt,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      followers: transformedFollowers,
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
    console.error("Error fetching followers:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "follow/server-error",
      details: err.message,
    });
  }
};