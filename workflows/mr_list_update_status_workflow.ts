import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { UpdateMRItemStatusFunction } from "../functions/update_mr_item_status.ts";
import { GetItemThreadByIdFunction } from "../functions/get_item_thread_by_id.ts";
import { PostMRItemReminderMessageFunction } from "../functions/post_mr_item_reminder_message.ts";

/**
 * Workflow to update the status of an MR list item and post a reminder
 */
export const MRListUpdateStatusWorkflow = DefineWorkflow({
  callback_id: "mr_list_update_status_workflow",
  title: "Update MR List Item Status",
  description: "Updates the status of an MR list item and posts a reminder message",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item to update",
      },
      status_key: {
        type: Schema.types.string,
        description: "The status key/option ID to set",
      },
      team_id: {
        type: Schema.types.string,
        description: "The team/workspace ID",
      },
    },
    required: ["list_id", "item_id", "status_key", "team_id"],
  },
});

// Step 1: Update the item status
const updateStatusStep = MRListUpdateStatusWorkflow.addStep(
  UpdateMRItemStatusFunction,
  {
    list_id: MRListUpdateStatusWorkflow.inputs.list_id,
    item_id: MRListUpdateStatusWorkflow.inputs.item_id,
    status_key: MRListUpdateStatusWorkflow.inputs.status_key,
    team_id: MRListUpdateStatusWorkflow.inputs.team_id,
  }
);

// Step 2: Get the thread ID for the item
const getThreadStep = MRListUpdateStatusWorkflow.addStep(
  GetItemThreadByIdFunction,
  {
    list_id: MRListUpdateStatusWorkflow.inputs.list_id,
    item_id: MRListUpdateStatusWorkflow.inputs.item_id,
  }
);

// Step 3: Post a reminder message to the thread
MRListUpdateStatusWorkflow.addStep(
  PostMRItemReminderMessageFunction,
  {
    list_id: MRListUpdateStatusWorkflow.inputs.list_id,
    item_id: MRListUpdateStatusWorkflow.inputs.item_id,
    thread_id: getThreadStep.outputs.thread_id,
    team_id: MRListUpdateStatusWorkflow.inputs.team_id,
  }
);

