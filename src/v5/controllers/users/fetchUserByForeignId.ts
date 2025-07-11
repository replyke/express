import { Request as ExReq, Response as ExRes } from "express";
import { User } from "../../../models";

function getString(value: any): string | null {
  return typeof value === "string" ? value : null;
}

function getJSON(value: any): Record<string, any> | undefined {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, any>;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default async (req: ExReq, res: ExRes) => {
  try {
    const { foreignId, createIfNotFound } = req.query;

    if (!foreignId || typeof foreignId !== "string") {
      return res.status(400).json({
        error: "Missing or invalid foreign user ID.",
        code: "user/invalid-identifier",
      });
    }

    const projectId = req.project.id;
    const name = getString(req.query.name);
    const username = getString(req.query.username);
    const avatar = getString(req.query.avatar);
    const bio = getString(req.query.bio);
    const metadata = getJSON(req.query.metadata);
    const secureMetadata = getJSON(req.query.secureMetadata);

    let user = await User.findOne({
      where: { foreignId, projectId },
      attributes: {
        exclude: [
          "hash",
          "salt",
          "email",
          "isVerified",
          "isActive",
          "lastActive",
          "secureMetadata",
        ],
      },
    });

    // Handle case: user not found
    if (!user) {
      const shouldCreate = createIfNotFound === "true";
      const hasPermission = req.isService || req.isMaster;

      if (shouldCreate && hasPermission) {
        // Create user with provided fields
        user = await User.create({
          foreignId,
          projectId,
          name,
          username,
          avatar,
          bio,
          metadata,
          secureMetadata,
        });

        // Fetch again with excluded attributes
        const cleanUser = await User.findByPk(user.id, {
          attributes: {
            exclude: [
              "hash",
              "salt",
              "email",
              "isVerified",
              "isActive",
              "lastActive",
              "secureMetadata",
            ],
          },
        });

        return res.status(201).json(cleanUser?.toJSON());
      }

      return res.status(404).json({
        error: "User not found",
        code: "user/not-found",
      });
    }

    return res.status(200).json(user.toJSON());
  } catch (err: any) {
    console.error("Error fetching or creating user:", err);
    return res.status(500).json({
      error: "Internal server error",
      code: "user/server-error",
      details: err.message,
    });
  }
};
