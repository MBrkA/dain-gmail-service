import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const EmailAddress = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const InputSchema = z.object({
  draftId: z.string().describe("The ID of the draft to update"),
  to: z.array(EmailAddress).min(1),
  cc: z.array(EmailAddress).optional(),
  bcc: z.array(EmailAddress).optional(), 
  subject: z.string(),
  body: z.string(),
  isHtml: z.boolean().optional().default(false),
});

const updateDraftConfig: ToolConfig = {
  id: "update-draft",
  name: "Update Draft Email",
  description: "Update an existing draft email in Gmail",
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
        .content("Please authenticate with Google to update drafts")
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
      // Construct email MIME message
      const formatAddress = (addr: { email: string; name?: string }) =>
        addr.name ? `${addr.name} <${addr.email}>` : addr.email;

      const headers = [
        `To: ${input.to.map(formatAddress).join(", ")}`,
        input.cc?.length ? `Cc: ${input.cc.map(formatAddress).join(", ")}` : null,
        input.bcc?.length
          ? `Bcc: ${input.bcc.map(formatAddress).join(", ")}`
          : null,
        `Subject: ${input.subject}`,
        "MIME-Version: 1.0",
        `Content-Type: ${
          input.isHtml ? "text/html" : "text/plain"
        }; charset=utf-8`,
      ]
        .filter(Boolean)
        .join("\r\n");

      const message = `${headers}\r\n\r\n${input.body}`;
      const encodedMessage = Buffer.from(message).toString("base64url");

      // Update draft via Gmail API
      const response = await axios.put(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${input.draftId}`,
        {
          message: {
            raw: encodedMessage,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const cardUI = new CardUIBuilder()
        .title("Draft Updated")
        .content(
          `Draft ID: ${input.draftId}\nSubject: ${input.subject}\nTo: ${input.to
            .map(formatAddress)
            .join(", ")}`
        );

      return {
        text: "Draft email updated successfully",
        data: response.data,
        ui: cardUI.build(),
      };
    } catch (error: any) {
      console.error("Error updating draft:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Update Draft")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to update draft email",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { updateDraftConfig };
