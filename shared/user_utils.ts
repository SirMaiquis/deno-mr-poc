export const getUsersByEmails = async (
  client: any,
  emails: string[],
  teamId: string
): Promise<Record<string, { ok: boolean; user?: any; error?: string }>> => {
  const lookupPromises = emails.map(async (email) => {
    try {
      const response = await client.apiCall("users.lookupByEmail", {
        email,
        team_id: teamId,
      });
      return { email, response };
    } catch (error: any) {
      return { 
        email, 
        response: { 
          ok: false, 
          error: error?.message || String(error) 
        } 
      };
    }
  });

  const results = await Promise.all(lookupPromises);
  
  const resultObject: Record<string, { ok: boolean; user?: any; error?: string }> = {};
  for (const { email, response } of results) {
    resultObject[email] = response;
  }
  
  return resultObject;
};

export const getUserByEmail = async (
  client: any,
  email: string,
  teamId: string
) => {
  const usersByEmail = await getUsersByEmails(client, [email], teamId);
  const response = usersByEmail[email];
  
  if (!response || !response.ok || !response.user) {
    return null;
  }
  
  return response.user;
};

