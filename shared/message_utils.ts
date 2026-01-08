export const findThreadByTimestamp = (
  messages: any[],
  timestamp: string
): string | undefined => {
  return messages.find((msg: any) => msg.ts?.startsWith(timestamp))?.ts;
};

export const findThreadByRecordId = (
  messages: any[],
  recordId: string
): string | undefined => {
  return messages.find((msg: any) =>
    msg.slack_list?.list_record_id === recordId
  )?.ts;
};

export const getThreadId = async (
  client: any,
  listId: string,
  itemId: string,
  itemTimestamp: string
) => {
  const channelId = listId.replace(/^./, 'C');
  
  const response = await client.apiCall("conversations.history", {
    channel: channelId,
    limit: 100,
  });

  if (!response.ok) {
    throw new Error(`Failed to get conversation: ${JSON.stringify(response)}`);
  }

  let threadId = findThreadByTimestamp(response.messages, itemTimestamp);
  
  if (!threadId) {
    threadId = findThreadByRecordId(response.messages, itemId);
  }

  if (!threadId) {
    throw new Error(`Could not find thread for item ${itemId}`);
  }

  return threadId;
};

