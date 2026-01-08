export const listIdToChannelId = (listId: string): string => {
  return listId.replace(/^./, 'C');
};

export const getListSchema = async (client: any, listId: string) => {
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

