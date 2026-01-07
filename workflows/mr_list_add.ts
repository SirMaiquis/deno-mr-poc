import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { CheckListItemExistsFunction } from "../functions/check_list_item_exists.ts";
import { AddMRListItemFunction } from "../functions/add_mr_list_item.ts";
import { GetItemThreadByIdFunction } from "../functions/get_item_thread_by_id.ts";
import { PostMRItemReminderMessageFunction } from "../functions/post_mr_item_reminder_message.ts";
import { CheckConditionalFunction } from "../functions/check_conditional.ts";

/**
 * Workflow to add an MR list item with duplicate checking
 */
export const MRListAddWorkflow = DefineWorkflow({
  callback_id: "mr_list_workflow",
  title: "MR List Workflow",
  description: "Checks if an item exists, and if not, adds it to the list and posts a reminder",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      item_name: {
        type: Schema.types.string,
        description: "The name of the MR item",
      },
      ticket_link: {
        type: Schema.types.string,
        description: "The link to the ticket",
      },
      mr_link: {
        type: Schema.types.string,
        description: "The link to the MR",
      },
      assignee: {
        type: Schema.types.string,
        description: "The assignee email",
      },
      reviewers: {
        type: Schema.types.string,
        description: "Comma-separated reviewer emails",
      },
      team_id: {
        type: Schema.types.string,
        description: "The team/workspace ID",
      },
      notification_user_id: {
        type: Schema.slack.types.user_id,
        description: "User to notify if item already exists",
      },
    },
    required: ["list_id", "item_name", "ticket_link", "mr_link", "assignee", "team_id", "notification_user_id"],
  },
});

// Step 1: Check if the item exists
const checkItemStep = MRListAddWorkflow.addStep(
  CheckListItemExistsFunction,
  {
    list_id: MRListAddWorkflow.inputs.list_id,
    item_name: MRListAddWorkflow.inputs.item_name,
    team_id: MRListAddWorkflow.inputs.team_id,
  }
);

// Step 2: Check the conditional
const checkConditionalStep = MRListAddWorkflow.addStep(
  CheckConditionalFunction,
  {
    left: checkItemStep.outputs.exists,
    operator: "!=",
    right: true,
  }
);

// Step 3: If item doesn't exist, add it to the list
const addItemStep = MRListAddWorkflow.addStep(
  AddMRListItemFunction,
  {
    list_id: MRListAddWorkflow.inputs.list_id,
    name: MRListAddWorkflow.inputs.item_name,
    ticket_link: MRListAddWorkflow.inputs.ticket_link,
    mr_link: MRListAddWorkflow.inputs.mr_link,
    assignee: MRListAddWorkflow.inputs.assignee,
    reviewers: MRListAddWorkflow.inputs.reviewers,
    team_id: MRListAddWorkflow.inputs.team_id,
    conditional: checkConditionalStep.outputs.result,
  },
);

// Step 4: Get the thread ID for the newly added item
const getThreadStep = MRListAddWorkflow.addStep(
  GetItemThreadByIdFunction,
  {
    list_id: MRListAddWorkflow.inputs.list_id,
    item_id: addItemStep.outputs.item_id,
    conditional: checkConditionalStep.outputs.result,
  },
);

// Step 5: Post a reminder message to the thread
MRListAddWorkflow.addStep(
  PostMRItemReminderMessageFunction,
  {
    list_id: MRListAddWorkflow.inputs.list_id,
    item_id: addItemStep.outputs.item_id,
    thread_id: getThreadStep.outputs.thread_id,
    team_id: MRListAddWorkflow.inputs.team_id,
    conditional: checkConditionalStep.outputs.result,
  }
);

