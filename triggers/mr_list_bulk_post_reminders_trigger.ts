import { Trigger } from "deno-slack-api/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { MRListBulkPostRemindersWorkflow } from "../workflows/mr_list_bulk_post_reminders_workflow.ts";

/**
 * Trigger for bulk posting reminders for all MR list items with pending reviewers
 * This is a webhook trigger that can be invoked from external systems
 */
const mrListBulkPostRemindersTrigger: Trigger<typeof MRListBulkPostRemindersWorkflow.definition> = {
  type: TriggerTypes.Webhook,
  name: "Bulk Post MR List Reminders",
  description: "Gets all list items and posts reminders for items with pending reviewers",
  workflow: "#/workflows/mr_list_bulk_post_reminders_workflow",
  inputs: {
    list_id: {
      value: "{{data.list_id}}",
    },
    team_id: {
      value: "{{data.team_id}}",
    },
  },
};

export default mrListBulkPostRemindersTrigger;

