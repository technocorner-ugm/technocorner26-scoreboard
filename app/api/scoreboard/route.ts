import { getScoreboardStore } from "@/lib/scoreboard-store";
import type { RoomTarget, ScoreboardPatch } from "@/lib/scoreboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json(getScoreboardStore().getSnapshot());
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as ScoreboardPatch;

  if (!payload?.room || !payload?.state) {
    return Response.json({ message: "Invalid scoreboard payload" }, { status: 400 });
  }

  return Response.json(getScoreboardStore().patch(payload));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = (searchParams.get("room") ?? "all") as RoomTarget;

  return Response.json(getScoreboardStore().reset(target));
}
