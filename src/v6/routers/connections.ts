import { Router } from "express";
import {
  acceptConnection,
  declineConnection,
  removeConnection,
  fetchConnections,
  fetchConnectionsCount,
  fetchSentPendingConnections,
  fetchReceivedPendingConnections,
} from "../controllers/connections";
import requireUserAuth from "../../middleware/requireUserAuth";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Route to get established connections
router.get(
  "/",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchConnections
);

// Route to get connections count
router.get(
  "/count",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchConnectionsCount
);

// Route to get sent pending connection requests
router.get(
  "/pending/sent",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchSentPendingConnections
);

// Route to get received pending connection requests
router.get(
  "/pending/received",
  rateLimiter("5m", 100),
  requireUserAuth,
  fetchReceivedPendingConnections
);

// Route to accept a specific connection request
router.patch(
  "/:connectionId/accept",
  rateLimiter("5m", 50),
  requireUserAuth,
  acceptConnection
);

// Route to decline a specific connection request
router.patch(
  "/:connectionId/decline",
  rateLimiter("5m", 50),
  requireUserAuth,
  declineConnection
);

// Route to remove a specific connection (withdraw/disconnect)
router.delete(
  "/:connectionId",
  rateLimiter("5m", 50),
  requireUserAuth,
  removeConnection
);

export default router;