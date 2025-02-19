import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { getTokenStore } from "../../token-store";
import axios from "axios";

import {
  AlertUIBuilder,
  CardUIBuilder,
  OAuthUIBuilder,
} from "@dainprotocol/utils";

// Define color schema
const ColorSchema = z.object({
  textColor: z.string().describe("The text color of the label as hex string (e.g. #000000)"),
  backgroundColor: z.string().describe("The background color of the label as hex string (e.g. #ffffff)"),
});

// Define input schema
const InputSchema = z.object({
  name: z.string().describe("The display name of the label"),
  messageListVisibility: z.enum(["show", "hide"])
    .describe("The visibility of messages with this label in the message list"),
  labelListVisibility: z.enum(["labelShow", "labelShowIfUnread", "labelHide"])
    .describe("The visibility of the label in the label list"),
  color: ColorSchema.optional()
    .describe("Optional color settings for the label"),
});

const createLabelConfig: ToolConfig = {
  id: "create-label",
  name: "Create Label",
  description: "Creates a new label in Gmail",
  input: InputSchema,
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
        .content("Please authenticate with Google to create labels")
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
      // Create label via Gmail API
      const response = await axios.post(
        "https://gmail.googleapis.com/gmail/v1/users/me/labels",
        {
          name: input.name,
          messageListVisibility: input.messageListVisibility,
          labelListVisibility: input.labelListVisibility,
          color: input.color,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const label = response.data;
      const cardUI = new CardUIBuilder()
        .title("Label Created")
        .content(`
          Label Name: ${label.name}
          ID: ${label.id}
          Message List Visibility: ${label.messageListVisibility}
          Label List Visibility: ${label.labelListVisibility}
          ${label.color ? `Colors: 
            Text: ${label.color.textColor}
            Background: ${label.color.backgroundColor}` : ''}
        `);

      return {
        text: "Label created successfully",
        data: label,
        ui: cardUI.build(),
      };
    } catch (error: any) {
      console.error("Error creating label:", error.response?.data || error);

      const alertUI = new AlertUIBuilder()
        .variant("error")
        .title("Failed to Create Label")
        .message(
          error.response?.data?.error?.message || "An unknown error occurred"
        );

      return {
        text: "Failed to create label",
        data: undefined,
        ui: alertUI.build(),
      };
    }
  },
};

export { createLabelConfig };
