import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/app.config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    app: APP_CONFIG.name,
  });
}
