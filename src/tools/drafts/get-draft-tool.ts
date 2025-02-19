import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const getDraftConfig: ToolConfig = {
  id: "get-draft",
  name: "Get Draft Email",
  description: "Get details of a specific draft email from Gmail",
  input: z.object({
    draftId: z.string().describe("The ID of the draft to retrieve"),
    format: z.enum(["full", "minimal", "raw", "metadata"]).optional().default("full"),
  }),
  output: z.any(),
  handler: async ({ draftId, format }, agentInfo, { app }) => {
    const tokens = getTokenStore().getToken(agentInfo.id);

    // Handle authentication
    if (!tokens) {
      const authUrl = await app.oauth2?.generateAuthUrl("google", agentInfo.id);
      if (!authUrl) {
        throw new Error("Failed to generate authentication URL");
      }
      const oauthUI = new OAuthUIBuilder()
        .title("Google Authentication")
        .content("Please authenticate with Google to view draft details")
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
      // Get draft via Gmail API
      const response = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      const draft = response.data;
      const headers = draft.message.payload.headers;
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
      const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const cc = headers.find((h: any) => h.name.toLowerCase() === 'cc')?.value || '';
      const bcc = headers.find((h: any) => h.name.toLowerCase() === 'bcc')?.value || '';
      
      // Get message body
      let body = '';
      if (draft.message.payload.body.data) {
        body = Buffer.from(draft.message.payload.body.data, 'base64').toString();
      } else if (draft.message.payload.parts) {
        const textPart = draft.message.payload.parts.find((part: any) => 
          part.mimeType === 'text/plain' || part.mimeType === 'text/html'
        );
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }

      const cardUI = new CardUIBuilder()
        .title("Draft Details")
        .content(`
          Draft ID: ${draft.id}
          Thread ID: ${draft.message.threadId}
          Subject: ${subject}
          From: ${from}
          To: ${to}
          ${cc ? `CC: ${cc}\n` : ''}
          ${bcc ? `BCC: ${bcc}\n` : ''}
          
          Message:
          ${body}
        `);

      return {
        text: "Draft details retrieved successfully",
        data: draft,
        ui: cardUI.build(),
      };
    } catch (error: any) {
      console.error("Error getting draft:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Get Draft")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to get draft email details",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { getDraftConfig };
