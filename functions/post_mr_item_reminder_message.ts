import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import {
  listIdToChannelId,
  getItemInfo,
  getColumnByName,
  getFieldValue,
  getPendingReviewers,
} from "../shared/list_utils.ts";
import { COLUMN_NAMES } from "../constants/column_ids.ts";
import { getReminderMessage } from "../constants/reminder_messages.ts";

export const PostMRItemReminderMessageFunction = DefineFunction({
  callback_id: "post_mr_item_reminder_message",
  title: "Post MR Item Reminder Message",
  description: "Posts a reminder message to a Slack channel",
  source_file: "functions/post_mr_item_reminder_message.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item",
      },
      thread_id: {
        type: Schema.types.string,
        description: "The ID of the thread",
      },
      team_id: {
        type: Schema.types.string,
        description: "The team ID",
      },
      conditional: {
        type: Schema.types.boolean,
        description: "Whether to execute this function",
        default: true,
      },
    },
    required: ["list_id", "item_id", "thread_id"],
  },
});

/**
 * Extracts the assignee user ID from item info
 */
const getAssignee = (itemInfo: any): string | null => {
  const schema = itemInfo.list.list_metadata.schema;
  const assigneeColumn = getColumnByName(schema, COLUMN_NAMES.ASSIGNEE);
  const assigneeField = getFieldValue(itemInfo, assigneeColumn.id);
  return assigneeField?.user || null;
};

/**
 * Extracts the status label from item info
 */
const getStatusLabel = (itemInfo: any): string | null => {
  const schema = itemInfo.list.list_metadata.schema;
  const statusColumn = getColumnByName(schema, COLUMN_NAMES.STATUS);
  const statusField = getFieldValue(itemInfo, statusColumn.id);
  const statusOption = statusColumn.options.choices.find(
    (option: any) => option.value === statusField?.value
  );
  return statusOption?.label || null;
};

/**
 * Posts a reminder message to a Slack thread
 */
const postReminderToThread = async (
  client: any,
  channelId: string,
  threadId: string,
  message: string
): Promise<void> => {
  const response = await client.apiCall("chat.postMessage", {
    channel: channelId,
    thread_ts: threadId,
    markdown_text: message,
  });

  if (!response.ok) {
    throw new Error(`Failed to post message: ${JSON.stringify(response)}`);
  }
};

export default SlackFunction(
  PostMRItemReminderMessageFunction,
  async ({ inputs, client }) => {
    const { list_id, item_id, thread_id, conditional } = inputs;

    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      const itemInfo = await getItemInfo(client, list_id, item_id);
      const pendingReviewers = getPendingReviewers(itemInfo);
      const assignee = getAssignee(itemInfo);
      const statusLabel = getStatusLabel(itemInfo);

      if (!statusLabel) {
        return { outputs: { success: false, error: "No status label found" } };
      }

      const reminderMessage = getReminderMessage(statusLabel, assignee || "", pendingReviewers);
      if (!reminderMessage) {
        return { outputs: { success: true } };
      }

      const channelId = listIdToChannelId(list_id);
      await postReminderToThread(client, channelId, thread_id, reminderMessage);

      return { outputs: { success: true } };
    } catch (error: any) {
      return { error: `Error posting reminder: ${error.message}` };
    }
  }
);
