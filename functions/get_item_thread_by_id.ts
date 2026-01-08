import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { DEFAULT_RESPONSE } from "../constants/default_response.ts";

/**
 * Function to check if an item exists in a Slack list
 */
export const GetItemThreadByIdFunction = DefineFunction({
  callback_id: "get_item_thread_by_id",
  title: "Get Item Thread By ID",
  description: "Gets a thread by item ID",
  source_file: "functions/get_item_thread_by_id.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list to get the thread for",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item to get the thread for",
      },
      conditional: {
        type: Schema.types.boolean,
        description: "Determines if the function should be executed or not",
        default: true,
      }
    },
    required: ["list_id", "item_id"],
  },
  output_parameters: {
    properties: {
      thread_id: {
        type: Schema.types.string,
        description: "The ID of the thread",
      },
    },
    required: ["thread_id"],
  },
});

/**
 * Handler function that gets a thread by item ID
 */
export default SlackFunction(
  GetItemThreadByIdFunction,
  async ({ inputs, client }) => {
    const { list_id, item_id } = inputs;
    let { conditional } = inputs;
    if (conditional === undefined) conditional = true;

    try {

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
      const threadFirstPart = String(getItemResponse.record.updated_timestamp);

      const conversationId = list_id.replace(/^./, 'C');
      
      const conversationResponse = await client.apiCall("conversations.history", {
        channel: conversationId,
        limit: 100,
      });

      if (!conversationResponse.ok) {
        return {
          error: `Failed to get conversation: ${JSON.stringify(conversationResponse)}`,
        };
      }

      // Strategy 1: Find message whose timestamp starts with the item's updated_timestamp
      let threadId = conversationResponse.messages.find((message: any) => 
        message.ts?.startsWith(threadFirstPart)
      )?.ts;
      
      // Strategy 2: If not found, look for message with matching list_record_id
      if (!threadId) {
        threadId = conversationResponse.messages.find((message: any) => 
          message.slack_list?.list_record_id === item_id
        )?.ts;
      }

      if (!threadId) {
        return {
          error: `Could not find thread for item ${item_id}. Tried timestamp: ${threadFirstPart} and list_record_id search.`,
        };
      }

      return {
        outputs: {
          thread_id: threadId,
        },
      };
    } catch (error) {
      return {
        error: `Error getting thread: ${error.message}`,
      };
    }
  },
);