import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * Function to check if an item exists in a Slack list
 */
export const CheckConditionalFunction = DefineFunction({
  callback_id: "check_conditional",
  title: "Check Conditional",
  description: "Checks a conditional expression",
  source_file: "functions/check_conditional.ts",
  input_parameters: {
    properties: {
      left: {
        type: Schema.types.boolean,
        description: "The left side of the conditional",
      },
      operator: {
        type: Schema.types.string,
        description: "The operator of the conditional (==, !=, >, >=, <, <=)",
      },
      right: {
        type: Schema.types.boolean,
        description: "The right side of the conditional",
      },
    },
    required: ["left", "operator", "right"],
  },
  output_parameters: {
    properties: {
      result: {
        type: Schema.types.boolean,
        description: "The result of the conditional evaluation",
      },
    },
    required: ["result"],
  },
});

/**
 * Handler function that evaluates a conditional expression
 */
export default SlackFunction(
  CheckConditionalFunction,
  async ({ inputs }) => {
    const { left, operator, right } = inputs;

    try {
      let result: boolean;

      // Safely evaluate the conditional without using eval()
      switch (operator) {
        case "==":
        case "===":
          result = left === right;
          break;
        case "!=":
        case "!==":
          result = left !== right;
          break;
        default:
          return {
            error: `Unsupported operator: ${operator}. Supported operators: ==, !=`,
          };
      }

      console.log("Conditional result:", left, operator, right, "=>", result);

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