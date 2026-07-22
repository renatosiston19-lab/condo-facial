import { NextRequest, NextResponse } from "next/server";
import { limparFotosAntigas } from "@/lib/jobs/cleanup";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resultado = await limparFotosAntigas();
  return NextResponse.json(resultado);
}
