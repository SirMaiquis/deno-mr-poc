import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { COLUMN_IDS, STATUS_VALUES } from "../constants/column_ids.ts";

/**
 * Function to check if an item exists in a Slack list
 */
export const AddMRListItemFunction = DefineFunction({
  callback_id: "add_mr_list_item",
  title: "Add MR List Item",
  description: "Adds an item to a Slack list",
  source_file: "functions/add_mr_list_item.ts",
  input_parameters: {
    properties: {
      list_id: {
        type: Schema.types.string,
        description: "The ID of the Slack list to add the item to (e.g., F0A55R03DU3)",
      },
      name: {
        type: Schema.types.string,
        description: "The name of the item to add to the list",
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
        description: "The assignee of the item",
      },
      reviewers: {
        type: Schema.types.string,
        description: "The reviewers of the item",
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
    required: ["list_id", "name", "ticket_link", "mr_link", "assignee", "team_id"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the item was added to the list",
      },
      item_id: {
        type: Schema.types.string,
        description: "The ID of the item that was added to the list",
      },
    },
    required: ["success", "item_id"],
  },
});

/**
 * Handler function that checks if an item exists in a list
 */
export default SlackFunction(
  AddMRListItemFunction,
  async ({ inputs, client }) => {
    const { list_id, name, ticket_link, mr_link, assignee, reviewers, team_id, conditional } = inputs;

    try {
      if (!conditional) {
        return {
          outputs: {
            success: false,
            item_id: "",
          },
        };
      }
      const getUserListResponse = await client.apiCall("users.list", {
        limit: 1000,
        team_id: team_id,
      });

      if (!getUserListResponse.ok) {
        return {
          error: `Failed to fetch user list: ${JSON.stringify(getUserListResponse)}`,
        };
      }

      const users = getUserListResponse.members || [];
      console.log("users", users);
      const assigneeUser = users.find((user: any) => user?.profile?.email === assignee);
      console.log("assigneeUser", assigneeUser);
      const reviewersUsers = reviewers.split(",").map((email: string) => users.find((user: any) => user?.profile?.email === email));
      const ticketLastPart = ticket_link.split("/").pop();
      const ticketLastPartWithoutQuery = ticketLastPart?.split("?")[0];
      console.log("ticketLastPartWithoutQuery", ticketLastPartWithoutQuery);
      const mrLastPart = mr_link.split("/").pop();
      const mrLastPartWithoutQuery = mrLastPart?.split("?")[0];
      console.log("mrLastPartWithoutQuery", mrLastPartWithoutQuery);

      var apiParams = {
        "list_id": list_id,
        "initial_fields": [
          {
            "column_id": COLUMN_IDS.NAME,
            "rich_text": [
              {
                "type": "rich_text",
                "elements": [
                  {
                    "type": "rich_text_section",
                    "elements": [
                      {
                        "type": "text",
                        "text": name
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
              "column_id": COLUMN_IDS.TICKET,
              "link": [
                  {
                  "original_url": ticket_link,
                  "display_as_url": false,
                  "display_name": ticketLastPartWithoutQuery
                  }
              ]
          },
          {
              "column_id": COLUMN_IDS.MR,
              "link": [
                  {
                  "original_url": mr_link,
                  "display_as_url": false,
                  "display_name": mrLastPartWithoutQuery
                  }
              ]
          },
          {
              "user": [
                  assigneeUser?.id
              ],
              "column_id": COLUMN_IDS.ASSIGNEE
          },
          {
              "user": reviewersUsers.map((user: any) => user?.id),
              "column_id": COLUMN_IDS.REVIEWERS
          },
          {
            "select": [
                STATUS_VALUES.READY_FOR_REVIEW
            ],
            "column_id": COLUMN_IDS.STATUS
          }
        ]
      };

      console.log("apiParams", apiParams);

      const addItemResponse = await client.apiCall("slackLists.items.create", {
        ...apiParams,
      });
      console.log("addItemResponse", addItemResponse);
      if (!addItemResponse.ok) {
        return {
          error: `Failed to add item to list: ${JSON.stringify(addItemResponse)}, ${JSON.stringify(apiParams)}`,
        };
      }

      return {
        outputs: {
          success: true,
          item_id: addItemResponse.item.id,
        },
      };
    } catch (error) {
      return {
        error: `Error adding item to list: ${JSON.stringify(error)}`,
      };
    }
  },
);

