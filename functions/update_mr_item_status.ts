import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import { getItemInfo, getColumnByName } from "../shared/list_utils.ts";
import { STATUS_VALUES, COLUMN_NAMES } from "../constants/column_ids.ts";

export const UpdateMRItemStatusFunction = DefineFunction({
  callback_id: "update_mr_item_status",
  title: "Update MR Item Status",
  description: "Updates the status of an item in a Slack list by ID or name",
  source_file: "functions/update_mr_item_status.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item to update (optional if item_name is provided)",
      },
      item_name: {
        type: Schema.types.string,
        description: "The name of the item to update (optional if item_id is provided)",
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
    required: ["list_id", "status_key"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the status was updated successfully",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item that was updated",
      },
    },
    required: ["success"],
  },
});

/**
 * Finds an item in the list by its name
 */
const findItemByName = (items: any[], itemName: string) => {
  return items.find((item: any) => {
    const nameField = item.fields?.find((field: any) =>
      field.key?.toLowerCase() === "name"
    );
    return nameField?.text === itemName;
  });
};

/**
 * Gets the item ID either from the provided item_id or by looking up the item_name
 */
const getItemId = async (
  client: any,
  listId: string,
  itemId?: string,
  itemName?: string,
  teamId?: string
): Promise<string> => {
  // If item_id is provided, use it directly
  if (itemId) {
    return itemId;
  }

  // If item_name is provided, search for the item
  if (itemName) {
    const apiParams: any = { list_id: listId, limit: 1000 };
    if (teamId) apiParams.team_id = teamId;

    const response = await client.apiCall("slackLists.items.list", apiParams);

    if (!response.ok) {
      throw new Error(`Failed to fetch list items: ${response.error}`);
    }

    const matchingItem = findItemByName(response.items || [], itemName);

    if (!matchingItem) {
      throw new Error(`Item not found with name: ${itemName}`);
    }

    return matchingItem.id;
  }

  // Neither provided
  throw new Error("Either item_id or item_name must be provided");
};

/**
 * Gets the status option value from the status column based on the status key
 */
const getStatusOptionValue = (statusColumn: any, statusKey: string): string => {
  const option = statusColumn.options.choices.find(
    (choice: any) => choice.label === STATUS_VALUES[statusKey]
  );
  if (!option) {
    throw new Error(`Status option not found for key: ${statusKey}`);
  }
  return option.value;
};

/**
 * Updates the status of an item in the list
 */
const updateItemStatus = async (
  client: any,
  listId: string,
  itemId: string,
  statusColumnId: string,
  statusOptionValue: string,
  teamId?: string
): Promise<void> => {
  const updateParams: any = {
    list_id: listId,
    cells: [{
      row_id: itemId,
      column_id: statusColumnId,
      select: [statusOptionValue],
    }],
  };

  if (teamId) updateParams.team_id = teamId;

  const response = await client.apiCall("slackLists.items.update", updateParams);

  if (!response.ok) {
    throw new Error(`Failed to update status: ${JSON.stringify(response)}`);
  }
};

export default SlackFunction(
  UpdateMRItemStatusFunction,
  async ({ inputs, client }) => {
    const { list_id, item_id, item_name, status_key, team_id, conditional } = inputs;
    console.log("UpdateMRItemStatusFunction inputs", JSON.stringify(inputs));
    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      // Get item ID (either from input or by looking up name)
      const resolvedItemId = await getItemId(client, list_id, item_id, item_name, team_id);

      // Get item info to access the schema and find the status column
      const itemInfo = await getItemInfo(client, list_id, resolvedItemId);
      const statusColumn = getColumnByName(itemInfo.list.list_metadata.schema, COLUMN_NAMES.STATUS);
      const statusOptionValue = getStatusOptionValue(statusColumn, status_key);

      // Update the item status
      await updateItemStatus(
        client,
        list_id,
        resolvedItemId,
        statusColumn.id,
        statusOptionValue,
        team_id
      );

      return {
        outputs: {
          success: true,
          item_id: resolvedItemId,
        },
      };
    } catch (error) {
      return { error: `Error updating status: ${error.message}` };
    }
  }
);

