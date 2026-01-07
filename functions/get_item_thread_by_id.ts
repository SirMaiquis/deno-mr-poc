import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

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
    const { list_id, item_id, conditional } = inputs;

    try {

      if (!conditional) {
        return {
          outputs: {
            thread_id: "",
          },
        };
      }

      const getItemResponse = await client.apiCall("slackLists.items.info", {
        list_id: list_id,
        id: item_id,
      });

      if (!getItemResponse.ok) {
        return {
          error: `Failed to get item: ${JSON.stringify(getItemResponse)}`,
        };
      }
      const threadFirstPart = getItemResponse.record.updated_timestamp;

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

      const threadId = conversationResponse.messages.find((message: any) => message.ts?.startsWith(threadFirstPart))?.ts;

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