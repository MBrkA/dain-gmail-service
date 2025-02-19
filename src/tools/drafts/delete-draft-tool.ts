import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const deleteDraftConfig: ToolConfig = {
  id: "delete-draft",
  name: "Delete Draft Email",
  description: "Permanently delete a draft email from Gmail",
  input: z.object({
    draftId: z.string().describe("The ID of the draft to delete"),
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
        .content("Please authenticate with Google to delete drafts")
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
      // Delete draft via Gmail API
      await axios.delete(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      const cardUI = new CardUIBuilder()
        .title("Draft Deleted")
        .content(`Draft ID ${draftId} has been permanently deleted`);

      return {
        text: "Draft email deleted successfully",
        data: { draftId },
        ui: cardUI.build(),
      };
    } catch (error: any) {
      console.error("Error deleting draft:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Delete Draft")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to delete draft email",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { deleteDraftConfig };
