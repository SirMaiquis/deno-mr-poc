import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { GetLastReminderStatusFunction } from "../functions/get_last_reminder_status.ts";

/**
 * Workflow that allows a user to check the last reminder status of a project.
 * 
 * Flow:
 *   1. User invokes the link trigger (shortcut)
 *   2. A form opens asking for the project name
 *   3. The function queries the datastore and sends an ephemeral response
 */
export const GetLastReminderStatusWorkflow = DefineWorkflow({
  callback_id: "get_last_reminder_status_workflow",
  title: "MR Reminder Status",
  description: "Check the last reminder time for a project",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
      },
      user_id: {
        type: Schema.slack.types.user_id,
      },
    },
    required: ["interactivity"],
  },
});

// Step 1: Open a form to collect the project name
const formStep = GetLastReminderStatusWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "MR Reminder Status",
    interactivity: GetLastReminderStatusWorkflow.inputs.interactivity,
    submit_label: "Check",
    description: "Check when the last reminder was sent for a project.",
    fields: {
      elements: [
        {
          name: "project_name",
          title: "Project Name",
          type: Schema.types.string,
          description: "Enter the exact project name (e.g. usi-module, Slack webooks)",
        },
      ],
      required: ["project_name"],
    },
  },
);

// Step 2: Query the datastore and send the result
GetLastReminderStatusWorkflow.addStep(
  GetLastReminderStatusFunction,
  {
    project_name: formStep.outputs.fields.project_name,
    user_id: GetLastReminderStatusWorkflow.inputs.user_id,
    channel_id: GetLastReminderStatusWorkflow.inputs.channel_id,
  },
);

export default GetLastReminderStatusWorkflow;
