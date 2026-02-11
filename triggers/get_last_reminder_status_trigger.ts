import { Trigger } from "deno-slack-api/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import GetLastReminderStatusWorkflow from "../workflows/get_last_reminder_status_workflow.ts";

/**
 * Link trigger (shortcut) for checking the last reminder status of a project.
 * 
 * After deploying, create the trigger with:
 *   slack trigger create --trigger-def triggers/get_last_reminder_status_trigger.ts
 * 
 * This generates a shortcut link that users can paste in any channel.
 * When clicked, it opens a form asking for the project name and responds
 * with the last reminder timestamp from the datastore.
 */
const getLastReminderStatusTrigger: Trigger<typeof GetLastReminderStatusWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "MR Reminder Status",
  description: "Check when the last reminder was sent for a project",
  workflow: "#/workflows/get_last_reminder_status_workflow",
  inputs: {
    interactivity: {
      value: "{{data.interactivity}}",
    },
    channel_id: {
      value: "{{data.channel_id}}",
    },
    user_id: {
      value: "{{data.user_id}}",
    },
  },
};

export default getLastReminderStatusTrigger;
