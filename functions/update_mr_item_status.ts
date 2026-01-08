import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import { getItemInfo, getColumnByName } from "../shared/list_utils.ts";
import { STATUS_VALUES, COLUMN_NAMES } from "../constants/column_ids.ts";

export const UpdateMRItemStatusFunction = DefineFunction({
  callback_id: "update_mr_item_status",
  title: "Update MR Item Status",
  description: "Updates the status of an item in a Slack list",
  source_file: "functions/update_mr_item_status.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item to update",
      },
      status_key: {
        type: Schema.types.string,
        description: "The status key",
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
    required: ["list_id", "item_id", "status_key"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the status was updated successfully",
      },
    },
    required: ["success"],
  },
});

const getStatusOptionValue = (statusColumn: any, statusKey: string): string => {
  const option = statusColumn.options.choices.find(
    (choice: any) => choice.label === STATUS_VALUES[statusKey]
  );
  if (!option) {
    throw new Error(`Status option not found for key: ${statusKey}`);
  }
  return option.value;
};

export default SlackFunction(
  UpdateMRItemStatusFunction,
  async ({ inputs, client }) => {
    const { list_id, item_id, status_key, team_id, conditional } = inputs;

    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      const itemInfo = await getItemInfo(client, list_id, item_id);
      const statusColumn = getColumnByName(itemInfo.list.list_metadata.schema, COLUMN_NAMES.STATUS);
      const statusOptionValue = getStatusOptionValue(statusColumn, status_key);

      const updateParams: any = {
        list_id,
        cells: [{
          row_id: item_id,
          column_id: statusColumn.id,
          select: [statusOptionValue],
        }],
      };

      if (team_id) updateParams.team_id = team_id;

      const response = await client.apiCall("slackLists.items.update", updateParams);

      if (!response.ok) {
        throw new Error(`Failed to update status: ${JSON.stringify(response)}`);
      }

      return { outputs: { success: true } };
    } catch (error) {
      return { error: `Error updating status: ${error.message}` };
    }
  }
);

