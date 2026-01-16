import * as ynab from "ynab";
import { getYnabTokens } from "./tokens";

export async function getYnabClient(userId: string): Promise<ynab.API | null> {
  const tokens = await getYnabTokens(userId);

  if (!tokens) {
    return null;
  }

  return new ynab.API(tokens.accessToken);
}

export { ynab };
