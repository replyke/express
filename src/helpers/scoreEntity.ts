import { differenceInMinutes } from "date-fns";
import { IEntityAttributes } from "../interfaces/IEntity";

const SCORING_CONFIG = {
  BASE_SCORE: 1,
  HALF_LIFE_HOURS: 120,
  FRESHNESS_BOOST_HOURS: 6,
  FRESHNESS_MULTIPLIER: 1.4,
  WEIGHTS: {
    UPVOTE: 1,
    DOWNVOTE: -0.7,
    REPLY: 0.6,
    SHARE: 2.5
  },
  ENGAGEMENT_RATE_CAP: 0.5,
  QUALITY_BONUS_MULTIPLIER: 2
};

const validateEntityDataForScoring = (
  entity: IEntityAttributes & { repliesCount: number }
) => {
  // Check `scoreUpdatedAt` validity
  if (!entity.scoreUpdatedAt) {
    console.error("Missing `scoreUpdatedAt` in entity.");
    throw new Error("Invalid entity: `scoreUpdatedAt` is required.");
  }

  // Check `createdAt` validity
  if (!entity.createdAt) {
    console.error("Missing or invalid `createdAt` in entity.");
    throw new Error("Invalid entity: `createdAt` is required.");
  }

  // Validate that `createdAt` is not in the future
  if (new Date(entity.createdAt) > new Date()) {
    console.error("`createdAt` is in the future:");
    throw new Error("Invalid entity: `createdAt` cannot be in the future.");
  }

  // Validate numerical fields
  if (!Array.isArray(entity.upvotes)) {
    console.error("Invalid `upvotes` field:", entity.upvotes);
    throw new Error("Invalid entity: `upvotes` must be an array.");
  }
  if (!Array.isArray(entity.downvotes)) {
    console.error("Invalid `downvotes` field:", entity.downvotes);
    throw new Error("Invalid entity: `downvotes` must be an array.");
  }
  if (typeof entity.repliesCount !== "number") {
    console.error("Invalid `repliesCount` field:", entity.repliesCount);
    throw new Error("Invalid entity: `repliesCount` must be a number.");
  }
  if (typeof entity.sharesCount !== "number") {
    console.error("Invalid `sharesCount` field:", entity.sharesCount);
    throw new Error("Invalid entity: `sharesCount` must be a number.");
  }

  // Validate `views`
  if (typeof entity.views !== "number" || entity.views <= 0) {
    console.error("Invalid `views` field:", entity.views);
    throw new Error("Invalid entity: `views` must be a positive number.");
  }
};

const GAP_IN_MINUTES_BETWEEN_RESCORING = 5;

export default function scoreEntity(
  entity: IEntityAttributes & { repliesCount: number }
): { newScore: number; newScoreUpdatedAt: Date; updated: boolean } {
  validateEntityDataForScoring(entity);

  const currentStateReturn = {
    updated: false,
    newScore: entity.score,
    newScoreUpdatedAt: entity.scoreUpdatedAt,
  };

  // Validate `scoreUpdatedAt`
  if (
    entity.scoreUpdatedAt &&
    differenceInMinutes(new Date(), new Date(entity.scoreUpdatedAt)) <=
      GAP_IN_MINUTES_BETWEEN_RESCORING
  ) {
    return currentStateReturn;
  }

  const upvotesCount = entity.upvotes.length;
  const downvotesCount = entity.downvotes.length;
  const repliesCount = entity.repliesCount;
  const sharesCount = entity.sharesCount;
  const views = Math.max(entity.views, 1);
  const createdAt = entity.createdAt;

  // Calculate time since publication in hours
  const hours_since_creation =
    (new Date().getTime() - new Date(createdAt!).getTime()) / (3600 * 1000);

  // Calculate decay factor for the base score
  const time_decay = Math.exp(-hours_since_creation / SCORING_CONFIG.HALF_LIFE_HOURS);

  // Fresh content boost for new posts
  const freshness_multiplier = hours_since_creation < SCORING_CONFIG.FRESHNESS_BOOST_HOURS
    ? SCORING_CONFIG.FRESHNESS_MULTIPLIER
    : 1.0;

  // Base score with decay and freshness boost
  const baseAdjustedScore = SCORING_CONFIG.BASE_SCORE * time_decay * freshness_multiplier;

  // Interaction score using new weights
  const interactionScore =
    SCORING_CONFIG.WEIGHTS.UPVOTE * upvotesCount +
    SCORING_CONFIG.WEIGHTS.DOWNVOTE * downvotesCount +
    SCORING_CONFIG.WEIGHTS.REPLY * repliesCount +
    SCORING_CONFIG.WEIGHTS.SHARE * sharesCount;

  // Gentler exposure adjustment using sqrt(log2())
  const exposure_factor = Math.sqrt(Math.log2(views + 1));
  const exposureAdjustedScore = interactionScore / exposure_factor;

  // Quality bonus for high engagement rate
  const total_interactions = upvotesCount + repliesCount + sharesCount;
  const engagement_rate = Math.min(total_interactions / views, SCORING_CONFIG.ENGAGEMENT_RATE_CAP);
  const quality_bonus = engagement_rate * SCORING_CONFIG.QUALITY_BONUS_MULTIPLIER;

  // Combine all score components
  const final_score = Math.max(0, baseAdjustedScore + exposureAdjustedScore + quality_bonus);

  return {
    updated: true,
    newScore: parseFloat(final_score.toFixed(2)),
    newScoreUpdatedAt: new Date(),
  };
}
