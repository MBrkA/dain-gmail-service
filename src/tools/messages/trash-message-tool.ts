import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const trashMessageConfig: ToolConfig = {
  id: "trash-message",
  name: "Trash Message",
  description: "Moves the specified message to the trash",
  input: z.object({
    messageId: z.string().describe("The ID of the message to move to trash"),
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
        .content("Please authenticate with Google to trash messages")
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
      // Move message to trash via Gmail API
      const response = await axios.post(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
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
        .title("Message labels modified successfully")
        .message("Message labels modified successfully");

      return {
        text: "Message moved to trash successfully",
        data: message,
        ui: alertUI.build(),
      };
    } catch (error: any) {
      console.error("Error trashing message:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Trash Message")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to move message to trash",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { trashMessageConfig };
