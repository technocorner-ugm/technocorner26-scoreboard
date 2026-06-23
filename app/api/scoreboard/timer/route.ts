import { getScoreboardStore } from "@/lib/scoreboard-store";
import type { TimerCommand } from "@/lib/scoreboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const command = (await request.json()) as TimerCommand;

  if (!command?.room || !command?.target || !command?.action) {
    return Response.json({ message: "Invalid timer command" }, { status: 400 });
  }

  return Response.json(getScoreboardStore().commandTimer(command));
}
