import { Request as ExReq, Response as ExRes } from "express";
import { List } from "../../../models";
import IList from "../../../interfaces/IList"; // Import the interface
import populateList from "../../../helpers/populateList";

export default async (req: ExReq, res: ExRes) => {
  try {
    // Extract parentId from query parameters.
    const { listId: parentListId, userId: userIdProp } = req.params;

    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    // Validate the presence of required parameters.
    if (!parentListId || typeof parentListId !== "string") {
      res.status(400).json({
        error: "Missing required parameters in request query",
        code: "list/missing-params",
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

    // Search for sub-lists using Sequelize's findAll method.
    const subLists = (await List.findAll({
      where: {
        projectId,
        userId,
        parentId: parentListId,
      },
    })) as IList[];

    const populatedSubLists = await Promise.all(
      subLists.map(async (subList) => {
        return await populateList(subList as IList);
      })
    );

    res.status(200).send(populatedSubLists);
  } catch (err: any) {
    console.error("Error fetching sub-lists: ", err);
    res.status(500).json({
      error: "Server error",
      code: "list/server-error",
      details: err.message,
    });
  }
};
