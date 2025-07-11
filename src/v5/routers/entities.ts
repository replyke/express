import { Router } from "express";

import {
  createEntity,
  fetchManyEntities,
  fetchEntity,
  fetchEntityByForeignId,
  fetchEntityByShortId,
  upvoteEntity,
  removeEntityUpvote,
  downvoteEntity,
  removeEntityDownvote,
  updateEntity,
  incrementEntityViews,
  deleteEntity,
} from "../controllers/entities";
import requireUserAuth from "../../middleware/requireUserAuth";
import optionalUserAuth from "../../middleware/optionalUserAuth";

import { rateLimiter } from "../../utils/rateLimit";
import fetchTopComment from "../controllers/entities/fetchTopComment";

const router: Router = Router();

// Route to create a new entity
router.post("/", rateLimiter("5m", 100), optionalUserAuth, createEntity);

// Route to fetch a many entities with filtering and pagination
router.get("/", rateLimiter("5m", 100), optionalUserAuth, fetchManyEntities);

// Route to fetch a single entity by its foreign ID, or create a new blank one if desired and it doesn't exist.
router.get("/by-foreign-id", rateLimiter("5m", 1000), fetchEntityByForeignId);

// Route to fetch a single entity by its short ID
router.get("/by-short-id", rateLimiter("5m", 1000), fetchEntityByShortId);

// Route to fetch a single entity by its ID
router.get("/:entityId", rateLimiter("5m", 1000), fetchEntity);

router.get("/:entityId/top-comment", fetchTopComment);

// Route to upvote an entity.
router.patch(
  "/:entityId/upvote",
  rateLimiter("5m", 100),
  requireUserAuth,
  upvoteEntity
);

// Route to remove upvote from entity.
router.patch(
  "/:entityId/remove-upvote",
  rateLimiter("5m", 50),
  requireUserAuth,
  removeEntityUpvote
);

// Route to downvote an entity.
router.patch(
  "/:entityId/downvote",
  rateLimiter("5m", 100),
  requireUserAuth,
  downvoteEntity
);

// Route to remove downvote from entity.
router.patch(
  "/:entityId/remove-downvote",
  rateLimiter("10m", 50),
  requireUserAuth,
  removeEntityDownvote
);

// Route to increment views of an entity.
router.patch(
  "/:entityId/increment-views",
  rateLimiter("5m", 1000),
  incrementEntityViews
);

// Route to update an entity
router.patch(
  "/:entityId",
  rateLimiter("5m", 200),
  requireUserAuth,
  updateEntity
);

// Route to delete an entity
router.delete(
  "/:entityId",
  rateLimiter("5m", 10),
  requireUserAuth,
  deleteEntity
);

export default router;
