/**
 * Payload for adding a new merge request to a Slack list
 */
export interface SlackPayload {
  list_id: string;
  item_name: string;
  ticket_link: string;
  mr_link: string;
  assignee: string;
  reviewers: string;
  team_id: string;
  notification_user_id: string;
}

/**
 * Payload for sending bulk reminders
 */
export interface BulkReminderPayload {
  list_id: string;
  team_id: string;
}

/**
 * Status keys for MR list items in Slack
 */
export type MRStatusKey = 
  | 'IN_DEV'           // MR is in development (draft)
  | 'READY_TO_REVIEW'  // MR is ready for review
  | 'READY_TO_MERGE'   // MR is approved and ready to merge
  | 'CLOSED'           // MR is closed
  | 'CONFLICTS_ISSUES' // MR has conflict issues
  | 'PENDING_COMMENTS' // MR has pending comments

/**
 * Payload for updating merge request status in Slack
 */
export interface UpdateMRStatusPayload {
  list_id: string;
  item_name: string;
  status_key: MRStatusKey;
  team_id: string;
}
