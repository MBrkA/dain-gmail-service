import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const untrashMailConfig: ToolConfig = {
  id: "untrash-mail",
  name: "Untrash Mail", 
  description: "Removes the specified message from the trash",
  input: z.object({
    messageId: z.string().describe("The ID of the message to remove from trash"),
  }),
  output: z.any(),
  handler: async ({ messageId }, agentInfo, { app }) => {
    const tokens = getTokenStore().getToken(agentInfo.id);

    // Handle authentication
    if (!tokens) {
      const authUrl = await app.oauth2?.generateAuthUrl("google", agentInfo.id);
      if (!authUrl) {
        throw new Error("Failed to generate authentication URL");
      }
      const oauthUI = new OAuthUIBuilder()
        .title("Google Authentication")
        .content("Please authenticate with Google to untrash messages")
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
      // Remove message from trash via Gmail API
      const response = await axios.post(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/untrash`,
        {},
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      const message = response.data;
      const alertUI = new AlertUIBuilder()
        .variant("success")
        .title("Message removed from trash successfully")
        .message("Message removed from trash successfully");

      return {
        text: "Message removed from trash successfully",
        data: message,
        ui: alertUI.build(),
      };
    } catch (error: any) {
      console.error("Error untrashing message:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Untrash Message")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to remove message from trash",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { untrashMailConfig };
