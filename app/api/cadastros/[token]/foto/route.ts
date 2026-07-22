import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processPendingJobsForCadastro } from "@/lib/jobs/process";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const cadastro = await prisma.cadastroFacial.findUnique({
    where: { token },
    include: { morador: { include: { condominio: { include: { dispositivos: true } } } } },
  });

  if (!cadastro) {
    return NextResponse.json({ error: "Link de cadastro não encontrado." }, { status: 404 });
  }
  if (cadastro.expiraEm < new Date()) {
    return NextResponse.json({ error: "Este link expirou. Peça um novo à administração." }, { status: 410 });
  }
  if (cadastro.status !== "PENDENTE") {
    return NextResponse.json({ error: "Este link já foi utilizado." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const fotoRaw = body?.foto as string | undefined;
  if (!fotoRaw) {
    return NextResponse.json({ error: "Foto não enviada." }, { status: 400 });
  }
  const foto = fotoRaw.replace(/^data:image\/\w+;base64,/, "");

  const dispositivos = cadastro.morador.condominio.dispositivos;
  if (dispositivos.length === 0) {
    return NextResponse.json(
      { error: "Nenhum equipamento configurado para este condomínio." },
      { status: 422 },
    );
  }

  await prisma.$transaction([
    prisma.cadastroFacial.update({
      where: { id: cadastro.id },
      data: { foto, status: "FOTO_ENVIADA" },
    }),
    prisma.provisioningJob.createMany({
      data: dispositivos.map((d) => ({
        cadastroFacialId: cadastro.id,
        dispositivoId: d.id,
      })),
    }),
  ]);

  await processPendingJobsForCadastro(cadastro.id);

  const updated = await prisma.cadastroFacial.findUniqueOrThrow({ where: { id: cadastro.id } });
  return NextResponse.json({ status: updated.status, erro: updated.erro });
}
