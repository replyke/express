import { Request as ExReq, Response as ExRes } from "express";
import { Op } from "sequelize";
import { List } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { listId, userId: userIdProp } = req.params;

    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    if (!listId) {
      res
        .status(400)
        .json({ error: "Missing list ID", code: "list/invalid-id" });
      return;
    }

    let userId: string | null = null;
    if ((req.isMaster || req.isService) && userIdProp) {
      userId = userIdProp;
    } else if (loggedInUserId) {
      userId = loggedInUserId;
    }

    // Validate the presence of userId.
    if (typeof userId !== "string") {
      res.status(400).json({
        error: "Missing userId",
        code: "list/missing-data",
      });
      return;
    }

    const list = await List.findOne({
      where: {
        id: listId,
        projectId,
        userId,
        parentId: { [Op.ne]: null },
      },
    });

    if (!list) {
      res.status(404).json({ error: "List not found", code: "list/not-found" });
      return;
    }

    if (!list.parentId) {
      // It's a root list — cannot be deleted
      res.status(403).json({
        error: "Root lists cannot be deleted",
        code: "list/cannot-delete-root",
      });
      return;
    }

    await list.destroy();

    res.sendStatus(204);
  } catch (err: any) {
    console.error("Error deleting list: ", err);
    res.status(500).json({
      error: "Server error",
      code: "list/server-error",
      details: err.message,
    });
  }
};
