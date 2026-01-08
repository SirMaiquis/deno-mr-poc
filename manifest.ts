import { Manifest } from "deno-slack-sdk/mod.ts";
import { MRListAddWorkflow } from "./workflows/mr_list_add.ts";
import { MRListUpdateStatusWorkflow } from "./workflows/mr_list_update_status_workflow.ts";
import { MRListItemPostReminderWorkflow } from "./workflows/mr_list_item_post_reminder_workflow.ts";
import { MRListAddApprovalWorkflow } from "./workflows/mr_list_add_approval_workflow.ts";
import { MRListBulkPostRemindersWorkflow } from "./workflows/mr_list_bulk_post_reminders_workflow.ts";

export default Manifest({
  name: "deno-poc-mr-list",
  description:
    "A POC for adding MR list items to a Slack list",
  icon: "assets/default_new_app_icon.png",
  workflows: [
    MRListAddWorkflow,
    MRListUpdateStatusWorkflow,
    MRListItemPostReminderWorkflow,
    MRListAddApprovalWorkflow,
    MRListBulkPostRemindersWorkflow,
  ],
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
