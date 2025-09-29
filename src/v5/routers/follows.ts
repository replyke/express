import { Router } from "express";
import {
  fetchFollowersCount,
  fetchFollowingCount,
  fetchFollowing,
  fetchFollowers,
  deleteFollow,
} from "../controllers/follows";
import requireUserAuth from "../../middleware/requireUserAuth";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Route to get accounts logged in user follows
router.get(
  "/following",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchFollowing
);

// Route to get accounts that follow logged in user
router.get(
  "/followers",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchFollowers
);

// Route to get followers count of logged in user
router.get(
  "/following-count",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchFollowingCount
);

// Route to get following count of logged in user
router.get(
  "/followers-count",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchFollowersCount
);

// Route to unfollow a user
router.delete(
  "/:followId",
  rateLimiter("5m", 75),
  requireUserAuth,
  deleteFollow
);

export default router;
