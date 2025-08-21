import { Request as ExReq, Response as ExRes } from "express";
import { sendWebhookRequestWithHandle } from "./utility-functions";
import IUser from "../../interfaces/IUser";

export default async (
  req: ExReq,
  res: ExRes,
  payload: {
    projectId: string;
    data: Partial<IUser>;
  }
): Promise<{ valid: boolean; error?: string }> => {
  const userUpdatedWebhook = req.project.webhooks.userUpdated;
  if (!userUpdatedWebhook) return { valid: true };

  const sharedSecret = req.project.keys.secret?.key;

  if (!sharedSecret) {
    const error = "Webhook URL or secret not configured";
    console.warn("User update validation failed:", error);
    return { valid: false, error };
  }

  try {
    const webhookResponse = await sendWebhookRequestWithHandle(
      userUpdatedWebhook,
      payload,
      sharedSecret
    );

    if (!webhookResponse.success) {
      console.warn("User update webhook validation failed:", webhookResponse.error);
      return { valid: false, error: webhookResponse.error };
    }

    if (!webhookResponse.data || webhookResponse.data.valid !== true) {
      const error = webhookResponse.data?.message || "Invalid user data";
      console.warn("User update validation rejected:", error);
      return { valid: false, error };
    }

    return { valid: true };
  } catch (err: any) {
    console.error("User update validation error:", err);
    return { valid: false, error: err.message };
  }
};
