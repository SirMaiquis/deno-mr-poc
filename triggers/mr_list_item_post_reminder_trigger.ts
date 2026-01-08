import { Trigger } from "deno-slack-api/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { MRListItemPostReminderWorkflow } from "../workflows/mr_list_item_post_reminder_workflow.ts";

/**
 * Trigger for posting a reminder for an MR list item
 * This is a webhook trigger that can be invoked from external systems
 */
const mrListItemPostReminderTrigger: Trigger<typeof MRListItemPostReminderWorkflow.definition> = {
  type: TriggerTypes.Webhook,
  name: "Post MR Item Reminder",
  description: "Posts a reminder message for an MR list item",
  workflow: "#/workflows/mr_list_item_post_reminder_workflow",
  inputs: {
    list_id: {
      value: "{{data.list_id}}",
    },
    item_id: {
      value: "{{data.item_id}}",
    },
    team_id: {
      value: "{{data.team_id}}",
    },
  },
};

export default mrListItemPostReminderTrigger;

