import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { COLUMN_NAMES, STATUS_VALUES } from "../constants/column_ids.ts";
import { handleConditional } from "../shared/conditional_utils.ts";
import { getUsersByEmails } from "../shared/user_utils.ts";
import { extractDisplayName } from "../shared/url_utils.ts";
import { getListSchema, getColumnByName } from "../shared/list_utils.ts";
import { buildRichTextField, buildLinkField, buildUserField, buildSelectField } from "../shared/list_field_builders.ts";

export const AddMRListItemFunction = DefineFunction({
  callback_id: "add_mr_list_item",
  title: "Add MR List Item",
  description: "Adds an item to a Slack list",
  source_file: "functions/add_mr_list_item.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list",
      },
      name: {
        type: Schema.types.string,
        description: "The name of the item",
      },
      ticket_link: {
        type: Schema.types.string,
        description: "The link to the ticket",
      },
      mr_link: {
        type: Schema.types.string,
        description: "The link to the MR",
      },
      assignee: {
        type: Schema.types.string,
        description: "The assignee email",
      },
      reviewers: {
        type: Schema.types.string,
        description: "Comma-separated reviewer emails",
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
    required: ["list_id", "name", "ticket_link", "mr_link", "assignee", "team_id"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the item was added",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the added item",
      },
    },
    required: ["success", "item_id"],
  },
});

const buildItemFields = (
  schema: any[],
  data: {
    name: string;
    ticketLink: string;
    mrLink: string;
    assigneeId: string;
    reviewerIds: string[];
    statusValue: string;
  }
) => {
  const nameColumn = getColumnByName(schema, COLUMN_NAMES.NAME);
  const ticketColumn = getColumnByName(schema, COLUMN_NAMES.TICKET);
  const mrColumn = getColumnByName(schema, COLUMN_NAMES.MR);
  const assigneeColumn = getColumnByName(schema, COLUMN_NAMES.ASSIGNEE);
  const reviewersColumn = getColumnByName(schema, COLUMN_NAMES.REVIEWERS);
  const statusColumn = getColumnByName(schema, COLUMN_NAMES.STATUS);

  return [
    buildRichTextField(nameColumn.id, data.name),
    buildLinkField(ticketColumn.id, data.ticketLink, extractDisplayName(data.ticketLink)),
    buildLinkField(mrColumn.id, data.mrLink, extractDisplayName(data.mrLink)),
    buildUserField(assigneeColumn.id, [data.assigneeId]),
    buildUserField(reviewersColumn.id, data.reviewerIds),
    buildSelectField(statusColumn.id, data.statusValue),
  ];
};

export default SlackFunction(
  AddMRListItemFunction,
  async ({ inputs, client }) => {
    const { list_id, name, ticket_link, mr_link, assignee, reviewers, team_id, conditional } = inputs;

    try {
      const conditionalCheck = handleConditional(conditional);
      if (conditionalCheck.skip) return conditionalCheck.response;

      const reviewerEmails = reviewers.split(",").map((email) => email.trim());
      const allEmails = [assignee, ...reviewerEmails];
      const users = await getUsersByEmails(client, allEmails, team_id);

      const assigneeUser = users.find((user: any) => user?.profile?.email === assignee);
      const reviewerUsers = reviewerEmails.map((email) =>
        users.find((user: any) => user?.profile?.email === email)
      ).filter(Boolean);

      if (!assigneeUser) {
        throw new Error(`Assignee not found: ${assignee}`);
      }

      const schema = await getListSchema(client, list_id);
      const statusColumn = getColumnByName(schema, COLUMN_NAMES.STATUS);
      const statusValue = statusColumn.options.choices.find(
        (option: any) => option.label === STATUS_VALUES.READY_FOR_REVIEW
      )?.value;

      const fields = buildItemFields(schema, {
        name,
        ticketLink: ticket_link,
        mrLink: mr_link,
        assigneeId: assigneeUser.id,
        reviewerIds: reviewerUsers.map((user: any) => user.id),
        statusValue,
      });

      const response = await client.apiCall("slackLists.items.create", {
        list_id,
        initial_fields: fields,
      });

      if (!response.ok) {
        throw new Error(`Failed to add item: ${JSON.stringify(response)}`);
      }

      return {
        outputs: {
          success: true,
          item_id: response.item.id,
        },
      };
    } catch (error) {
      return { error: `Error adding item: ${error.message}` };
    }
  }
);


