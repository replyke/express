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

// Route to get accounts I follow
router.get(
  "/following",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchFollowing
);

// Route to get accounts that follow me
router.get(
  "/followers",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchFollowers
);

// Route to get followers count of a user
router.get(
  "/following-count",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchFollowingCount
);

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
