import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import { listIdToChannelId, getItemInfo, getColumnByName, getFieldValue } from "../shared/list_utils.ts";
import { COLUMN_NAMES } from "../constants/column_ids.ts";

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
  PostMRItemReminderMessageFunction,
  async ({ inputs, client }) => {
    const { list_id, item_id, thread_id, conditional } = inputs;

    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      const itemInfo = await getItemInfo(client, list_id, item_id);
      const pendingReviewers = getPendingReviewers(itemInfo);
      const mentions = formatMentions(pendingReviewers);

      const channelId = listIdToChannelId(list_id);
      const response = await client.apiCall("chat.postMessage", {
        channel: channelId,
        thread_ts: thread_id,
        markdown_text: `This item is ready to review, please review it. cc: ${mentions}`,
      });

      if (!response.ok) {
        throw new Error(`Failed to post message: ${JSON.stringify(response)}`);
      }

      return { outputs: { success: true } };
    } catch (error) {
      return { error: `Error posting reminder: ${error.message}` };
    }
  }
);
