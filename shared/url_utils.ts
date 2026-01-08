export const extractDisplayName = (url: string): string => {
  const lastPart = url.split("/").pop() || "";
  return lastPart.split("?")[0];
};

export const createLinkField = (url: string) => {
  return [{
    original_url: url,
    display_as_url: false,
    display_name: extractDisplayName(url),
  }];
};

