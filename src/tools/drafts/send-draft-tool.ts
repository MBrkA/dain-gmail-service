import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const sendDraftConfig: ToolConfig = {
  id: "send-draft",
  name: "Send Draft Email",
  description: "Send an existing draft email to recipients",
  input: z.object({
    draftId: z.string().describe("The ID of the draft to send"),
  }),
  output: z.any(),
  handler: async ({ draftId }, agentInfo, { app }) => {
    const tokens = getTokenStore().getToken(agentInfo.id);

    // Handle authentication
    if (!tokens) {
      const authUrl = await app.oauth2?.generateAuthUrl("google", agentInfo.id);
      if (!authUrl) {
        throw new Error("Failed to generate authentication URL");
      }
      const oauthUI = new OAuthUIBuilder()
        .title("Google Authentication")
        .content("Please authenticate with Google to send drafts")
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
      // Send draft via Gmail API
      const response = await axios.post(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}/send`,
        {
          id: draftId,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const cardUI = new CardUIBuilder()
        .title("Draft Sent")
        .content(`Draft ID ${draftId} has been sent successfully`);

      return {
        text: "Draft email sent successfully",
        data: response.data,
        ui: cardUI.build(),
      };
    } catch (error: any) {
      console.error("Error sending draft:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Send Draft")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to send draft email",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { sendDraftConfig };
