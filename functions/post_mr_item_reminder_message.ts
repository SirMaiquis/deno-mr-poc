import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { DEFAULT_RESPONSE } from "../constants/default_response.ts";

/**
 * Function to check if an item exists in a Slack list
 */
export const PostMRItemReminderMessageFunction = DefineFunction({
  callback_id: "post_mr_item_reminder_message",
  title: "Post MR Item Reminder Message",
  description: "Posts a reminder message to a Slack channel",
  source_file: "functions/post_mr_item_reminder_message.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list to post the reminder message to",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item to post the reminder message for",
      },
      thread_id: {
        type: Schema.types.string,
        description: "The ID of the thread to post the reminder message to",
      },
      team_id: {
        type: Schema.types.string,
        description: "The ID of the team to post the reminder message to",
      },
      conditional: {
        type: Schema.types.boolean,
        description: "Determines if the function should be executed or not",
        default: true,
      }
    },
    required: ["list_id", "item_id", "thread_id"],
  },
});

/**
 * Handler function that posts a reminder message to a Slack channel
 */
export default SlackFunction(
  PostMRItemReminderMessageFunction,
  async ({ inputs, client }) => {
    const { list_id, item_id, thread_id } = inputs;
    let { conditional } = inputs;

    try {

      if (conditional === undefined) conditional = true;
      if (!conditional) return DEFAULT_RESPONSE;

      const getItemResponse = await client.apiCall("slackLists.items.info", {
        list_id: list_id,
        id: item_id,
      });
      if (!getItemResponse.ok) {
        return {
          error: `Failed to get item: ${JSON.stringify(getItemResponse)}`,
        };
      }
      const reviewersColumnId = getItemResponse.list.list_metadata.schema.find((column: any) => column.name === "Reviewers")?.id;
      const approvalsColumnId = getItemResponse.list.list_metadata.schema.find((column: any) => column.name === "Approvals")?.id;
      const reviewersValue = getItemResponse.record.fields.find((field: any) => field.column_id === reviewersColumnId)?.user || [];
      const approvalsValue = getItemResponse.record.fields.find((field: any) => field.column_id === approvalsColumnId)?.user || [];

      const reviewers = Array.isArray(reviewersValue) ? reviewersValue : [];
      const approvals = Array.isArray(approvalsValue) ? approvalsValue : [];

      const reviewersThatHaventApproved = reviewers.filter((reviewer: string) => !approvals.includes(reviewer));

      const cc = reviewersThatHaventApproved.map((id: string) => `<@${id}>`);

      const channelId = list_id.replace(/^./, 'C');
      const postMessageResponse = await client.apiCall("chat.postMessage", {
        channel: channelId,
        thread_ts: thread_id,
        markdown_text: `This item is ready to review, please review it. cc: ${cc}`,
      });

      if (!postMessageResponse.ok) {
        return {
          error: `Failed to post message: ${JSON.stringify(postMessageResponse)}`,
        };
      }

      return {
        outputs: {
          success: true,
        },
      };
    } catch (error) {
      return {
        error: `Error posting reminder message: ${error.message}`,
      };
    }
  },
  
);