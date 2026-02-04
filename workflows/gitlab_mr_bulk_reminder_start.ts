import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { GitlabMRBulkReminderStartFunction } from "../functions/gitlab_mr_bulk_reminder_start.ts";

export const GitlabMRBulkReminderStartWorkflow = DefineWorkflow({
  callback_id: "gitlab_mr_bulk_reminder_start_workflow",
  title: "Gitlab MR Bulk Reminder Start Workflow",
  description: "Starts the Gitlab MR bulk reminder workflow",
  input_parameters: {
    properties: {
    },
    required: [],
  },
}); 

const startBulkReminderStep = GitlabMRBulkReminderStartWorkflow.addStep(
  GitlabMRBulkReminderStartFunction,
  {}
);

export default GitlabMRBulkReminderStartWorkflow;