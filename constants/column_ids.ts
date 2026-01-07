/**
 * Column IDs for Slack List
 */
export const COLUMN_IDS = {
  NAME: "Col0A5A5QH938",
  STATUS: "Col0A5R57L6BT",
  TICKET: "Col0A5FQV5R6Y",
  MR: "Col0A66GJ86TS",
  ASSIGNEE: "Col0A5C7B91CJ",
  REVIEWERS: "Col0A5A6ED7PG",
} as const;

/**
 * Status Values for Slack List
 */
export const STATUS_VALUES = {
  TO_DO: "Opt0PK8Q1Z6",
  IN_DEV: "OptSXQCQZDI",
  READY_FOR_REVIEW: "OptK1BA3HFX",
  CONFLICTS_ISSUES: "OptDSTK5AEL",
  READY_TO_MERGE: "OptD4D5WVZW",
  TESTING: "OptHY01MHIK",
  RESOLVED: "OptBS8ZOJVQ",
  DONE: "OptYVVRSNRM",
} as const;

