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

const getPendingReviewers = (itemInfo: any) => {
  const schema = itemInfo.list.list_metadata.schema;
  const reviewersColumn = getColumnByName(schema, COLUMN_NAMES.REVIEWERS);
  const approvalsColumn = getColumnByName(schema, COLUMN_NAMES.APPROVALS);

  const reviewersField = getFieldValue(itemInfo, reviewersColumn.id);
  const approvalsField = getFieldValue(itemInfo, approvalsColumn.id);

  const reviewers = Array.isArray(reviewersField?.user) ? reviewersField.user : [];
  const approvals = Array.isArray(approvalsField?.user) ? approvalsField.user : [];

  return reviewers.filter((reviewer: string) => !approvals.includes(reviewer));
};

const formatMentions = (userIds: string[]): string => {
  return userIds.map((id) => `<@${id}>`).join(" ");
};

export default SlackFunction(
  BulkPostMRListRemindersFunction,
  async ({ inputs, client }) => {
    const { list_id, team_id, conditional } = inputs;

    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      // Get all list items
      const apiParams: any = { list_id, limit: 1000 };
      if (team_id) apiParams.team_id = team_id;

      const listResponse = await client.apiCall("slackLists.items.list", apiParams);

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch list items: ${listResponse.error}`);
      }

      const items = listResponse.items || [];
      let remindersSent = 0;
      const errors: string[] = [];

      // Process each item
      for (const item of items) {
        try {
          // Get full item info to check for pending reviewers
          const itemInfo = await getItemInfo(client, list_id, item.id);
          const pendingReviewers = getPendingReviewers(itemInfo);

          // Only post reminder if there are pending reviewers
          if (pendingReviewers.length > 0) {
            // Get thread ID
            const itemTimestamp = String(itemInfo.record.updated_timestamp);
            const threadId = await getThreadId(client, list_id, item.id, itemTimestamp);

            // Post reminder message
            const mentions = formatMentions(pendingReviewers);
            const channelId = listIdToChannelId(list_id);
            
            const response = await client.apiCall("chat.postMessage", {
              channel: channelId,
              thread_ts: threadId,
              markdown_text: `This item is ready to review, please review it. cc: ${mentions}`,
            });

            if (response.ok) {
              remindersSent++;
            } else {
              errors.push(`Failed to post reminder for item ${item.id}: ${response.error}`);
            }
          }
        } catch (error) {
          errors.push(`Error processing item ${item.id}: ${error.message}`);
        }
      }

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

