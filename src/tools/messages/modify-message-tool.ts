import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const modifyMessageConfig: ToolConfig = {
  id: "modify-message",
  name: "Modify Message Labels",
  description: "Modifies the labels on a specified message",
  input: z.object({
    messageId: z.string().describe("The ID of the message to modify"),
    addLabelIds: z.array(z.string()).optional().describe("List of label IDs to add to the message"),
    removeLabelIds: z.array(z.string()).optional().describe("List of label IDs to remove from the message"),
  }),
  output: z.any(),
  handler: async ({ messageId, addLabelIds, removeLabelIds }, agentInfo, { app }) => {
    const tokens = getTokenStore().getToken(agentInfo.id);

    // Handle authentication
    if (!tokens) {
      const authUrl = await app.oauth2?.generateAuthUrl("google", agentInfo.id);
      if (!authUrl) {
        throw new Error("Failed to generate authentication URL");
      }
      const oauthUI = new OAuthUIBuilder()
        .title("Google Authentication")
        .content("Please authenticate with Google to modify message labels")
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
      // Modify message via Gmail API
      const response = await axios.post(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
          addLabelIds,
          removeLabelIds,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const message = response.data;
      const alertUI = new AlertUIBuilder()
        .variant("success")
        .title("Message labels modified successfully")
        .message("Message labels modified successfully");
      
      return {
        text: "Message labels modified successfully",
        data: message,
        ui: alertUI.build(),
      };
    } catch (error: any) {
      console.error("Error modifying message:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Modify Message Labels")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to modify message labels",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { modifyMessageConfig };
