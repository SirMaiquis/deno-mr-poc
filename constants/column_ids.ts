/**
 * Column IDs for Slack List
 */
export const COLUMN_NAMES = {
  NAME: "Name",
  STATUS: "Status",
  TICKET: "Ticket",
  MR: "MR",
  ASSIGNEE: "Assignee",
  REVIEWERS: "Reviewers",
} as const;

/**
 * Status Values for Slack List
 */
export const STATUS_VALUES = {
  TO_DO: "TO DO",
  IN_DEV: "IN DEV",
  READY_FOR_REVIEW: "READY FOR REVIEW",
  CONFLICTS_ISSUES: "CONFLICTS/ISSUES",
  READY_TO_MERGE: "READY TO MERGE",
  TESTING: "TESTING",
  RESOLVED: "RESOLVED/READY FOR PROD",
  DONE: "DONE",
} as const;

