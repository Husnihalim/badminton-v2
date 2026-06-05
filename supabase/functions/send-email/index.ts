import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const hookSecret = Deno.env.get("SUPA_SEND_EMAIL_HOOK_SECRET");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    // 1. Verify webhook signature from Supabase Auth
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      wh.verify(payload, headers);
    }

    const { mailer, template } = JSON.parse(payload);
    const { email, token, redirect_to } = template.data;

    let subject = "Verify your email - KelabSukan";
    let htmlContent = "";

    // 2. Define custom templates based on trigger type
    if (template.name === "signup") {
      subject = "Welcome to KelabSukan!";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            .container { max-width: 576px; margin: 40px auto; padding: 0 16px; }
            .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .header { background-color: #064e3b; padding: 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.025em; }
            .content { padding: 32px 24px; line-height: 1.6; }
            .content h2 { margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700; }
            .content p { color: #475569; font-size: 14px; margin-bottom: 24px; }
            .btn-container { text-align: center; margin: 32px 0; }
            .btn { background-color: #047857; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(4, 120, 87, 0.1); }
            .footer { text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; }
            .footer a { color: #64748b; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>KelabSukan</h1>
              </div>
              <div class="content">
                <h2>Welcome to KelabSukan!</h2>
                <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
                <div class="btn-container">
                  <a href="${redirect_to}?token_hash=${token}&type=signup" class="btn">Verify My Email</a>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 32px;">If the button above does not work, copy and paste this link into your browser:<br/>
                <a href="${redirect_to}?token_hash=${token}&type=signup" style="word-break: break-all;">${redirect_to}?token_hash=${token}&type=signup</a></p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KelabSukan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (template.name === "invite") {
      subject = "You've been invited to KelabSukan!";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            .container { max-width: 576px; margin: 40px auto; padding: 0 16px; }
            .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .header { background-color: #064e3b; padding: 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.025em; }
            .content { padding: 32px 24px; line-height: 1.6; }
            .content h2 { margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700; }
            .content p { color: #475569; font-size: 14px; margin-bottom: 24px; }
            .btn-container { text-align: center; margin: 32px 0; }
            .btn { background-color: #047857; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(4, 120, 87, 0.1); }
            .footer { text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; }
            .footer a { color: #64748b; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>KelabSukan</h1>
              </div>
              <div class="content">
                <h2>Join KelabSukan</h2>
                <p>You have been invited to join the sports community. Click the button below to accept your invitation:</p>
                <div class="btn-container">
                  <a href="${redirect_to}?token_hash=${token}&type=invite" class="btn">Accept Invitation</a>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 32px;">If the button above does not work, copy and paste this link into your browser:<br/>
                <a href="${redirect_to}?token_hash=${token}&type=invite" style="word-break: break-all;">${redirect_to}?token_hash=${token}&type=invite</a></p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KelabSukan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = "Authentication link - KelabSukan";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            .container { max-width: 576px; margin: 40px auto; padding: 0 16px; }
            .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .header { background-color: #064e3b; padding: 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.025em; }
            .content { padding: 32px 24px; line-height: 1.6; }
            .content p { color: #475569; font-size: 14px; margin-bottom: 24px; }
            .btn-container { text-align: center; margin: 32px 0; }
            .btn { background-color: #047857; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(4, 120, 87, 0.1); }
            .footer { text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>KelabSukan</h1>
              </div>
              <div class="content">
                <p>Please click the button below to log in or verify your action:</p>
                <div class="btn-container">
                  <a href="${redirect_to}?token_hash=${token}&type=${template.name}" class="btn">Continue to KelabSukan</a>
                </div>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KelabSukan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // 3. Send email via Resend
    await resend.emails.send({
      from: "KelabSukan <noreply@kelabsukan.com>",
      to: email,
      subject: subject,
      html: htmlContent,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 400,
          message: err instanceof Error ? err.message : "Invalid Webhook Signature or Payload"
        }
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
