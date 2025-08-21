import { Request as ExReq, Response as ExRes } from "express";
import { sendWebhookRequestWithHandle } from "./utility-functions";
import IEntity from "../../interfaces/IEntity";

export default async (
  req: ExReq,
  res: ExRes,
  payload: {
    projectId: string;
    data: Partial<IEntity>;
    initiatorId: string | undefined;
  }
): Promise<{ valid: boolean; error?: string }> => {
  const entityCreatedWebhook = req.project.webhooks.entityCreated;
  if (!entityCreatedWebhook) return { valid: true };

  const sharedSecret = req.project.keys.secret?.key;

  if (!sharedSecret) {
    const error = "Webhook URL or secret not configured";
    console.warn("Entity validation failed:", error);
    return { valid: false, error };
  }

  try {
    const webhookResponse = await sendWebhookRequestWithHandle(
      entityCreatedWebhook,
      payload,
      sharedSecret
    );

    if (!webhookResponse.success) {
      console.warn("Entity webhook validation failed:", webhookResponse.error);
      return { valid: false, error: webhookResponse.error };
    }

    if (!webhookResponse.data || webhookResponse.data.valid !== true) {
      const error = webhookResponse.data?.message || "Invalid entity data";
      console.warn("Entity validation rejected:", error);
      return { valid: false, error };
    }

    return { valid: true };
  } catch (err: any) {
    console.error("Entity validation error:", err);
    return { valid: false, error: err.message };
  }
};
