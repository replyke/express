import { Request as ExReq, Response as ExRes } from "express";
import { Follow } from "../../../../models";

// Fetch a follow relationship
export default async (req: ExReq, res: ExRes) => {
  const { userId: followedId } = req.params;

  const loggedInUserId = req.userId;
  const projectId = req.project.id;

  try {
    // Check if the follow relationship exists
    const follow = await Follow.findOne({
      where: { projectId, followerId: loggedInUserId, followedId },
    });

    if (follow) {
      res.status(200).json({ followId: follow.id, isFollowing: true });
    } else {
      res.status(200).json({ isFollowing: false });
    }
  } catch (err: any) {
    console.error("Error fetching follow:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "follow/server-error",
      details: err.message,
    });
  }
};
