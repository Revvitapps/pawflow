import { NextResponse } from "next/server";

import { runAiAction } from "@/lib/actions";

export async function POST(request: Request) {
  const { task, payload } = (await request.json()) as { task: string; payload: unknown };

  try {
    const output = await runAiAction(task, payload);
    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
