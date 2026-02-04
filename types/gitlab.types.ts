export interface GitLabUser {
  id: number;
  name: string;
  username: string;
  avatar_url: string;
  email: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  web_url: string;
  path_with_namespace: string;
  default_branch?: string;
}

/**
 * Merge request actions from GitLab webhooks
 */
export type MergeRequestAction = 'open' | 'update' | 'close' | 'reopen' | 'merge' | 'approved' | 'unapproved';

/**
 * Detailed merge status values from GitLab
 * @see https://docs.gitlab.com/ee/api/merge_requests.html
 */
export type DetailedMergeStatus = 
  | 'draft_status'           // MR is a draft
  | 'mergeable'              // MR can be merged
  | 'not_open'               // MR is not open
  | 'discussions_not_resolved' // Has unresolved discussions
  | 'ci_must_pass'           // CI pipeline must pass
  | 'need_rebase'            // Needs rebase
  | 'conflict'               // Has merge conflicts
  | 'unchecked'              // Not yet checked
  | 'checking'               // Currently being checked
  | 'blocked_status'         // Blocked by another MR
  | 'approvals_syncing';     // Approvals are syncing

export interface GitLabMergeRequestAttributes {
  id: number;
  iid: number;
  title: string;
  state: string;
  target_branch: string;
  source_branch: string;
  url: string;
  action?: MergeRequestAction;
  assignee_ids?: number[];
  reviewer_ids?: number[];
  /** Detailed status of the merge request */
  detailed_merge_status?: DetailedMergeStatus;
  /** Whether the MR is a draft/WIP */
  draft?: boolean;
  work_in_progress?: boolean;
  /** Merge status (legacy field) */
  merge_status?: string;
}

/**
 * Note (comment) attributes from GitLab webhooks
 */
export interface GitLabNoteAttributes {
  id: number;
  note: string;
  noteable_type: string; // "MergeRequest", "Issue", "Commit", etc.
  noteable_id: number;
  author_id: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  discussion_id: string;
  type?: string; // "DiscussionNote", etc.
  action?: string; // "create", "update", etc.
  url: string;
}

/**
 * Merge request webhook payload
 */
export interface GitLabMergeRequestWebhookPayload {
  object_kind: 'merge_request';
  event_type: string;
  user: GitLabUser;
  project: GitLabProject;
  object_attributes: GitLabMergeRequestAttributes;
  assignees?: GitLabUser[];
  reviewers?: GitLabUser[];
  /** Changes made in update events */
  changes?: Record<string, { previous: unknown; current: unknown }>;
}

/**
 * Note (comment) webhook payload
 */
export interface GitLabNoteWebhookPayload {
  object_kind: 'note';
  event_type: string;
  user: GitLabUser;
  project: GitLabProject;
  project_id: number;
  object_attributes: GitLabNoteAttributes;
  /** Merge request details (present when note is on a MR) */
  merge_request?: GitLabMergeRequestAttributes;
}

/**
 * Union type for all GitLab webhook payloads
 */
export type GitLabWebhookPayload = GitLabMergeRequestWebhookPayload | GitLabNoteWebhookPayload;
