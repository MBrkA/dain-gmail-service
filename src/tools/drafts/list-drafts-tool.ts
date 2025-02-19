import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  TableUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const listDraftsConfig: ToolConfig = {
  id: "list-drafts",
  name: "List Draft Emails",
  description: "List all draft emails in Gmail",
  input: z.object({
    maxResults: z.number().min(1).max(500).optional().default(100),
    pageToken: z.string().optional(),
    q: z.string().optional(),
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
        .content("Please authenticate with Google to view drafts")
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
      if (input.includeSpamTrash) params.append("includeSpamTrash", "true");

      // List drafts via Gmail API
      const response = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      if (!response.data.drafts || response.data.drafts.length === 0) {
        const alertUI = new AlertUIBuilder()
          .variant("info")
          .title("No Drafts Found")
          .message("There are no draft emails in your Gmail account");

        return {
          text: "No drafts found",
          data: response.data,
          ui: alertUI.build(),
        };
      }

      // Create table UI with draft information
      const tableUI = new TableUIBuilder()
        .addColumns([
          { key: "id", header: "Draft ID", type: "text" },
          { key: "threadId", header: "Thread ID", type: "text" },
        ])
        .rows(response.data.drafts);

      return {
        text: `Found ${response.data.drafts.length} drafts`,
        data: response.data,
        ui: tableUI.build(),
      };
    } catch (error: any) {
      console.error("Error listing drafts:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to List Drafts")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to list draft emails",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { listDraftsConfig };
