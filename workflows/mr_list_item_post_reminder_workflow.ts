import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { GetItemThreadByIdFunction } from "../functions/get_item_thread_by_id.ts";
import { PostMRItemReminderMessageFunction } from "../functions/post_mr_item_reminder_message.ts";

/**
 * Workflow to post a reminder message for an MR list item
 */
export const MRListItemPostReminderWorkflow = DefineWorkflow({
  callback_id: "mr_list_item_post_reminder_workflow",
  title: "Post MR Item Reminder",
  description: "Posts a reminder message for an MR list item",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item to post reminder for",
      },
      team_id: {
        type: Schema.types.string,
        description: "The team/workspace ID",
      },
    },
    required: ["list_id", "item_id", "team_id"],
  },
});

// Step 1: Get the thread ID for the item
const getThreadStep = MRListItemPostReminderWorkflow.addStep(
  GetItemThreadByIdFunction,
  {
    list_id: MRListItemPostReminderWorkflow.inputs.list_id,
    item_id: MRListItemPostReminderWorkflow.inputs.item_id,
  }
);

// Step 2: Post a reminder message to the thread
MRListItemPostReminderWorkflow.addStep(
  PostMRItemReminderMessageFunction,
  {
    list_id: MRListItemPostReminderWorkflow.inputs.list_id,
    item_id: MRListItemPostReminderWorkflow.inputs.item_id,
    thread_id: getThreadStep.outputs.thread_id,
    team_id: MRListItemPostReminderWorkflow.inputs.team_id,
  }
);

