import { Request as ExReq, Response as ExRes } from "express";

import { Entity } from "../../../models";
import IEntity from "../../../interfaces/IEntity";
import { entityParams } from "../../../constants/sequelize-query-params";
import ILocation from "../../../interfaces/ILocation";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  let responseSent = false;

  const sendResponse = (status: number, data: any) => {
    if (!responseSent) {
      responseSent = true;
      res.status(status).json(data);
    }
  };

  const {
    title,
    content,
    attachments,
    keywords,
    location,
    metadata,
    mentions,
  } = req.body;

  const { entityId } = req.params;
  const loggedInUserId = req.userId;
  const projectId = req.project.id!;
  const { webhookHandlers } = getCoreConfig();

  if (!entityId) {
    sendResponse(400, {
      error: "Invalid entity ID.",
      code: "entity/invalid-id",
    });
    return;
  }

  try {
    let entity = (await Entity.findOne({
      where: { projectId, id: entityId },
    })) as IEntity | null;

    // If the entity doesn't exist, return a 404 error
    if (!entity) {
      sendResponse(404, {
        error: "Entity not found.",
        code: "entity/not-found",
      });
      return;
    }

    if (
      entity.userId &&
      entity.userId !== loggedInUserId &&
      !req.isMaster &&
      !req.isService
    ) {
      sendResponse(403, {
        error: "Not authorized to update this entity.",
        code: "entity/not-authorized",
      });
      return;
    }

    // Call the webhook to validate the entity update
    const validationResult = await webhookHandlers.entityUpdated(req, {
      projectId,
      data: {
        foreignId: entity.foreignId,
        userId: entity.userId,
        title,
        content,
        attachments,
        keywords,
        location,
        metadata,
        mentions,
      },
      initiatorId: loggedInUserId,
    });

    if (!validationResult.valid) {
      console.warn("Entity update validation failed:", validationResult.error);
      sendResponse(400, {
        error: validationResult.error || "Entity validation failed",
        code: "entity/validation-failed",
      });
      return;
    }

    // Only update fields that are not undefined
    if (title !== undefined) entity.title = title;
    if (content !== undefined) entity.content = content;
    if (attachments !== undefined) entity.attachments = attachments;
    if (keywords !== undefined) entity.keywords = keywords;
    if (metadata !== undefined) entity.metadata = metadata;
    if (mentions !== undefined) entity.mentions = mentions;
    if (location !== undefined)
      entity.location = {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
      } as ILocation;

    // Save the updated entity
    await entity.save();

    // Fetch the entity again but populated now
    const populatedEntity = (await Entity.findOne({
      where: { id: entity.id },
      ...entityParams,
    })) as IEntity;

    // Respond with the updated entity
    sendResponse(200, populatedEntity.toJSON());
  } catch (err: any) {
    console.error("Failed to update the entity:", err);
    sendResponse(500, {
      error: "Failed to update the entity.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
