import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { GitLabMergeRequestWebhookPayload, GitLabNoteWebhookPayload, GitLabWebhookPayload } from "../types/gitlab.types.ts";
import { processMergeRequestWebhook, processNoteWebhook } from "../sertvices/webhook-router.service.ts";
import { SlackPayload, UpdateMRStatusPayload } from "../types/slack.types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";

export const GitlabMRWebhookReceiverFunction = DefineFunction({
  callback_id: "gitlab_mr_webhook_receiver",
  title: "Gitlab MR Webhook Receiver",
  description: "Receives a Gitlab MR webhook and updates the MR list item status",
  source_file: "functions/gitlab_mr_webhook_receiver.ts",
  input_parameters: {
    properties: {
      request_body: {
        type: Schema.types.object,
        description: "The request body of the Gitlab MR webhook",
      },
    },
    required: ["request_body"],
  },
  output_parameters: {
    properties: {
      success: {
        type: Schema.types.boolean,
        description: "Whether the Gitlab MR webhook was received successfully",
      },
    },
    required: ["success"],
  },
});

export default SlackFunction(
  GitlabMRWebhookReceiverFunction,
  async ({ inputs, client }) => {
    const { request_body } = inputs;

    try {
      console.log("GitlabMRWebhookReceiverFunction request_body", JSON.stringify(request_body));

      try {
        const payload = request_body as GitLabWebhookPayload;
        let result: SlackPayload | UpdateMRStatusPayload | null = null;
        
        switch (payload.object_kind) {
          case 'merge_request':
            result = await processMergeRequestWebhook(payload as GitLabMergeRequestWebhookPayload);
            break;
          
          case 'note':
            result = await processNoteWebhook(payload as GitLabNoteWebhookPayload);
            break;
          
          default:
            console.log(`Unhandled webhook type: ${(payload as any).object_kind}`);
        }

        if (!result) {
          return { outputs: { success: false, error: 'No result from processMergeRequestWebhook' } };
        }

        const scheduleDate = new Date();
        scheduleDate.setSeconds(scheduleDate.getSeconds() + 10);
        const randomString = Math.random().toString(36).substring(2, 15);

        if (result && 'assignee' in result) {
          const scheduledTrigger = await client.workflows.triggers.create({
            name: `Add MR to Slack ${randomString}`,
            type: TriggerTypes.Scheduled,
            workflow: `#/workflows/mr_list_workflow`,
            inputs: {
              list_id: { value: result.list_id },
              item_name: { value: result.item_name },
              ticket_link: { value: result.ticket_link },
              mr_link: { value: result.mr_link },
              assignee: { value: result.assignee },
              reviewers: { value: result.reviewers },
              team_id: { value: result.team_id },
              notification_user_id: { value: result.notification_user_id },
            },
            schedule: {
              start_time: scheduleDate.toISOString(),
              timezone: "America/Santo_Domingo",
              frequency: {
                type: "once",
              },
            },
          });
          if (!scheduledTrigger || !scheduledTrigger.ok) {
            return {
              error: "Trigger could not be created",
            };
          }
          console.log('Successfully created trigger to add MR to Slack', scheduledTrigger);
        } else if (result && !('assignee' in result)) {
          const updateMRStatusPayload = result as UpdateMRStatusPayload;
          const scheduledTrigger = await client.workflows.triggers.create({
            name: `Update MR List Item Status ${randomString}`,
            type: TriggerTypes.Scheduled,
            workflow: `#/workflows/mr_list_update_status_workflow`,
            inputs: {
              list_id: { value: updateMRStatusPayload.list_id },
              item_name: { value: updateMRStatusPayload.item_name },
              status_key: { value: updateMRStatusPayload.status_key },
              team_id: { value: updateMRStatusPayload.team_id },
            },
            schedule: {
              start_time: scheduleDate.toISOString(),
              timezone: "America/Santo_Domingo",
              frequency: {
                type: "once",
              },
            },
          });
          if (!scheduledTrigger || !scheduledTrigger.trigger) {
            return {
              error: "Trigger could not be created",
            };
          }
          console.log('Successfully created trigger to update MR List Item Status', scheduledTrigger);
        }
        console.log('Successfully created triggers');
        return { outputs: { success: true } };
      } catch (error) {
        console.error('Error processing webhook:', error);
        return { outputs: { success: false, error: error.message } };
      }
    } catch (error) {
      return { error: `Error receiving Gitlab MR webhook: ${error.message}` };
    }
  }
);


