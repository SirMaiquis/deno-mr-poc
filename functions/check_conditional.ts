import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const CheckConditionalFunction = DefineFunction({
  callback_id: "check_conditional",
  title: "Check Conditional",
  description: "Evaluates a conditional expression",
  source_file: "functions/check_conditional.ts",
  input_parameters: {
    properties: {
      left: {
        type: Schema.types.boolean,
        description: "Left operand",
      },
      operator: {
        type: Schema.types.string,
        description: "Comparison operator (==, !=)",
      },
      right: {
        type: Schema.types.boolean,
        description: "Right operand",
      },
    },
    required: ["left", "operator", "right"],
  },
  output_parameters: {
    properties: {
      result: {
        type: Schema.types.boolean,
        description: "Evaluation result",
      },
    },
    required: ["result"],
  },
});

const evaluateCondition = (left: boolean, operator: string, right: boolean): boolean => {
  switch (operator) {
    case "==":
    case "===":
      return left === right;
    case "!=":
    case "!==":
      return left !== right;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
};

export default SlackFunction(
  CheckConditionalFunction,
  async ({ inputs }) => {
    const { left, operator, right } = inputs;

    try {
      const result = evaluateCondition(left, operator, right);
      return { outputs: { result } };
    } catch (error) {
      return { error: `Error evaluating condition: ${error.message}` };
    }
  }
);
