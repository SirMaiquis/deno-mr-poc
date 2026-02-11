import { 
  GitLabWebhookPayload, 
  GitLabMergeRequestWebhookPayload,
  GitLabNoteWebhookPayload,
  GitLabMergeRequestAttributes,
  SlackPayload, 
  UpdateMRStatusPayload, 
  MRStatusKey 
} from '../types/index.ts';
import { PROJECTS_DATA, USERS_EMAILS } from '../config/constants.ts';

/**
 * Strips the "Draft: " prefix from MR title if present
 */
function stripDraftPrefix(title: string): string {
  const draftPrefix = 'Draft: ';
  if (title.startsWith(draftPrefix)) {
    return title.slice(draftPrefix.length);
  }
  return title;
}

/**
 * Maps GitLab detailed_merge_status to Slack MR status key
 */
export function mapDetailedStatusToSlackStatus(detailedStatus: string | undefined): MRStatusKey | null {
  switch (detailedStatus) {
    case 'draft_status':
      return 'IN_DEV';
    case 'mergeable':
      return 'READY_TO_MERGE';
    case "not_open":
      return 'CLOSED';
    case "discussions_not_resolved":
      return "PENDING_COMMENTS"
    case "conflict":
      return "CONFLICTS_ISSUES"
    default:
      return null;
  }
}

/**
 * Updates MR status in Slack based on merge request attributes
 * Shared logic used by both merge_request update events and note events
 */
export async function updateMRStatus(
  mrAttributes: GitLabMergeRequestAttributes, 
  projectName: string
): Promise<UpdateMRStatusPayload | null> {
  const projectData = PROJECTS_DATA[projectName];
  if (!projectData) {
    console.error('Project data not found for:', projectName);
    return null;
  }

  if (mrAttributes.target_branch !== projectData.defaultBranch) {
    console.log(`Target branch ${mrAttributes.target_branch} does not match default branch ${projectData.defaultBranch}`);
    return null;
  }

  const slackStatus = mapDetailedStatusToSlackStatus(mrAttributes.detailed_merge_status);
  
  if (!slackStatus) {
    console.log(`No status mapping for detailed_merge_status: ${mrAttributes.detailed_merge_status}`);
    return null;
  }

  const itemName = stripDraftPrefix(mrAttributes.title);

  const updatePayload: UpdateMRStatusPayload = {
    list_id: projectData.listId,
    item_name: itemName,
    status_key: slackStatus,
    team_id: projectData.teamId
  };

  console.log('Updating MR status in Slack:', updatePayload);
  //await updateMRStatusInSlack(updatePayload);
  console.log(`Successfully updated MR status to ${slackStatus}`);
  return updatePayload;
}

/**
 * Processes GitLab merge request "open" action - creates new MR in Slack
 */
export async function processOpenMergeRequest(payload: GitLabMergeRequestWebhookPayload): Promise<SlackPayload | null> {
  const { object_attributes } = payload;
  
  console.log('Processing OPEN merge request...');

  const projectData = PROJECTS_DATA[payload.project.name];
  if (!projectData) {
    console.error('Project data not found for:', payload.project.name);
    return null;
  }

  if (object_attributes.target_branch !== projectData.defaultBranch) {
    console.log(`Target branch ${object_attributes.target_branch} does not match default branch ${projectData.defaultBranch}`);
    return null;
  }

  const assigneeEmail = USERS_EMAILS[payload.assignees?.[0]?.username || ''];
  if (!assigneeEmail) {
    console.error('Assignee email not found for:', payload.assignees?.[0]?.username);
  }

  const reviewersEmails = payload.reviewers?.length
    ? payload.reviewers.map(r => USERS_EMAILS[r.username])
    : (projectData.defaultReviewerEmails ?? []).filter(
        (email) => !assigneeEmail || email !== assigneeEmail
      );
  const ticketNumber = object_attributes?.title?.split(':')?.length > 1 ? object_attributes?.title?.split(':')[1] : '';
  const ticketLink = `https://paciolan.atlassian.net/browse/${ticketNumber}`;

  const slackPayload: SlackPayload = {
    list_id: projectData.listId,
    item_name: object_attributes.title,
    ticket_link: ticketLink,
    mr_link: object_attributes.url,
    assignee: assigneeEmail,
    reviewers: reviewersEmails?.join(',') || '',
    team_id: projectData.teamId,
    notification_user_id: projectData.notificationUserId
  };

  console.log('Sending new MR to Slack:', slackPayload);
  //await sendMergeRequestToSlack(slackPayload);
  console.log('Successfully created MR in Slack');
  return slackPayload;
}

/**
 * Processes GitLab merge request "update" action - updates MR status in Slack
 */
export async function processUpdateMergeRequest(payload: GitLabMergeRequestWebhookPayload): Promise<UpdateMRStatusPayload | null> {
  console.log('Processing UPDATE merge request...');
  return await updateMRStatus(payload.object_attributes, payload.project.name);
}

/**
 * Main handler for merge request webhooks
 */
export async function processMergeRequestWebhook(payload: GitLabMergeRequestWebhookPayload): Promise<SlackPayload | UpdateMRStatusPayload | null> {
  const { object_attributes } = payload;
  const action = object_attributes.action;

  console.log(`Merge request action: ${action}`);

  switch (action) {
    case 'open':
      return await processOpenMergeRequest(payload);
      break;
    
    case 'update':
      return await processUpdateMergeRequest(payload);
      break;

    case 'close':
      return await processUpdateMergeRequest(payload);
      break;

    case 'reopen':
      return await processUpdateMergeRequest(payload);
      break;
      
    default:
      console.log(`Unhandled merge request action: ${action}`);
      return null;
  }
}

/**
 * Processes GitLab note (comment) webhooks on merge requests
 */
export async function processNoteWebhook(payload: GitLabNoteWebhookPayload): Promise<UpdateMRStatusPayload | null> {
  const { object_attributes, merge_request } = payload;

  if (object_attributes.noteable_type !== 'MergeRequest') {
    console.log(`Note is not on a merge request, skipping. Type: ${object_attributes.noteable_type}`);
    return null;
  }

  if (!merge_request) {
    console.error('Note is on a merge request but merge_request data is missing');
    return null;
  }

  console.log('Processing NOTE on merge request...');
  console.log(`Note action: ${object_attributes.action}, Discussion ID: ${object_attributes.discussion_id}`);
  
  return await updateMRStatus(merge_request, payload.project.name);
}
