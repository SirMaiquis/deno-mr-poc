import { DEFAULT_RESPONSE } from "../constants/default_response.ts";

export const shouldExecute = (conditional: boolean | undefined): boolean => {
  return conditional === undefined ? true : conditional;
};

export const handleConditional = (conditional: boolean | undefined) => {
  if (!shouldExecute(conditional)) {
    return { skip: true, response: DEFAULT_RESPONSE };
  }
  return { skip: false };
};

