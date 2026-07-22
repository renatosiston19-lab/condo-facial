import { prisma } from "@/lib/db";

const RETENCAO_FOTO_DIAS = 5;

/**
 * Remove a foto (base64) dos cadastros concluídos há mais de RETENCAO_FOTO_DIAS
 * dias. A foto só existe para o processamento inicial; depois de cadastrada no
 * equipamento, mantê-la no banco é desperdício de espaço.
 */
export async function limparFotosAntigas(): Promise<{ quantidade: number }> {
  const limite = new Date(Date.now() - RETENCAO_FOTO_DIAS * 24 * 60 * 60 * 1000);

  const { count } = await prisma.cadastroFacial.updateMany({
    where: {
      status: "CONCLUIDO",
      foto: { not: null },
      updatedAt: { lt: limite },
    },
    data: { foto: null },
  });

  return { quantidade: count };
}
