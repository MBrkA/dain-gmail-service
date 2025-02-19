import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  TableUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const listMailConfig: ToolConfig = {
  id: "list-mail",
  name: "List Mail",
  description: "Lists the messages in the user's mailbox",
  input: z.object({
    maxResults: z.number().min(1).max(500).optional().default(100),
    pageToken: z.string().optional(),
    q: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    includeSpamTrash: z.boolean().optional().default(false),
  }),
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
        .content("Please authenticate with Google to view messages")
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
      if (input.maxResults) params.append("maxResults", input.maxResults.toString());
      if (input.pageToken) params.append("pageToken", input.pageToken);
      if (input.q) params.append("q", input.q);
      if (input.labelIds?.length) {
        input.labelIds.forEach(labelId => params.append("labelIds", labelId));
      }
      if (input.includeSpamTrash) params.append("includeSpamTrash", "true");

      // List messages via Gmail API
      const response = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      if (!response.data.messages || response.data.messages.length === 0) {
        const alertUI = new AlertUIBuilder()
          .variant("info")
          .title("No Messages Found")
          .message("No messages match the specified criteria");

        return {
          text: "No messages found",
          data: response.data,
          ui: alertUI.build(),
        };
      }

      // Get message details including subject and snippet
      const messagesWithDetails = await Promise.all(
        response.data.messages.map(async (message: any) => {
          const messageDetails = await axios.get(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata`,
            {
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            }
          );
          
          const headers = messageDetails.data.payload.headers;
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
          const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
          
          return {
            id: message.id,
            threadId: message.threadId,
            subject,
            from,
            date,
            snippet: messageDetails.data.snippet
          };
        })
      );

      // Create table UI with message information
      const tableUI = new TableUIBuilder()
        .addColumns([
          { key: "subject", header: "Subject", type: "text" },
          { key: "from", header: "From", type: "text" },
          { key: "date", header: "Date", type: "text" },
          { key: "snippet", header: "Preview", type: "text" },
        ])
        .rows(messagesWithDetails);

      return {
        text: `Found ${messagesWithDetails.length} messages`,
        data: {
          ...response.data,
          messages: messagesWithDetails,
        },
        ui: tableUI.build(),
      };
    } catch (error: any) {
      console.error("Error listing messages:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to List Messages")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to list messages",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { listMailConfig };
