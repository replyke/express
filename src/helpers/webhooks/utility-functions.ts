import crypto from "crypto";
import axios, { AxiosError } from "axios";

/**
 * Generate an HMAC signature for a given payload and timestamp.
 */
export function generateHmacSignature(
  payload: any,
  timestamp: number,
  secret: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest("hex");
}

/**
 * Validate an HMAC signature.
 */
export function validateHmacSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return signature === expectedSignature;
}

/**
 * Send a webhook request to the given URL with the specified data and headers.
 */
export async function sendWebhookRequest(
  webhookUrl: string,
  payload: any,
  secret: string
): Promise<any> {
  const timestamp = Date.now();
  const signature = generateHmacSignature(payload, timestamp, secret);

  return axios.post(webhookUrl, payload, {
    headers: {
      "X-Signature": signature,
      "X-Timestamp": timestamp.toString(),
    },
  });
}

/**
 * Send a webhook request to the given URL with the specified data and headers.
 * Returns null on error instead of throwing to prevent server crashes.
 */
export async function sendWebhookRequestWithHandle(
  webhookUrl: string,
  payload: any,
  secret: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await sendWebhookRequest(webhookUrl, payload, secret);

    // Validate the response signature if it exists
    const responseSignature = response.headers["x-response-signature"];
    if (!responseSignature) {
      console.warn("Webhook response missing signature:", webhookUrl);
      return { success: false, error: "Missing response signature" };
    }

    if (!validateHmacSignature(response.data, responseSignature, secret)) {
      console.warn("Webhook response signature invalid:", webhookUrl);
      return { success: false, error: "Invalid response signature" };
    }

    return { success: true, data: response.data };
  } catch (err) {
    const errorResult = handleWebhookError(err, "Webhook request failed");
    return { success: false, error: errorResult.message };
  }
}

/**
 * Handle errors during webhook requests.
 * Returns error object instead of throwing to prevent server crashes.
 */
export function handleWebhookError(err: any, defaultMessage: string): { message: string } {
  if (err instanceof AxiosError) {
    const errorMessage = err.response?.data?.error || defaultMessage;
    console.error(defaultMessage, {
      url: err.config?.url,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
    return { message: errorMessage };
  }
  console.error(defaultMessage, err);
  return { message: defaultMessage };
}
