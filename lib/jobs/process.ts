import { prisma } from "@/lib/db";
import { createUser, addFace, IntelbrasError } from "@/lib/intelbras/client";

/** Gera um UserID numérico simples para o equipamento Intelbras. */
function generateIntelbrasUserId(): string {
  return String(Date.now()).slice(-8);
}

async function ensureMoradorIntelbrasUserId(moradorId: string): Promise<string> {
  const morador = await prisma.morador.findUniqueOrThrow({ where: { id: moradorId } });
  if (morador.intelbrasUserId) return morador.intelbrasUserId;

  const userId = generateIntelbrasUserId();
  await prisma.morador.update({
    where: { id: moradorId },
    data: { intelbrasUserId: userId },
  });
  return userId;
}

async function syncCadastroStatus(cadastroFacialId: string): Promise<void> {
  const jobs = await prisma.provisioningJob.findMany({
    where: { cadastroFacialId },
  });

  if (jobs.some((j) => j.status === "ERRO")) {
    const failedJob = jobs.find((j) => j.status === "ERRO");
    await prisma.cadastroFacial.update({
      where: { id: cadastroFacialId },
      data: { status: "ERRO", erro: failedJob?.ultimoErro ?? "Falha desconhecida" },
    });
    return;
  }

  if (jobs.every((j) => j.status === "CONCLUIDO") && jobs.length > 0) {
    await prisma.cadastroFacial.update({
      where: { id: cadastroFacialId },
      data: { status: "CONCLUIDO" },
    });
    return;
  }

  await prisma.cadastroFacial.update({
    where: { id: cadastroFacialId },
    data: { status: "PROCESSANDO" },
  });
}

/** Processa um único job de provisionamento contra o equipamento (modo DIRECT). */
export async function processJob(jobId: string): Promise<void> {
  const job = await prisma.provisioningJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { dispositivo: true, cadastroFacial: { include: { morador: true } } },
  });

  if (job.dispositivo.connectionMode !== "DIRECT") {
    // Modo AGENT: o agente local é quem processa este job (ainda não implementado).
    return;
  }

  await prisma.provisioningJob.update({
    where: { id: jobId },
    data: { status: "PROCESSANDO" },
  });

  try {
    const { morador, foto } = job.cadastroFacial;
    if (!foto) throw new Error("Cadastro sem foto associada.");

    const userId = await ensureMoradorIntelbrasUserId(morador.id);
    const device = {
      ip: job.dispositivo.ip,
      usuario: job.dispositivo.usuario,
      senha: job.dispositivo.senha,
      canalPorta: job.dispositivo.canalPorta,
    };

    await createUser(device, { userId, userName: morador.nome });
    await addFace(device, { userId, photoBase64: foto });

    await prisma.provisioningJob.update({
      where: { id: jobId },
      data: { status: "CONCLUIDO" },
    });
  } catch (error) {
    const message =
      error instanceof IntelbrasError
        ? `${error.message} — ${JSON.stringify(error.body)}`
        : error instanceof Error
          ? error.message
          : "Erro desconhecido ao comunicar com o equipamento.";

    await prisma.provisioningJob.update({
      where: { id: jobId },
      data: { status: "ERRO", ultimoErro: message, tentativas: { increment: 1 } },
    });
  }

  await syncCadastroStatus(job.cadastroFacialId);
}

/** Processa todos os jobs pendentes (modo DIRECT) de um cadastro facial. */
export async function processPendingJobsForCadastro(cadastroFacialId: string): Promise<void> {
  const jobs = await prisma.provisioningJob.findMany({
    where: { cadastroFacialId, status: "PENDENTE" },
    include: { dispositivo: true },
  });

  for (const job of jobs) {
    if (job.dispositivo.connectionMode === "DIRECT") {
      await processJob(job.id);
    }
  }
}
