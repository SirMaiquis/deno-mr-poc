import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { checkAndSendReminders } from "../sertvices/reminder.service.ts";

export const GitlabMRBulkReminderStartFunction = DefineFunction({
  callback_id: "gitlab_mr_bulk_reminder_start",
  title: "Gitlab MR Bulk Reminder Start",
  description: "Starts the Gitlab MR bulk reminder workflow",
  source_file: "functions/gitlab_mr_bulk_reminder_start.ts",
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the Gitlab MR webhook was received successfully",
      },
    },
    required: ["success"],
  },
});

export default SlackFunction(
  GitlabMRBulkReminderStartFunction,
  async ({ client }) => {

    try {
      await checkAndSendReminders(client);
      return { outputs: { success: true } };
    } catch (error) {
      console.error('Error starting Gitlab MR bulk reminder workflow:', error);
      return { error: `Error starting Gitlab MR bulk reminder workflow: ${error.message}` };
    }
  }
);


