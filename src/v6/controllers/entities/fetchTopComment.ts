import { Request as ExReq, Response as ExRes } from "express";
import { fn, col } from "sequelize";
import { Comment } from "../../../models";
import { commentParams } from "../../../constants";

export default async function (req: ExReq, res: ExRes) {
  try {
    const { entityId } = req.params;
    const projectId = req.project.id; // assumes project middleware added this

    if (!entityId) {
      res.status(400).json({
        error: "Missing entityId in request.",
        code: "entity/missing-entity-id",
      });
    }

    const topComment = await Comment.findOne({
      where: {
        entityId,
        projectId,
        deletedAt: null,
        parentDeletedAt: null,
      },
      order: [
        [fn("array_length", col("upvotes"), 1), "DESC"],
        ["createdAt", "ASC"], // fallback to oldest if tie
      ],
      ...commentParams,
    });

    res.status(200).json(topComment ?? null);
  } catch (err) {
    console.error("Error fetching top comment:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "entity/server-error",
      details: (err as Error).message,
    });
  }
}
