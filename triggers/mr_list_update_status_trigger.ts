import { Trigger } from "deno-slack-api/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { MRListUpdateStatusWorkflow } from "../workflows/mr_list_update_status_workflow.ts";

/**
 * Trigger for updating MR list item status
 * This is a webhook trigger that can be invoked from external systems
 * Can use either item_id or item_name to identify the item
 */
const mrListUpdateStatusTrigger: Trigger<typeof MRListUpdateStatusWorkflow.definition> = {
  type: TriggerTypes.Webhook,
  name: "Update MR Item Status",
  description: "Updates the status of an MR list item and sends a reminder",
  workflow: "#/workflows/mr_list_update_status_workflow",
  inputs: {
    list_id: {
      value: "{{data.list_id}}",
    },
    item_id: {
      value: "{{data.item_id}}",
    },
    item_name: {
      value: "{{data.item_name}}",
    },
    status_key: {
      value: "{{data.status_key}}",
    },
    team_id: {
      value: "{{data.team_id}}",
    },
  },
};

export default mrListUpdateStatusTrigger;

