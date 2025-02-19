import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

const deleteLabelConfig: ToolConfig = {
  id: "delete-label",
  name: "Delete Label",
  description: "Immediately and permanently deletes the specified label and removes it from any messages and threads that it is applied to",
  input: z.object({
    labelId: z.string().describe("The ID of the label to delete"),
  }),
  output: z.any(),
  handler: async ({ labelId }, agentInfo, { app }) => {
    const tokens = getTokenStore().getToken(agentInfo.id);

    // Handle authentication
    if (!tokens) {
      const authUrl = await app.oauth2?.generateAuthUrl("google", agentInfo.id);
      if (!authUrl) {
        throw new Error("Failed to generate authentication URL");
      }
      const oauthUI = new OAuthUIBuilder()
        .title("Google Authentication")
        .content("Please authenticate with Google to delete labels")
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
      // Delete label via Gmail API
      await axios.delete(
        `https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      const alertUI = new AlertUIBuilder()
        .variant("success")
        .title("Label Deleted")
        .message(`Label ${labelId} has been permanently deleted`);

      return {
        text: "Label deleted successfully",
        data: { labelId },
        ui: alertUI.build(),
      };
    } catch (error: any) {
      console.error("Error deleting label:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Delete Label")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to delete label",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { deleteLabelConfig };
