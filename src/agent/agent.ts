import { CONFIG } from "../config";
import type { ConversationState } from "../types";
import { openai } from "./client";
import { executeTool, toolDefinitions } from "./tools";

const LIMIT_REPLY =
  "Sorry, I'm having trouble completing this. Please call the clinic and our staff will help you.";

export async function runTurn(
  state: ConversationState,
  userMessage: string,
): Promise<string> {
  state.messages.push({ role: "user", content: userMessage });

  let toolCallsThisTurn = 0;
  let limitReached = false;

  while (true) {
    const response = await openai.chat.completions.create({
      model: CONFIG.agentModel,
      messages: state.messages,
      tools: toolDefinitions,
      temperature: 0,
    });

    const assistantMessage = response.choices[0]!.message;
    state.messages.push(assistantMessage);

    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content ?? "";
    }

    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type !== "function") continue;

      let toolResult: unknown;
      if (toolCallsThisTurn >= CONFIG.maxToolCallsPerTurn) {
        limitReached = true;
        toolResult = {
          ok: false,
          error: "Tool call limit reached for this turn.",
        };
      } else {
        toolCallsThisTurn++;
        toolResult = executeTool(
          state,
          toolCall.function.name,
          toolCall.function.arguments,
        );
      }

      state.messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }

    if (limitReached) {
      state.messages.push({ role: "assistant", content: LIMIT_REPLY });
      return LIMIT_REPLY;
    }
  }
}
