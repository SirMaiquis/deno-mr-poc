import { Trigger } from "deno-slack-api/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import GitlabMRBulkReminderStartWorkflow from "../workflows/gitlab_mr_bulk_reminder_start.ts";

const gitlabMRBulkReminderStartTrigger: Trigger<typeof GitlabMRBulkReminderStartWorkflow.definition> = {
  type: TriggerTypes.Scheduled,
  name: "Start Gitlab MR Bulk Reminder",
  description: "Starts the Gitlab MR bulk reminder workflow",
  workflow: "#/workflows/gitlab_mr_bulk_reminder_start_workflow",
  inputs: {},
  schedule: {
    start_time: (() => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setSeconds(0, 0);
      nextHour.setMilliseconds(0);
      if (nextHour <= now) nextHour.setHours(nextHour.getHours() + 1);
      return nextHour.toISOString();
    })(),
    end_time: "2040-05-01T14:00:00Z",
    frequency: {
      type: "hourly",
      repeats_every: 1,
    },
  },
};

export default gitlabMRBulkReminderStartTrigger;

