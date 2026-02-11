import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * Datastore to persist reminder state across app restarts.
 * 
 * Stores the last reminder/run timestamps per project so that
 * schedule checks (interval, hourly, daily, specific_times) survive
 * redeployments and process restarts.
 * 
 * Each item represents one project's reminder state.
 */
export const ReminderStateDatastore = DefineDatastore({
  name: "reminder_state",
  primary_key: "id",
  attributes: {
    /** Project name — used as the unique key */
    id: {
      type: Schema.types.string,
    },
    /** 
     * Timestamp (ms) of the last interval-type reminder sent.
     * Used only by the 'interval' schedule type.
     */
    last_reminder_time: {
      type: Schema.types.number,
    },
    /**
     * Timestamp (ms) of the last run for hourly/daily/specific_times schedules.
     * Used to enforce "enough time passed" and "already sent today" checks.
     */
    last_run_time: {
      type: Schema.types.number,
    },
  },
});
