import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { DEFAULT_RESPONSE } from "../constants/default_response.ts";
import { STATUS_VALUES } from "../constants/column_ids.ts";

/**
 * Function to update the status of an MR list item
 */
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
        description: "The status key/option ID to set",
      },
      team_id: {
        type: Schema.types.string,
        description: "The team ID",
      },
      conditional: {
        type: Schema.types.boolean,
        description: "Determines if the function should be executed or not",
        default: true,
      }
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

/**
 * Handler function that updates the status of an item
 */
export default SlackFunction(
  UpdateMRItemStatusFunction,
  async ({ inputs, client }) => {
    let { list_id, item_id, status_key, team_id, conditional } = inputs;
    if (conditional === undefined) conditional = true;
    
    try {
      if (!conditional) 
        return DEFAULT_RESPONSE;
      
      const getItemResponse = await client.apiCall("slackLists.items.info", {
        list_id: list_id,
        id: item_id,
      });

      if (!getItemResponse.ok) {
        return {
          error: `Failed to get item: ${JSON.stringify(getItemResponse)}`,
        };
      }

      const statusColumn = getItemResponse.list.list_metadata.schema.find(
        (column: any) => column.name === "Status"
      );

      if (!statusColumn) {
        return {
          error: "Could not find Status column in list schema",
        };
      }

      const statusOption = statusColumn.options.choices.find(
        (option: any) => option.label === STATUS_VALUES[status_key]
      )?.value;

      const updateParams: any = {
        list_id: list_id,
        cells: [
          {
            row_id: item_id,
            column_id: statusColumn.id,
            select: [statusOption],
          }
        ]
      };

      if (team_id) {
        updateParams.team_id = team_id;
      }

      const updateResponse = await client.apiCall("slackLists.items.update", updateParams);

      if (!updateResponse.ok) {
        return {
          error: `Failed to update item status: ${JSON.stringify(updateResponse)}`,
        };
      }

      return {
        outputs: {
          success: true,
        },
      };
    } catch (error) {
      return {
        error: `Error updating item status: ${error.message}`,
      };
    }
  }
);

