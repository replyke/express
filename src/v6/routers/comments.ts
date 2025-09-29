import { Router } from "express";

import {
  createComment,
  fetchManyComments,
  fetchComment,
  fetchCommentByForeignId,
  updateComment,
  upvoteComment,
  removeCommentUpvote,
  downvoteComment,
  removeCommentDownvote,
  deleteComment,
} from "../controllers/comments";
import requireUserAuth from "../../middleware/requireUserAuth";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Route for posting a new comment on an entity or reply to a comment.
router.post("/", rateLimiter("5m", 100), requireUserAuth, createComment);

// Route to retrieve comments with pagination and sorting options.
router.get("/", rateLimiter("5m", 100), fetchManyComments);

// Route to fetch a single comment by foreign id
router.get("/by-foreign-id", rateLimiter("5m", 100), fetchCommentByForeignId);

// Route to fetch a single comment by id
router.get("/:commentId", rateLimiter("5m", 100), fetchComment);

// Route for updating the content of a comment.
router.patch(
  "/:commentId",
  rateLimiter("5m", 50),
  requireUserAuth,
  updateComment
);

// Route for upvoting a comment.
router.patch(
  "/:commentId/upvote",
  rateLimiter("5m", 50),
  requireUserAuth,
  upvoteComment
);

// Route for removing a comment upvote.
router.patch(
  "/:commentId/remove-upvote",
  rateLimiter("5m", 25),
  requireUserAuth,
  removeCommentUpvote
);

// Route for downvoting a comment.
router.patch(
  "/:commentId/downvote",
  rateLimiter("5m", 50),
  requireUserAuth,
  downvoteComment
);

// Route for removing a comment downvote.
router.patch(
  "/:commentId/remove-downvote",
  rateLimiter("5m", 25),
  requireUserAuth,
  removeCommentDownvote
);

// Route for deleting a comment and its replies.
router.delete(
  "/:commentId",
  rateLimiter("5m", 10),
  requireUserAuth,
  deleteComment
);

export default router;
