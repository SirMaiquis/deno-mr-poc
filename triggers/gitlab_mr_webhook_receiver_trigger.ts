import { Trigger } from "deno-slack-api/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import GitlabMRWebhookReceiveWorkflow from "../workflows/gitlab_mr_webhook_receive_workflow.ts";

const gitlabMRWebhookReceiverTrigger: Trigger<typeof GitlabMRWebhookReceiveWorkflow.definition> = {
  type: TriggerTypes.Webhook,
  name: "Receive Gitlab MR Webhook",
  description: "Receives a Gitlab MR webhook and updates the MR list item status",
  workflow: "#/workflows/gitlab_mr_webhook_receive_workflow",
  inputs: {
    request_body: {
      value: "{{data}}",
    },
  },
};

export default gitlabMRWebhookReceiverTrigger;

