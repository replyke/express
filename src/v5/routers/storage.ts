import { Router } from "express";
import { upload } from "../../config/multer";
import { uploadFile } from "../controllers/storage";
import requireUserAuth from "../../middleware/requireUserAuth";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Upload a new file
router.post(
  "/",
  upload.single("file"),
  rateLimiter("5m", 10),
  requireUserAuth,
  uploadFile
);

export default router;
