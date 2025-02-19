import { createOAuth2Tool, defineDAINService } from "@dainprotocol/service-sdk";
import { getTokenStore } from "./token-store";
import { createDraftConfig } from "./tools/drafts/create-draft-tool";
import { deleteDraftConfig } from "./tools/drafts/delete-draft-tool";
import { getDraftConfig } from "./tools/drafts/get-draft-tool";
import { listDraftsConfig } from "./tools/drafts/list-drafts-tool";
import { sendDraftConfig } from "./tools/drafts/send-draft-tool";
import { updateDraftConfig } from "./tools/drafts/update-draft-tool";
import { listMessagesConfig } from "./tools/messages/list-messages-tool";

export const dainService = defineDAINService({
  metadata: {
    title: "Gmail Draft Creator",
    description: "Create email drafts using Gmail API",
    version: "1.0.0",
    author: "DAIN",
    tags: ["gmail", "draft", "email"],
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
    //sendDraftConfig,
    updateDraftConfig,
    listMessagesConfig
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
