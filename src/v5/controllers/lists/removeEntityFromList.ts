import { Request as ExReq, Response as ExRes } from "express";

import { List } from "../../../models";
import populateList from "../../../helpers/populateList";
import IList from "../../../interfaces/IList";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { entityId, userId: userIdProp } = req.body;
    const { listId } = req.params;

    const loggedInUserId = req.userId;
    const projectId = req.project.id!;

    if (!listId || !entityId) {
      res.status(400).json({
        error: "Missing listId or entityId",
        code: "list/missing-data",
      });
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

    const list = (await List.findOne({
      where: {
        projectId,
        userId,
        id: listId,
      },
    })) as IList | null;

    if (!list) {
      res.status(404).json({
        error: "List not found",
        code: "list/not-found",
      });
      return;
    }

    if (!list.entityIds.includes(entityId)) {
      res.status(409).json({
        error: "Entity does not exist in the list",
        code: "list/entity-not-found",
      });
      return;
    }

    list.set(
      "entityIds",
      list.entityIds.filter((id) => id !== entityId)
    );

    await list.save();

    const populatedList = await populateList(list);

    res.status(200).json(populatedList);
  } catch (err: any) {
    console.error("Error removing entity from list: ", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "list/server-error",
      details: err.message,
    });
  }
};
