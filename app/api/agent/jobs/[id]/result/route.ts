import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agentAuth";
import { syncCadastroStatus } from "@/lib/jobs/process";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.provisioningJob.findUnique({
    where: { id },
    include: { dispositivo: true },
  });

  if (!job || job.dispositivo.condominioId !== auth.condominioId) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status as "CONCLUIDO" | "ERRO" | undefined;
  const erro = body?.erro as string | undefined;

  if (status !== "CONCLUIDO" && status !== "ERRO") {
    return NextResponse.json({ error: "status inválido." }, { status: 400 });
  }

  await prisma.provisioningJob.update({
    where: { id },
    data:
      status === "CONCLUIDO"
        ? { status: "CONCLUIDO" }
        : { status: "ERRO", ultimoErro: erro ?? "Erro desconhecido no agente.", tentativas: { increment: 1 } },
  });

  await syncCadastroStatus(job.cadastroFacialId);

  return NextResponse.json({ ok: true });
}
