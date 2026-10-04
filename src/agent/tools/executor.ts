import type { ConversationState } from "../../types";
import type { Result } from "./handlers";
import { TOOLS } from "./registry";

export function executeTool(
  state: ConversationState,
  toolName: string,
  rawArguments: string,
): Result {
  let toolResult: Result;
  let loggedInput: unknown = rawArguments; // JSON parse fail ho to raw string hi log hogi

  try {
    const tool = TOOLS[toolName];

    if (!tool) {
      toolResult = { ok: false, error: `Unknown tool: ${toolName}` };
    } else {
      const parsedInput = JSON.parse(rawArguments || "{}");
      loggedInput = parsedInput;

      const validation = tool.schema.safeParse(parsedInput);
      toolResult = validation.success
        ? tool.run(state, validation.data)
        : {
            ok: false,
            error: "Invalid arguments: " + validation.error.message,
          };
    }
  } catch (error) {
    toolResult = {
      ok: false,
      error: "Tool crashed: " + (error as Error).message,
    };
  }

  state.toolLog.push({
    name: toolName,
    input: loggedInput,
    output: toolResult,
    ok: toolResult.ok,
  });

  return toolResult;
}
