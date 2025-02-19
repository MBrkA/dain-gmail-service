import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

// Define email address schema
const EmailAddress = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

// Define attachment schema
const Attachment = z.object({
  filename: z.string(),
  content: z.string(), // Base64 encoded content
  contentType: z.string(),
});

// Define input schema
const InputSchema = z.object({
  to: z.array(EmailAddress).min(1),
  cc: z.array(EmailAddress).optional(),
  bcc: z.array(EmailAddress).optional(),
  subject: z.string(),
  body: z.string(),
  isHtml: z.boolean().optional().default(false),
  attachments: z.array(Attachment).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional().default('normal'),
  replyTo: EmailAddress.optional(),
  inReplyTo: z.string().optional(), // Message ID being replied to
  references: z.array(z.string()).optional(), // Thread reference IDs
});

const sendMailConfig: ToolConfig = {
  id: "send-mail",
  name: "Send Email",
  description: "Send a new email via Gmail",
  input: InputSchema,
  output: z.any(),
  handler: async (input, agentInfo, { app }) => {
    const tokens = getTokenStore().getToken(agentInfo.id);

    // Handle authentication
    if (!tokens) {
      const authUrl = await app.oauth2?.generateAuthUrl("google", agentInfo.id);
      if (!authUrl) {
        throw new Error("Failed to generate authentication URL");
      }
      const oauthUI = new OAuthUIBuilder()
        .title("Google Authentication")
        .content("Please authenticate with Google to send emails")
        .logo(
          "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png"
        )
        .url(authUrl)
        .provider("google");

      return {
        text: "Authentication required",
        data: undefined,
        ui: oauthUI.build(),
      };
    }

    try {
      // Format email addresses
      const formatAddress = (addr: { email: string; name?: string }) =>
        addr.name ? `${addr.name} <${addr.email}>` : addr.email;

      // Generate boundary for multipart messages
      const boundary = `boundary_${Date.now().toString(16)}`;

      // Construct email headers
      const headers = [
        `To: ${input.to.map(formatAddress).join(", ")}`,
        input.cc?.length ? `Cc: ${input.cc.map(formatAddress).join(", ")}` : null,
        input.bcc?.length ? `Bcc: ${input.bcc.map(formatAddress).join(", ")}` : null,
        `Subject: ${input.subject}`,
        "MIME-Version: 1.0",
        input.replyTo ? `Reply-To: ${formatAddress(input.replyTo)}` : null,
        input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : null,
        input.references?.length ? `References: ${input.references.join(" ")}` : null,
        input.priority === 'high' ? "X-Priority: 1\r\nX-MSMail-Priority: High" :
          input.priority === 'low' ? "X-Priority: 5\r\nX-MSMail-Priority: Low" : null,
        input.attachments?.length ? 
          `Content-Type: multipart/mixed; boundary="${boundary}"` :
          `Content-Type: ${input.isHtml ? "text/html" : "text/plain"}; charset=utf-8`,
      ].filter(Boolean).join("\r\n");

      // Construct message body
      let body = "";
      if (input.attachments?.length) {
        // Multipart message with attachments
        body += `\r\n--${boundary}\r\n`;
        body += `Content-Type: ${input.isHtml ? "text/html" : "text/plain"}; charset=utf-8\r\n\r\n`;
        body += input.body;

        // Add attachments
        for (const attachment of input.attachments) {
          body += `\r\n--${boundary}\r\n`;
          body += `Content-Type: ${attachment.contentType}\r\n`;
          body += `Content-Transfer-Encoding: base64\r\n`;
          body += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;
          body += attachment.content.replace(/([^\0]{76})/g, "$1\r\n");
        }
        body += `\r\n--${boundary}--`;
      } else {
        body = input.body;
      }

      // Combine headers and body
      const message = `${headers}\r\n\r\n${body}`;
      const encodedMessage = Buffer.from(message).toString("base64url");

      // Send message via Gmail API
      const response = await axios.post(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          raw: encodedMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const cardUI = new CardUIBuilder()
        .title("Email Sent")
        .content(
          `Subject: ${input.subject}\nTo: ${input.to.map(formatAddress).join(", ")}`
        );

      return {
        text: "Email sent successfully",
        data: response.data,
        ui: cardUI.build(),
      };
    } catch (error: any) {
      console.error("Error sending email:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Send Email")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to send email",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { sendMailConfig };
