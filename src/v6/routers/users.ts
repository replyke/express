import { Router } from "express";
import {
  fetchUser,
  fetchUserSuggestions,
  checkUsernameAvailability,
  updateUser,
  fetchUserByForeignId,
  createFollow,
  deleteFollowByUserId,
  fetchFollowStatus,
  fetchFollowersByUserId,
  fetchFollowersCountByUserId,
  fetchFollowingByUserId,
  fetchFollowingCountByUserId,
} from "../controllers/users";
import {
  requestConnection,
  fetchConnectionStatus,
  removeConnectionByUserId,
  fetchConnectionsByUserId,
  fetchConnectionsCountByUserId,
} from "../controllers/users/connections";
import requireUserAuth from "../../middleware/requireUserAuth";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Route to get user mentions suggestions
router.get("/suggestions", rateLimiter("5m", 100), fetchUserSuggestions);

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

// Route for updating a user
router.patch("/:userId", rateLimiter("5m", 50), requireUserAuth, updateUser);

//////// ** Follow routes ** ////////

// Route to follow a user
router.post(
  "/:userId/follow",
  rateLimiter("5m", 75),
  requireUserAuth,
  createFollow
);

// Route to get a follow relationship status
router.get(
  "/:userId/follow",
  rateLimiter("5m", 75),
  requireUserAuth,
  fetchFollowStatus
);

// Route to get followers of a user
router.get(
  "/:userId/followers",
  rateLimiter("5m", 100),
  fetchFollowersByUserId
);

// Route to get count of all followers of a user
router.get(
  "/:userId/followers-count",
  rateLimiter("5m", 100),
  fetchFollowersCountByUserId
);

// Route to get accounts a user follows
router.get(
  "/:userId/following",
  rateLimiter("5m", 100),
  fetchFollowingByUserId
);

// Route to get count of all accounts a user follows
router.get(
  "/:userId/following-count",
  rateLimiter("5m", 100),
  fetchFollowingCountByUserId
);

// Route to unfollow a user
router.delete(
  "/:userId/follow",
  rateLimiter("5m", 75),
  requireUserAuth,
  deleteFollowByUserId
);

//////// ** Connection routes ** ////////

// Route to request connection with a user
router.post(
  "/:userId/connection",
  rateLimiter("5m", 25),
  requireUserAuth,
  requestConnection
);

// Route to get connection status with a user
router.get(
  "/:userId/connection",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchConnectionStatus
);

// Route to get connections of a user
router.get(
  "/:userId/connections",
  rateLimiter("5m", 100),
  fetchConnectionsByUserId
);

// Route to get connections count of a user
router.get(
  "/:userId/connections-count",
  rateLimiter("5m", 100),
  fetchConnectionsCountByUserId
);

// Route to decline/withdraw connection with a user
router.delete(
  "/:userId/connection",
  rateLimiter("5m", 50),
  requireUserAuth,
  removeConnectionByUserId
);

export default router;
