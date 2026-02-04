import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { GitlabMRWebhookReceiverFunction } from "../functions/gitlab_mr_webhook_receiver.ts";

export const GitlabMRWebhookReceiveWorkflow = DefineWorkflow({
  callback_id: "gitlab_mr_webhook_receive_workflow",
  title: "Gitlab MR Webhook Receive Workflow",
  description: "Receives a Gitlab MR webhook and updates the MR list item status",
  input_parameters: {
    properties: {
      request_body: {
        type: Schema.types.object,
        description: "The request body of the Gitlab MR webhook",
      },
    },
    required: ["request_body"],
  },
}); 

const receiveWebhookStep = GitlabMRWebhookReceiveWorkflow.addStep(
  GitlabMRWebhookReceiverFunction,
  {
    request_body: GitlabMRWebhookReceiveWorkflow.inputs.request_body,
  }
);

export default GitlabMRWebhookReceiveWorkflow;