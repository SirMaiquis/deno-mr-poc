export const buildRichTextField = (columnId: string, text: string) => ({
  column_id: columnId,
  rich_text: [
    {
      type: "rich_text",
      elements: [
        {
          type: "rich_text_section",
          elements: [{ type: "text", text }],
        },
      ],
    },
  ],
});

export const buildLinkField = (columnId: string, url: string, displayName: string) => ({
  column_id: columnId,
  link: [
    {
      original_url: url,
      display_as_url: false,
      display_name: displayName,
    },
  ],
});

export const buildUserField = (columnId: string, userIds: string[]) => ({
  column_id: columnId,
  user: userIds,
});

export const buildSelectField = (columnId: string, value: string) => ({
  column_id: columnId,
  select: [value],
});

