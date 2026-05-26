/**
 * Envío de emails.
 *
 * Si `RESEND_API_KEY` está configurada, usa la API de Resend (https://resend.com).
 * Si no, loguea el mensaje a stdout (visible en `fly logs`) y devuelve OK.
 *
 * Sin paquete: usa fetch nativo contra el endpoint REST de Resend.
 */

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const RESEND_API = "https://api.resend.com/emails";
const FROM = process.env.EMAIL_FROM ?? "Tavex <noreply@tavex.fly.dev>";

export async function sendEmail(
  params: EmailParams,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  // Fallback: log a stdout
  if (!apiKey) {
    console.log("[email:fallback]", {
      from: FROM,
      to: params.to,
      subject: params.subject,
      text: params.text ?? "(ver html)",
    });
    return { ok: true, id: "log-fallback" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[email:resend] Error", res.status, errText);
      return { ok: false, error: `Resend ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email:resend] Exception", msg);
    return { ok: false, error: msg };
  }
}
