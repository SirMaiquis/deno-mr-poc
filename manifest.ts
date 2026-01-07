import { Manifest } from "deno-slack-sdk/mod.ts";
import { MRListAddWorkflow } from "./workflows/mr_list_add.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "deno-poc-mr-list",
  description:
    "A POC for adding MR list items to a Slack list",
  icon: "assets/default_new_app_icon.png",
  workflows: [MRListAddWorkflow],
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "lists:read",
    "lists:write",
    "users:read",
    "users.profile:read",
    "users:read.email",
    "channels:history",
    "groups:history",
    "mpim:history",
    "im:history",
    "channels:read",
  ],
});
