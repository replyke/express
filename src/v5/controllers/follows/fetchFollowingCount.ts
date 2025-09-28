import { Request as ExReq, Response as ExRes } from "express";
import { Follow } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const currentUserId = req.userId;
    const projectId = req.project.id;

    if (!currentUserId || typeof currentUserId !== "string") {
      res.status(400).json({
        error: "Missing or invalid userId in request parameters",
        code: "user/invalid-user-id",
      });
      return;
    }

    // Query the Follows table for followers count
    const count = await Follow.count({
      where: { projectId, followerId: currentUserId },
    });

    res.status(200).json({ count });
  } catch (err: any) {
    console.error("Error fetching following count: ", err);
    res.status(500).json({
      error: "Internal server error",
      code: "user/server-error",
      details: err.message,
    });
  }
};
