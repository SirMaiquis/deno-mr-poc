import { Manifest } from "deno-slack-sdk/mod.ts";
import { MRListAddWorkflow } from "./workflows/mr_list_add.ts";
import { MRListUpdateStatusWorkflow } from "./workflows/mr_list_update_status_workflow.ts";
import { MRListItemPostReminderWorkflow } from "./workflows/mr_list_item_post_reminder_workflow.ts";

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
  workflows: [MRListAddWorkflow, MRListUpdateStatusWorkflow, MRListItemPostReminderWorkflow],
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
