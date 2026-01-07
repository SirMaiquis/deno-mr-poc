import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * Function to check if an item exists in a Slack list
 */
export const CheckListItemExistsFunction = DefineFunction({
  callback_id: "check_list_item_exists",
  title: "Check if List Item Exists",
  description: "Checks if an item with a specific name already exists in a Slack list",
  source_file: "functions/check_list_item_exists.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list to check (e.g., F0A55R03DU3)",
      },
      item_name: {
        type: Schema.types.string,
        description: "The name of the item to search for",
      },
      team_id: {
        type: Schema.types.string,
        description: "Optional team/workspace ID for Enterprise (e.g., T0A4NJNST6E)",
      },
    },
    required: ["list_id", "item_name"],
  },
  output_parameters: {
    properties: {
      exists: {
        type: Schema.types.boolean,
        description: "Whether the item exists in the list",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item if it exists (empty string if not)",
      },
    },
    required: ["exists"],
  },
});

/**
 * Handler function that checks if an item exists in a list
 */
export default SlackFunction(
  CheckListItemExistsFunction,
  async ({ inputs, client }) => {
    const { list_id, item_name, team_id } = inputs;

    try {

      console.log("Checking if item exists in list", list_id, item_name, team_id);
      // Prepare API parameters
      const apiParams: any = {
        list_id: list_id,
        limit: 1000, // Adjust if you have more items
      };

      // Add team_id if provided (required for Enterprise workspaces)
      if (team_id) {
        apiParams.team_id = team_id;
      }

      // Get all items from the list using the slackLists.items.list API method
      const response = await client.apiCall("slackLists.items.list", apiParams);

      if (!response.ok) {
        return {
          error: `Failed to fetch list ${list_id} items: ${response.error}`,
        };
      }

      // Check if any item has a matching name
      const items = response.items || [];
      const matchingItem = items.find((item: any) => {
        const nameField = item.fields?.find((field: any) => 
          field.key?.toLowerCase() === "name"
        );
        return nameField?.text === item_name;
      });

      return {
        outputs: {
          exists: !!matchingItem,
          item_id: matchingItem?.id || "",
        },
      };
    } catch (error) {
      return {
        error: `Error checking list item: ${error.message}`,
      };
    }
  },
);

