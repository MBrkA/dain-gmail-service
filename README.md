# Gmail Integration Service

This service provides integration with Gmail API, allowing you to manage emails, drafts and labels through DAIN Protocol.

## Available Tools

### Draft Management
- `create-draft`: Create a new draft email
- `delete-draft`: Delete an existing draft
- `get-draft`: Get details of a specific draft
- `list-drafts`: List all draft emails
- `update-draft`: Update an existing draft

### Message Management
- `list-messages`: List messages in the mailbox
- `get-message`: Get details of a specific message
- `modify-message`: Modify labels on a message
- `send-message`: Send a new email message
- `trash-message`: Move a message to trash
- `untrash-message`: Remove a message from trash

### Label Management
- `list-labels`: List all labels in the mailbox
- `create-label`: Create a new label
- `update-label`: Update an existing label
- `delete-label`: Delete a label

## Authentication

This service uses OAuth2 authentication with Google. You'll need to:

1. Set up Google OAuth2 credentials
2. Configure the following environment variables:
   - `DAIN_API_KEY`: Your DAIN Protocol API key
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
   - `TUNNEL_URL`: Your tunnel URL (defaults to http://localhost:2022)

## Required Scopes

The service requires the following Google OAuth scopes:
- `https://www.googleapis.com/auth/gmail.compose`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.labels`
- `email`
- `profile`

## Development

