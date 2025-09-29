import { Router } from "express";
import requireUserAuth from "../../middleware/requireUserAuth";
import { createReport } from "../controllers/reports";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Route to create a new report
router.post("/", rateLimiter("5m", 5), requireUserAuth, createReport);

export default router;
