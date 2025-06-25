import { Router } from "express";

import {
  createNewList,
  fetchRootList,
  fetchSubLists,
  updateList,
  addEntityToList,
  removeEntityFromList,
  deleteList,
  isEntitySaved,
} from "../controllers/lists";
import requireUserAuth from "../../middleware/requireUserAuth";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Route to create a new list
router.post(
  "/:listId/sub-lists",
  rateLimiter("5m", 50),
  requireUserAuth,
  createNewList
);

// Route to fetch the root list for the logged in user
router.get("/root", rateLimiter("5m", 10), requireUserAuth, fetchRootList);

// Route to fetch the sub-lists of a list
router.get(
  "/:listId/sub-lists",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchSubLists
);

// Route to check if entity is saved by user
router.get(
  "/is-entity-saved",
  rateLimiter("5m", 250),
  requireUserAuth,
  isEntitySaved
);

// Route add an entity to list
router.patch(
  "/:listId/add-entity",
  rateLimiter("5m", 50),
  requireUserAuth,
  addEntityToList
);

// Route to remove an entity from list
router.patch(
  "/:listId/remove-entity",
  rateLimiter("5m", 50),
  requireUserAuth,
  removeEntityFromList
);

// Route to update a list
router.patch("/:listId", rateLimiter("5m", 10), requireUserAuth, updateList);

// Route to delete a list
router.delete("/:listId", rateLimiter("5m", 10), requireUserAuth, deleteList);

export default router;
