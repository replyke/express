import { Request as ExReq, Response as ExRes } from "express";
import { List } from "../../../models";
import IList from "../../../interfaces/IList"; // Import the interface
import populateList from "../../../helpers/populateList";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { userId: userIdProp } = req.query;

    // Extract projectId and userId from query parameters.
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    let userId: string | null = null;
    if ((req.isMaster || req.isService) && typeof userIdProp === "string") {
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

    // Search for the list using Sequelize's findOne method.
    let list: IList | null = (await List.findOne({
      where: {
        projectId, // Ensure the types match
        userId,
        parentId: null,
        isRoot: true,
      },
    })) as IList | null;

    // If no list is found, create a new blank one.
    if (!list) {
      list = (await List.create({
        projectId,
        name: "root",
        userId: loggedInUserId,
        isRoot: true,
      })) as IList;
    }

    const populatedList = await populateList(list);

    // Return the list with a 200 (OK) status.
    res.status(200).send(populatedList);
  } catch (err: any) {
    console.error("Error fetching root list: ", err);
    res.status(500).json({
      error: "Server error",
      code: "list/server-error",
      details: err.message,
    });
  }
};
