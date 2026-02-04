import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import {
  listIdToChannelId,
  getItemInfo,
  getColumnByName,
  getFieldValue,
  getPendingReviewers,
} from "../shared/list_utils.ts";
import { getThreadId } from "../shared/message_utils.ts";
import { COLUMN_NAMES } from "../constants/column_ids.ts";
import { getReminderMessage } from "../constants/reminder_messages.ts";

export const BulkPostMRListRemindersFunction = DefineFunction({
  callback_id: "bulk_post_mr_list_reminders",
  title: "Bulk Post MR List Reminders",
  description: "Gets all list items and posts reminders using the same logic as single-item reminders (status, assignee, pending reviewers)",
  source_file: "functions/bulk_post_mr_list_reminders.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
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
    required: ["list_id"],
  },
  output_parameters: {
    properties: {
      items_processed: {
        type: Schema.types.number,
        description: "Number of items processed",
      },
      reminders_sent: {
        type: Schema.types.number,
        description: "Number of reminders sent",
      },
    },
    required: ["items_processed", "reminders_sent"],
  },
});

/**
 * Extracts the assignee user ID from item info (same as post_mr_item_reminder_message)
 */
const getAssignee = (itemInfo: any): string | null => {
  const schema = itemInfo.list.list_metadata.schema;
  const assigneeColumn = getColumnByName(schema, COLUMN_NAMES.ASSIGNEE);
  const assigneeField = getFieldValue(itemInfo, assigneeColumn.id);
  return assigneeField?.user || null;
};

/**
 * Extracts the status label from item info (same as post_mr_item_reminder_message)
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
 * Posts a reminder message to a Slack thread (same as post_mr_item_reminder_message)
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

/**
 * Fetches all items from a Slack list
 */
const getAllListItems = async (
  client: any,
  listId: string,
  teamId?: string
): Promise<any[]> => {
  const apiParams: any = { list_id: listId, limit: 1000 };
  if (teamId) apiParams.team_id = teamId;

  console.log("getAllListItems apiParams", JSON.stringify(apiParams));
  const listResponse = await client.apiCall("slackLists.items.list", apiParams);
  console.log("getAllListItems listResponse", JSON.stringify(listResponse));
  if (!listResponse.ok) {
    throw new Error(`Failed to fetch list items: ${listResponse.error}`);
  }

  return listResponse.items || [];
};

/**
 * Processes a single item and posts a reminder using the same logic as post_mr_item_reminder_message:
 * status label, assignee, pending reviewers → getReminderMessage → post to thread if message exists
 */
const processItemReminder = async (
  client: any,
  listId: string,
  item: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    const itemInfo = await getItemInfo(client, listId, item.id);
    const pendingReviewers = getPendingReviewers(itemInfo);
    const assignee = getAssignee(itemInfo);
    const statusLabel = getStatusLabel(itemInfo);

    if (!statusLabel) {
      return { success: false };
    }

    const reminderMessage = getReminderMessage(
      statusLabel,
      assignee || "",
      pendingReviewers
    );

    if (!reminderMessage) {
      return { success: false };
    }

    const itemTimestamp = String(itemInfo.record.updated_timestamp);
    const threadId = await getThreadId(client, listId, item.id, itemTimestamp);
    const channelId = listIdToChannelId(listId);

    await postReminderToThread(client, channelId, threadId, reminderMessage);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Error processing item ${item.id}: ${error.message}`,
    };
  }
};

export default SlackFunction(
  BulkPostMRListRemindersFunction,
  async ({ inputs, client }) => {
    const { list_id, team_id, conditional } = inputs;
    console.log("BulkPostMRListRemindersFunction inputs", JSON.stringify(inputs));

    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      // Get all list items
      const items = await getAllListItems(client, list_id, team_id);

      // Process each item and collect results
      let remindersSent = 0;
      const errors: string[] = [];

      for (const item of items) {
        const result = await processItemReminder(client, list_id, item);

        if (result.success) {
          remindersSent++;
        } else if (result.error) {
          errors.push(result.error);
        }
      }

      // Log warnings if any errors occurred
      if (errors.length > 0) {
        console.warn("Some reminders failed:", errors);
      }

      return {
        outputs: {
          items_processed: items.length,
          reminders_sent: remindersSent,
        },
      };
    } catch (error) {
      return { error: `Error bulk posting reminders: ${error.message}` };
    }
  }
);

