import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import { listIdToChannelId, getItemInfo, getColumnByName, getFieldValue } from "../shared/list_utils.ts";
import { getThreadId } from "../shared/message_utils.ts";
import { COLUMN_NAMES } from "../constants/column_ids.ts";

export const BulkPostMRListRemindersFunction = DefineFunction({
  callback_id: "bulk_post_mr_list_reminders",
  title: "Bulk Post MR List Reminders",
  description: "Gets all list items and posts reminders for items with pending reviewers",
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
 * Gets all reviewers who haven't approved yet for a given item
 */
const getPendingReviewers = (itemInfo: any): string[] => {
  const schema = itemInfo.list.list_metadata.schema;
  const reviewersColumn = getColumnByName(schema, COLUMN_NAMES.REVIEWERS);
  const approvalsColumn = getColumnByName(schema, COLUMN_NAMES.APPROVALS);

  const reviewersField = getFieldValue(itemInfo, reviewersColumn.id);
  const approvalsField = getFieldValue(itemInfo, approvalsColumn.id);

  const reviewers = Array.isArray(reviewersField?.user) ? reviewersField.user : [];
  const approvals = Array.isArray(approvalsField?.user) ? approvalsField.user : [];

  return reviewers.filter((reviewer: string) => !approvals.includes(reviewer));
};

/**
 * Formats user IDs into Slack mention format
 */
const formatMentions = (userIds: string[]): string => {
  return userIds.map((id) => `<@${id}>`).join(" ");
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
 * Posts a reminder message to a thread for a specific item
 */
const postReminderMessage = async (
  client: any,
  listId: string,
  itemId: string,
  threadId: string,
  pendingReviewers: string[]
): Promise<boolean> => {
  const mentions = formatMentions(pendingReviewers);
  const channelId = listIdToChannelId(listId);
  const messageText = `This item is ready to review, please review it. cc: ${mentions}`;

  const response = await client.apiCall("chat.postMessage", {
    channel: channelId,
    thread_ts: threadId,
    markdown_text: messageText,
  });

  return response.ok;
};

/**
 * Processes a single item and posts a reminder if it has pending reviewers
 * Returns true if reminder was sent successfully, false otherwise
 */
const processItemReminder = async (
  client: any,
  listId: string,
  item: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get full item info to check for pending reviewers
    const itemInfo = await getItemInfo(client, listId, item.id);
    const pendingReviewers = getPendingReviewers(itemInfo);

    // Skip if no pending reviewers
    if (pendingReviewers.length === 0) {
      return { success: false };
    }

    // Get thread ID for the item
    const itemTimestamp = String(itemInfo.record.updated_timestamp);
    const threadId = await getThreadId(client, listId, item.id, itemTimestamp);

    // Post reminder message
    const success = await postReminderMessage(
      client,
      listId,
      item.id,
      threadId,
      pendingReviewers
    );

    if (!success) {
      return {
        success: false,
        error: `Failed to post reminder for item ${item.id}`,
      };
    }

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

