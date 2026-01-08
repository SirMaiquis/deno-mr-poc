export const getUsersByEmails = async (
  client: any,
  emails: string[],
  teamId: string
) => {
  const response = await client.apiCall("users.list", {
    limit: 1000,
    team_id: teamId,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user list: ${JSON.stringify(response)}`);
  }

  const users = response.members || [];
  return emails.map((email) =>
    users.find((user: any) => user?.profile?.email === email)
  ).filter(Boolean);
};

export const getUserByEmail = async (
  client: any,
  email: string,
  teamId: string
) => {
  const users = await getUsersByEmails(client, [email], teamId);
  return users[0];
};

