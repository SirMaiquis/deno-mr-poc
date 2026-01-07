import { Trigger } from "deno-slack-api/types.ts";
import { MRListAddWorkflow } from "../workflows/mr_list_add.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";

const mrListAddTrigger: Trigger<typeof MRListAddWorkflow.definition> = {
  type: TriggerTypes.Webhook,
  name: "Add MR List Item",
  description: "Adds an item to a Slack list",
  workflow: "#/workflows/mr_list_workflow",
  inputs: {
    list_id: {
      value: "{{data.list_id}}",
    },
    item_name: {
      value: "{{data.item_name}}",
    },
    ticket_link: {
      value: "{{data.ticket_link}}",
    },
    mr_link: {
      value: "{{data.mr_link}}",
    },
    assignee: {
      value: "{{data.assignee}}",
    },
    reviewers: {
      value: "{{data.reviewers}}",
    },
    team_id: {
      value: "{{data.team_id}}",
    },
    notification_user_id: {
      value: "{{data.notification_user_id}}",
    },
  },
};

export default mrListAddTrigger;