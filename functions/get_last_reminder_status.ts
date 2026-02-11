import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { ReminderStateDatastore } from "../datastores/reminder_state.ts";
import { PROJECTS_DATA } from "../config/constants.ts";

// ============================================================================
// FUNCTION DEFINITION
// ============================================================================

export const GetLastReminderStatusFunction = DefineFunction({
  callback_id: "get_last_reminder_status",
  title: "Get Last Reminder Status",
  description: "Queries the datastore and returns the last reminder time for a project",
  source_file: "functions/get_last_reminder_status.ts",
  input_parameters: {
    properties: {
      project_name: {
        type: Schema.types.string,
        description: "The project name to check",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "The user who requested the status",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "The channel to post the response in",
      },
    },
    required: ["project_name", "user_id", "channel_id"],
  },
  output_parameters: {
    properties: {
      message: {
        type: Schema.types.string,
        description: "The formatted status message",
      },
    },
    required: ["message"],
  },
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formats a timestamp (ms) into a human-readable string with relative time.
 */
function formatTimestamp(timestampMs: number, timezone: string): string {
  const date = new Date(timestampMs);
  const formatted = date.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const now = Date.now();
  const diffMs = now - timestampMs;
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative: string;
  if (diffMinutes < 1) {
    relative = "just now";
  } else if (diffMinutes < 60) {
    relative = `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    const remainingMinutes = diffMinutes % 60;
    relative = `${diffHours}h ${remainingMinutes}m ago`;
  } else {
    const remainingHours = diffHours % 24;
    relative = `${diffDays} day${diffDays === 1 ? "" : "s"}, ${remainingHours}h ago`;
  }

  return `${formatted} (_${relative}_)`;
}

/**
 * Returns a display-friendly schedule type description.
 */
function getScheduleDescription(project: typeof PROJECTS_DATA[string]): string {
  const schedule = project.reminderSchedule;
  if (!schedule.enabled) return ":no_entry_sign: Disabled";

  switch (schedule.type) {
    case "interval":
      return `:arrows_counterclockwise: Every ${schedule.intervalMinutes} minutes`;
    case "hourly": {
      const interval = schedule.intervalHours ?? 1;
      const minuteStr = String(schedule.minuteOfHour).padStart(2, "0");
      return interval === 1
        ? `:clock1: Hourly at :${minuteStr}`
        : `:clock1: Every ${interval} hours at :${minuteStr}`;
    }
    case "daily":
      return `:calendar: Daily at ${schedule.dailyTime}`;
    case "specific_times":
      return `:alarm_clock: At ${schedule.times.join(", ")}`;
    default:
      return "Unknown";
  }
}

// ============================================================================
// FUNCTION HANDLER
// ============================================================================

export default SlackFunction(
  GetLastReminderStatusFunction,
  async ({ inputs, client }) => {
    const { project_name, user_id, channel_id } = inputs;

    // --- Validate project name ---
    const projectData = PROJECTS_DATA[project_name];
    const availableProjects = Object.keys(PROJECTS_DATA).join(", ");

    if (!projectData) {
      const errorMessage =
        `:x: *Project not found:* \`${project_name}\`\n\n` +
        `*Available projects:* ${availableProjects}`;

      await client.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: errorMessage,
      });

      return { outputs: { message: errorMessage } };
    }

    // --- Query the datastore ---
    const result = await client.apps.datastore.get({
      datastore: ReminderStateDatastore.name,
      id: project_name,
    });

    const timezone = projectData.reminderSchedule.timezone;
    const scheduleDesc = getScheduleDescription(projectData);

    // --- Build the response ---
    let message: string;

    if (!result.ok || !result.item) {
      // No state yet — project has never been reminded
      message =
        `:mag: *Reminder Status for \`${project_name}\`*\n\n` +
        `> :gear: *Schedule:* ${scheduleDesc}\n` +
        `> :globe_with_meridians: *Timezone:* ${timezone}\n\n` +
        `:information_source: _No reminders have been sent yet for this project._`;
    } else {
      const item = result.item;
      const lines: string[] = [
        `:mag: *Reminder Status for \`${project_name}\`*\n`,
        `> :gear: *Schedule:* ${scheduleDesc}`,
        `> :globe_with_meridians: *Timezone:* ${timezone}\n`,
      ];

      if (item.last_reminder_time) {
        lines.push(
          `:arrow_right: *Last Interval Reminder:* ${formatTimestamp(item.last_reminder_time as number, timezone)}`
        );
      }

      if (item.last_run_time) {
        lines.push(
          `:arrow_right: *Last Scheduled Run:* ${formatTimestamp(item.last_run_time as number, timezone)}`
        );
      }

      if (!item.last_reminder_time && !item.last_run_time) {
        lines.push(
          `:information_source: _State record exists but no reminder timestamps recorded yet._`
        );
      }

      message = lines.join("\n");
    }

    // --- Send ephemeral message (visible only to the requesting user) ---
    await client.chat.postEphemeral({
      channel: channel_id,
      user: user_id,
      text: message,
    });

    return { outputs: { message } };
  }
);
