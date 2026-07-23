import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agentAuth";
import { ensureMoradorIntelbrasUserId } from "@/lib/jobs/process";

export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const jobs = await prisma.provisioningJob.findMany({
    where: {
      status: "PENDENTE",
      dispositivo: { connectionMode: "AGENT", condominioId: auth.condominioId },
    },
    include: {
      dispositivo: true,
      cadastroFacial: { include: { morador: true } },
    },
  });

  const payload = [];
  for (const job of jobs) {
    const { foto, morador } = job.cadastroFacial;
    if (!foto) {
      await prisma.provisioningJob.update({
        where: { id: job.id },
        data: { status: "ERRO", ultimoErro: "Cadastro sem foto associada." },
      });
      continue;
    }

    const userId = await ensureMoradorIntelbrasUserId(morador.id);

    await prisma.provisioningJob.update({
      where: { id: job.id },
      data: { status: "PROCESSANDO" },
    });

    payload.push({
      id: job.id,
      dispositivo: {
        ip: job.dispositivo.ip,
        usuario: job.dispositivo.usuario,
        senha: job.dispositivo.senha,
        canalPorta: job.dispositivo.canalPorta,
      },
      userId,
      userName: morador.nome,
      photoBase64: foto,
    });
  }

  return NextResponse.json({ jobs: payload });
}
