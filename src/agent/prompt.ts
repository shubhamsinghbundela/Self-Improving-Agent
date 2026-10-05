import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../config";

export async function loadPrompt(version: string): Promise<string> {
  const promptPath = path.join(import.meta.dir, "prompts", `${version}.md`);
  const template = await readFile(promptPath, "utf-8");
  return template.replaceAll("{{TODAY}}", CONFIG.today);
}
