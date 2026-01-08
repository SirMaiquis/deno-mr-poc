import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { BulkPostMRListRemindersFunction } from "../functions/bulk_post_mr_list_reminders.ts";

/**
 * Workflow to bulk post reminder messages for all MR list items with pending reviewers
 */
export const MRListBulkPostRemindersWorkflow = DefineWorkflow({
  callback_id: "mr_list_bulk_post_reminders_workflow",
  title: "Bulk Post MR List Reminders",
  description: "Gets all list items and posts reminders for items with pending reviewers",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      team_id: {
        type: Schema.types.string,
        description: "The team/workspace ID",
      },
    },
    required: ["list_id"],
  },
});

// Step 1: Bulk post reminders for all items with pending reviewers
MRListBulkPostRemindersWorkflow.addStep(
  BulkPostMRListRemindersFunction,
  {
    list_id: MRListBulkPostRemindersWorkflow.inputs.list_id,
    team_id: MRListBulkPostRemindersWorkflow.inputs.team_id,
  }
);

