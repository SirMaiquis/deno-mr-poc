import { COLUMN_NAMES } from "../constants/column_ids.ts";

export const listIdToChannelId = (listId: string): string => {
  return listId.replace(/^./, 'C');
};

export const getListSchema = async (client: any, listId: string) => {
  console.log("getListSchema listId", listId);
  const itemListResponse = await client.apiCall("slackLists.items.list", {
    list_id: listId,
    limit: 1,
  });

  if (!itemListResponse.ok || !itemListResponse.items?.[0]) {
    throw new Error(`Failed to fetch list schema: ${JSON.stringify(itemListResponse)}`);
  }

  const getItemResponse = await client.apiCall("slackLists.items.info", {
    list_id: listId,
    id: itemListResponse.items[0].id,
  });

  if (!getItemResponse.ok) {
    throw new Error(`Failed to get list metadata: ${JSON.stringify(getItemResponse)}`);
  }

  return getItemResponse.list.list_metadata.schema;
};

export const getColumnByName = (schema: any[], columnName: string) => {
  const column = schema.find((col: any) => col.name === columnName);
  if (!column) {
    throw new Error(`Column "${columnName}" not found in list schema`);
  }
  return column;
};

export const getItemInfo = async (client: any, listId: string, itemId: string) => {
  const response = await client.apiCall("slackLists.items.info", {
    list_id: listId,
    id: itemId,
  });

  if (!response.ok) {
    throw new Error(`Failed to get item: ${JSON.stringify(response)}`);
  }

  return response;
};

export const getFieldValue = (item: any, columnId: string) => {
  return item.record.fields.find((field: any) => field.column_id === columnId);
};

/**
 * Gets all reviewers who haven't approved yet for a given item
 */
export const getPendingReviewers = (itemInfo: any): string[] => {
  const schema = itemInfo.list.list_metadata.schema;
  const reviewersColumn = getColumnByName(schema, COLUMN_NAMES.REVIEWERS);
  const approvalsColumn = getColumnByName(schema, COLUMN_NAMES.APPROVALS);

  const reviewersField = getFieldValue(itemInfo, reviewersColumn.id);
  const approvalsField = getFieldValue(itemInfo, approvalsColumn.id);

  const reviewers = Array.isArray(reviewersField?.user) ? reviewersField.user : [];
  const approvals = Array.isArray(approvalsField?.user) ? approvalsField.user : [];

  return reviewers.filter((reviewer: string) => !approvals.includes(reviewer));
};
