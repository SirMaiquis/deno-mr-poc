import { STATUS_VALUES } from "./column_ids.ts";
import { formatMentions } from "../shared/message_utils.ts";

export const STATUS_WITH_REMINDERS = [
  STATUS_VALUES.PENDING_COMMENTS,
  STATUS_VALUES.READY_FOR_REVIEW,
  STATUS_VALUES.CONFLICTS_ISSUES,
  STATUS_VALUES.READY_TO_MERGE,
];

export const REMINDER_MESSAGES = {
  [STATUS_VALUES.PENDING_COMMENTS]: "This merge has pending comments, please review it. cc: @{{assignee}}",
  [STATUS_VALUES.READY_FOR_REVIEW]: "This merge is ready to review, please review it. cc: @{{reviewers}}",
  [STATUS_VALUES.CONFLICTS_ISSUES]: "This merge has conflicts/issues, please review it. cc: @{{assignee}}",
  [STATUS_VALUES.READY_TO_MERGE]: "This merge is ready to merge, you can proceed to merge it. cc: @{{assignee}}",
} as Record<typeof STATUS_WITH_REMINDERS[number], string>;

export const getReminderMessage = (
  status: string,
  assignee: string,
  reviewers: string[]
): string | null => {
  const statusHasReminder = STATUS_WITH_REMINDERS.includes(status);
  if (!statusHasReminder) return null;
  const message = REMINDER_MESSAGES[status];
  if (!message) return null;
  
  let formattedMessage = message;
  
  if (assignee) {
    formattedMessage = formattedMessage.replace("@{{assignee}}", formatMentions([assignee]));
  }
  
  if (reviewers.length > 0) {
    formattedMessage = formattedMessage.replace("@{{reviewers}}", formatMentions(reviewers));
  }

  return formattedMessage;
};