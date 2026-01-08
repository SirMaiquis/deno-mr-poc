import { Trigger } from "deno-slack-api/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { MRListAddApprovalWorkflow } from "../workflows/mr_list_add_approval_workflow.ts";

const mrListAddApprovalTrigger: Trigger<typeof MRListAddApprovalWorkflow.definition> = {
  type: TriggerTypes.Webhook,
  name: "Add Approval to MR Item",
  description: "Adds an approval to an MR list item and sends a reminder",
  workflow: "#/workflows/mr_list_add_approval_workflow",
  inputs: {
    list_id: {
      value: "{{data.list_id}}",
    },
    item_id: {
      value: "{{data.item_id}}",
    },
    user_email: {
      value: "{{data.user_email}}",
    },
    team_id: {
      value: "{{data.team_id}}",
    },
  },
};

export default mrListAddApprovalTrigger;

