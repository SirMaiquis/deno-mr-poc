import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import { getItemInfo, getColumnByName, getFieldValue } from "../shared/list_utils.ts";
import { getUserByEmail } from "../shared/user_utils.ts";
import { COLUMN_NAMES } from "../constants/column_ids.ts";

export const AddApprovalToMRItemFunction = DefineFunction({
  callback_id: "add_approval_to_mr_item",
  title: "Add Approval to MR Item",
  description: "Adds an approval to an MR list item",
  source_file: "functions/add_approval_to_mr_item.ts",
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
      user_email: {
        type: Schema.types.string,
        description: "The email of the user approving",
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
    required: ["list_id", "item_id", "user_email", "team_id"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the approval was added successfully",
      },
    },
    required: ["success"],
  },
});

const getExistingApprovals = (itemInfo: any, approvalsColumnId: string): string[] => {
  const approvalsField = getFieldValue(itemInfo, approvalsColumnId);
  const approvals = approvalsField?.user || [];
  return Array.isArray(approvals) ? approvals : [];
};

export default SlackFunction(
  AddApprovalToMRItemFunction,
  async ({ inputs, client }) => {
    const { list_id, item_id, user_email, team_id, conditional } = inputs;

    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      const itemInfo = await getItemInfo(client, list_id, item_id);
      const approvalsColumn = getColumnByName(itemInfo.list.list_metadata.schema, COLUMN_NAMES.APPROVALS);
      
      const user = await getUserByEmail(client, user_email, team_id);
      if (!user) {
        throw new Error(`User not found: ${user_email}`);
      }

      const existingApprovals = getExistingApprovals(itemInfo, approvalsColumn.id);
      
      if (existingApprovals.includes(user.id)) {
        return {
          outputs: { success: true },
        };
      }

      const updateParams: any = {
        list_id,
        cells: [{
          row_id: item_id,
          column_id: approvalsColumn.id,
          user: [...existingApprovals, user.id],
        }],
      };
      console.log("updateParams", JSON.stringify(updateParams));

      if (team_id) updateParams.team_id = team_id;

      const response = await client.apiCall("slackLists.items.update", updateParams);

      if (!response.ok) {
        throw new Error(`Failed to add approval: ${JSON.stringify(response)}`);
      }

      return { outputs: { success: true } };
    } catch (error) {
      return { error: `Error adding approval: ${error.message}` };
    }
  }
);

