import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const CheckListItemExistsFunction = DefineFunction({
  callback_id: "check_list_item_exists",
  title: "Check if List Item Exists",
  description: "Checks if an item with a specific name already exists in a Slack list",
  source_file: "functions/check_list_item_exists.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list to check",
      },
      item_name: {
        type: Schema.types.string,
        description: "The name of the item to search for",
      },
      team_id: {
        type: Schema.types.string,
        description: "Optional team/workspace ID for Enterprise",
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
        description: "The ID of the item if it exists",
      },
    },
    required: ["exists"],
  },
});

const findItemByName = (items: any[], itemName: string) => {
  return items.find((item: any) => {
    const nameField = item.fields?.find((field: any) =>
      field.key?.toLowerCase() === "name"
    );
    return nameField?.text === itemName;
  });
};

export default SlackFunction(
  CheckListItemExistsFunction,
  async ({ inputs, client }) => {
    const { list_id, item_name, team_id } = inputs;
    console.log("CheckListItemExistsFunction inputs", JSON.stringify({
      list_id,
      item_name,
      team_id,
    }));

    try {
      const apiParams: any = { list_id, limit: 1000 };
      if (team_id) apiParams.team_id = team_id;

      const response = await client.apiCall("slackLists.items.list", apiParams);

      if (!response.ok) {
        return { error: `Failed to fetch list items: ${response.error}` };
      }

      const matchingItem = findItemByName(response.items || [], item_name);
      console.log("CheckListItemExistsFunction matchingItem", JSON.stringify(matchingItem));

      return {
        outputs: {
          exists: !!matchingItem,
          item_id: matchingItem?.id || "",
        },
      };
    } catch (error) {
      return { error: `Error checking list item: ${error.message}` };
    }
  }
);

