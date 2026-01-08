import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import { getThreadId } from "../shared/message_utils.ts";
import { getItemInfo } from "../shared/list_utils.ts";

export const GetItemThreadByIdFunction = DefineFunction({
  callback_id: "get_item_thread_by_id",
  title: "Get Item Thread By ID",
  description: "Gets a thread by item ID",
  source_file: "functions/get_item_thread_by_id.ts",
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
      conditional: {
        type: Schema.types.boolean,
        description: "Whether to execute this function",
        default: true,
      },
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

export default SlackFunction(
  GetItemThreadByIdFunction,
  async ({ inputs, client }) => {
    const { list_id, item_id, conditional } = inputs;

    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      const itemInfo = await getItemInfo(client, list_id, item_id);
      const itemTimestamp = String(itemInfo.record.updated_timestamp);
      const threadId = await getThreadId(client, list_id, item_id, itemTimestamp);

      return { outputs: { thread_id: threadId } };
    } catch (error) {
      return { error: `Error getting thread: ${error.message}` };
    }
  }
);
