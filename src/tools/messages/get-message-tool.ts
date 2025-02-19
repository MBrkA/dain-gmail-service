import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const getMessageConfig: ToolConfig = {
  id: "get-message",
  name: "Get Message",
  description: "Gets the specified message from Gmail",
  input: z.object({
    messageId: z.string().describe("The ID of the message to retrieve"),
    format: z.enum(["full", "minimal", "raw", "metadata"]).optional().default("full"),
    metadataHeaders: z.array(z.string()).optional(),
  }),
  output: z.any(),
  handler: async ({ messageId, format, metadataHeaders }, agentInfo, { app }) => {
    const tokens = getTokenStore().getToken(agentInfo.id);

    // Handle authentication
    if (!tokens) {
      const authUrl = await app.oauth2?.generateAuthUrl("google", agentInfo.id);
      if (!authUrl) {
        throw new Error("Failed to generate authentication URL");
      }
      const oauthUI = new OAuthUIBuilder()
        .title("Google Authentication")
        .content("Please authenticate with Google to view message details")
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
      // Build query parameters
      const params = new URLSearchParams();
      params.append("format", format);
      if (metadataHeaders?.length) {
        metadataHeaders.forEach(header => params.append("metadataHeaders", header));
      }

      // Get message via Gmail API
      const response = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      const message = response.data;
      const headers = message.payload.headers;
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
      const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
      
      // Get message body
      let body = '';
      if (message.payload.body.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString();
      } else if (message.payload.parts) {
        const textPart = message.payload.parts.find((part: any) => 
          part.mimeType === 'text/plain' || part.mimeType === 'text/html'
        );
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }

      const cardUI = new CardUIBuilder()
        .title("Message Details")
        .content(`
          Message ID: ${message.id}
          Thread ID: ${message.threadId}
          Subject: ${subject}
          From: ${from}
          To: ${to}
          Date: ${date}
          Labels: ${message.labelIds?.join(', ') || 'None'}
          
          Message:
          ${body}
        `);

      return {
        text: "Message details retrieved successfully",
        data: message,
        ui: cardUI.build(),
      };
    } catch (error: any) {
      console.error("Error getting message:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Get Message")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to get message details",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { getMessageConfig };
