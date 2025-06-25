import { Router } from "express";
import {
  fetchUser,
  fetchUserSuggestions,
  fetchFollowersCount,
  fetchFollowingCount,
  checkUsernameAvailability,
  updateUser,
  fetchUserByForeignId,
  createFollow,
  deleteFollow,
  fetchFollow,
} from "../controllers/users";
import requireUserAuth from "../../middleware/requireUserAuth";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Route to get user mentions suggestions
router.get("/suggestions", rateLimiter("5m", 50), fetchUserSuggestions);

// Route to check if a username is available
router.get(
  "/check-username",
  rateLimiter("5m", 100),
  checkUsernameAvailability
);

// Route to fetch a user by their foreignId
router.get("/by-foreign-id", rateLimiter("5m", 100), fetchUserByForeignId);

// Route to fetch a user by id
router.get("/:userId", rateLimiter("5m", 100), fetchUser);

// Route to get count of all followers of a user
router.get(
  "/:userId/followers-count",
  rateLimiter("5m", 100),
  fetchFollowersCount
);

// Route to get count of all accounts a user follows
router.get(
  "/:userId/following-count",
  rateLimiter("5m", 100),
  fetchFollowingCount
);

// Route for updating a user
router.patch("/:userId", rateLimiter("5m", 50), requireUserAuth, updateUser);

//////// ** Follow routes ** ////////

// Route to follow a user
router.post(
  "/:userId/follow",
  rateLimiter("5m", 100),
  requireUserAuth,
  createFollow
);

// Route to get a follow relationship
router.get(
  "/:userId/follow",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchFollow
);

// Route to unfollow a user
router.delete(
  "/:userId/follow",
  rateLimiter("5m", 100),
  requireUserAuth,
  deleteFollow
);

export default router;
