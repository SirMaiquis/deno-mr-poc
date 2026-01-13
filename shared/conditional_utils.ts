import { DEFAULT_RESPONSE } from "../constants/default_response.ts";

export const shouldExecute = (conditional: boolean | undefined): boolean => {
  return conditional === undefined ? true : conditional;
};

export const handleConditional = (conditional: boolean | undefined) => {
  console.log("handleConditional conditional", JSON.stringify(conditional));
  if (!shouldExecute(conditional)) {
    return { skip: true, response: DEFAULT_RESPONSE };
  }
  return { skip: false };
};

