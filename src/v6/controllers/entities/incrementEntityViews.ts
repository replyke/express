import { Request as ExReq, Response as ExRes } from "express";
import { Entity } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  const { entityId } = req.params;
  const { count = 1 } = req.query;

  const projectId = req.project.id;

  if (!entityId) {
    res.status(400).json({
      error: "Invalid entity ID.",
      code: "entity/invalid-id",
    });
    return;
  }

  const countNum = parseInt(count as string, 10);

  if (isNaN(countNum) || countNum < 1) {
    res
      .status(400)
      .json({ error: "Invalid views count", code: "entity/invalid-count" });
    return;
  }

  try {
    // 1) Load the entity
    const entity = await Entity.findOne({ where: { projectId, id: entityId } });
    if (!entity) {
      res
        .status(404)
        .json({ error: "Entity not found.", code: "entity/not-found" });
      return;
    }

    // 2) Increment its `views` field by 1
    //    TS knows this returns a Promise<Model> on Postgres
    const updatedEntity = await entity.increment("views", {
      by: req.isService ? countNum : 1,
    });

    // 3) Send it right back
    res.status(200).json(updatedEntity.toJSON());
  } catch (err: any) {
    console.error("Failed to increment entity views:", err);
    res.status(500).json({
      error: "An error occurred while updating entity views.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
