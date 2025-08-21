import { Request as ExReq, Response as ExRes } from "express";
import { sendWebhookRequestWithHandle } from "./utility-functions";
import { IEntity } from "../../interfaces";

export default async (
  req: ExReq,
  res: ExRes,
  payload: {
    projectId: string;
    data: Partial<IEntity>;
    initiatorId: string | undefined;
  }
): Promise<{ valid: boolean; error?: string }> => {
  const entityUpdatedWebhook = req.project.webhooks.entityUpdated;
  if (!entityUpdatedWebhook) return { valid: true };

  const sharedSecret = req.project.keys.secret?.key;

  if (!sharedSecret) {
    const error = "Webhook URL or secret not configured";
    console.warn("Entity update validation failed:", error);
    return { valid: false, error };
  }

  try {
    const webhookResponse = await sendWebhookRequestWithHandle(
      entityUpdatedWebhook,
      payload,
      sharedSecret
    );

    if (!webhookResponse.success) {
      console.warn("Entity update webhook validation failed:", webhookResponse.error);
      return { valid: false, error: webhookResponse.error };
    }

    if (!webhookResponse.data || webhookResponse.data.valid !== true) {
      const error = webhookResponse.data?.message || "Invalid entity data";
      console.warn("Entity update validation rejected:", error);
      return { valid: false, error };
    }

    return { valid: true };
  } catch (err: any) {
    console.error("Entity update validation error:", err);
    return { valid: false, error: err.message };
  }
};
