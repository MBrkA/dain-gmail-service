import { createOAuth2Tool, defineDAINService } from "@dainprotocol/service-sdk";
import { getTokenStore } from "./token-store";
import { createDraftConfig } from "./tools/drafts/create-draft-tool";
import { deleteDraftConfig } from "./tools/drafts/delete-draft-tool";
import { getDraftConfig } from "./tools/drafts/get-draft-tool";
import { listDraftsConfig } from "./tools/drafts/list-drafts-tool";
import { updateDraftConfig } from "./tools/drafts/update-draft-tool";
import { listMessagesConfig } from "./tools/messages/list-messages-tool";
import { getMessageConfig } from "./tools/messages/get-message-tool";
import { modifyMessageConfig } from "./tools/messages/modify-message-tool";
import { sendMailConfig } from "./tools/messages/send-mail-tool";
import { trashMessageConfig } from "./tools/messages/trash-message-tool";
import { untrashMessageConfig } from "./tools/messages/untrash-message-tool";
import { listLabelsConfig } from "./tools/labels/list-labels-tool";
import { createLabelConfig } from "./tools/labels/create-label-tool";
import { updateLabelConfig } from "./tools/labels/update-label-tool";
import { deleteLabelConfig } from "./tools/labels/delete-label-tool";

export const dainService = defineDAINService({
  metadata: {
    title: "Gmail Service",
    description: "Gmail integration service for managing emails, drafts and labels",
    version: "1.0.0",
    author: "DAIN",
    tags: ["gmail", "email", "labels"],
    logo: "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png",
  },
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [
    createOAuth2Tool("google"),
    createDraftConfig,
    deleteDraftConfig,
    getDraftConfig,
    listDraftsConfig,
    updateDraftConfig,
    listMessagesConfig,
    getMessageConfig,
    trashMessageConfig,
    untrashMessageConfig,
    modifyMessageConfig,
    sendMailConfig,
    listLabelsConfig,
    createLabelConfig,
    updateLabelConfig,
    deleteLabelConfig,
  ],
  oauth2: {
    baseUrl: process.env.TUNNEL_URL || "http://localhost:2022",
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
          "https://www.googleapis.com/auth/gmail.compose",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/gmail.labels",
          "email",
          "profile",
        ],
        onSuccess: async (agentId, tokens) => {
          console.log("Completed OAuth flow for agent", agentId);
          getTokenStore().setToken(agentId, tokens);
          console.log(`Stored tokens for agent ${agentId}`);
        },
      },
    },
  },
});
