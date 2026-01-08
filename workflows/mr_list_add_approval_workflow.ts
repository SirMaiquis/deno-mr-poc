import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { AddApprovalToMRItemFunction } from "../functions/add_approval_to_mr_item.ts";

export const MRListAddApprovalWorkflow = DefineWorkflow({
  callback_id: "mr_list_add_approval_workflow",
  title: "Add Approval to MR Item",
  description: "Adds an approval to an MR list item and posts a reminder",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item",
      },
      user_email: {
        type: Schema.types.string,
        description: "The email of the user approving",
      },
      team_id: {
        type: Schema.types.string,
        description: "The team/workspace ID",
      },
    },
    required: ["list_id", "item_id", "user_email", "team_id"],
  },
});

const addApprovalStep = MRListAddApprovalWorkflow.addStep(
  AddApprovalToMRItemFunction,
  {
    list_id: MRListAddApprovalWorkflow.inputs.list_id,
    item_id: MRListAddApprovalWorkflow.inputs.item_id,
    user_email: MRListAddApprovalWorkflow.inputs.user_email,
    team_id: MRListAddApprovalWorkflow.inputs.team_id,
  }
);

