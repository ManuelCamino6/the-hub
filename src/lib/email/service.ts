
import "server-only";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
};

export async function sendEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",

        ...(input.idempotencyKey
          ? {
              "Idempotency-Key":
                input.idempotencyKey,
            }
          : {}),
      },

      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),

      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    console.error(
      "Email delivery request failed:",
      response.status
    );

    throw new Error("EMAIL_SEND_FAILED");
  }

  const result = await response.json();

  return {
    id: result.id as string,
  };
}
