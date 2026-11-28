import { confirm } from "@inquirer/prompts";

export async function confirmInstall(message: string): Promise<boolean> {
  return confirm({ message, default: false });
}
