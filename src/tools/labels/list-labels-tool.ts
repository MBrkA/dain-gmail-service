import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  TableUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const listLabelsConfig: ToolConfig = {
  id: "list-labels",
  name: "List Labels",
  description: "Lists all labels in the user's mailbox",
  input: z.object({}),
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
        .content("Please authenticate with Google to view labels")
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
      // List labels via Gmail API
      const response = await axios.get(
        "https://gmail.googleapis.com/gmail/v1/users/me/labels",
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      if (!response.data.labels || response.data.labels.length === 0) {
        const alertUI = new AlertUIBuilder()
          .variant("info")
          .title("No Labels Found")
          .message("There are no labels in your Gmail account");

        return {
          text: "No labels found",
          data: response.data,
          ui: alertUI.build(),
        };
      }

      // Create table UI with label information
      const tableUI = new TableUIBuilder()
        .addColumns([
          { key: "id", header: "Label ID", type: "text" },
          { key: "name", header: "Name", type: "text" },
          { key: "type", header: "Type", type: "text" },
          { key: "messageListVisibility", header: "Message List Visibility", type: "text" },
          { key: "labelListVisibility", header: "Label List Visibility", type: "text" },
        ])
        .rows(response.data.labels);

      return {
        text: `Found ${response.data.labels.length} labels`,
        data: response.data,
        ui: tableUI.build(),
      };
    } catch (error: any) {
      console.error("Error listing labels:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to List Labels")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to list labels",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { listLabelsConfig };
