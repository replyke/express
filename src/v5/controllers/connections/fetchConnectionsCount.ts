import { Request as ExReq, Response as ExRes } from "express";
import { Connection } from "../../../models";
import { Op } from "sequelize";

export default async (req: ExReq, res: ExRes) => {
  const currentUserId = req.userId;
  const projectId = req.project.id!;

  try {
    // Count established connections where user is either requester or receiver
    const count = await Connection.count({
      where: {
        projectId,
        status: "accepted",
        [Op.or]: [
          { requesterId: currentUserId },
          { receiverId: currentUserId }
        ]
      },
    });

    res.status(200).json({ count });
  } catch (err: any) {
    console.error("Error fetching connections count:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "connection/server-error",
      details: err.message,
    });
  }
};