import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * Function to check if an item exists in a Slack list
 */
export const CheckConditionalFunction = DefineFunction({
  callback_id: "check_conditional",
  title: "Check Conditional",
  description: "Checks a conditional",
  source_file: "functions/check_conditional.ts",
  input_parameters: {
    properties: {
      left: {
        type: Schema.types.string,
        description: "The left side of the conditional",
      },
      operator: {
        type: Schema.types.string,
        description: "The operator of the conditional",
      },
      right: {
        type: Schema.types.string,
        description: "The right side of the conditional",
      },
    },
    required: ["left", "operator", "right"],
  },
  output_parameters: {
    properties: {
      result: {
        type: Schema.types.string,
        description: "The result of the conditional",
      },
    },
    required: ["result"],
  },
});

/**
 * Handler function that gets a thread by item ID
 */
export default SlackFunction(
  CheckConditionalFunction,
  async ({ inputs }) => {
    const { left, operator, right } = inputs;

    try {
      const result = eval(`${left} ${operator} ${right}`);

      return {
        outputs: {
          result: result,
        },
      };

    } catch (error) {
      return {
        error: `Error checking conditional: ${error.message}`,
      };
    }
  },
);