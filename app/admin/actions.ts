"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, hashPassword } from "@/lib/auth";
import { removeFace, removeUser, IntelbrasError } from "@/lib/intelbras/client";
import type { Dispositivo } from "@/app/generated/prisma/client";

const LINK_EXPIRATION_HOURS = 48;

export async function createCondominio(formData: FormData): Promise<void> {
  await requireSession(["MANUTENCAO"]);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome do condomínio é obrigatório.");

  await prisma.condominio.create({ data: { nome } });
  revalidatePath("/admin");
}

export async function createDispositivo(formData: FormData): Promise<void> {
  await requireSession(["MANUTENCAO"]);

  const condominioId = String(formData.get("condominioId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const ip = String(formData.get("ip") ?? "").trim();
  const usuario = String(formData.get("usuario") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const canalPorta = Number(formData.get("canalPorta") ?? 1);
  const connectionMode = String(formData.get("connectionMode") ?? "DIRECT") as "DIRECT" | "AGENT";

  if (!condominioId || !nome || !ip || !usuario || !senha) {
    throw new Error("Preencha todos os campos do dispositivo.");
  }

  await prisma.dispositivo.create({
    data: { condominioId, nome, ip, usuario, senha, canalPorta, connectionMode },
  });
  revalidatePath("/admin");
}

/** Edita um dispositivo existente — inclui trocar o modo de conexão (DIRECT/AGENT). */
export async function atualizarDispositivo(formData: FormData): Promise<void> {
  await requireSession(["MANUTENCAO"]);

  const dispositivoId = String(formData.get("dispositivoId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const ip = String(formData.get("ip") ?? "").trim();
  const usuario = String(formData.get("usuario") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const canalPorta = Number(formData.get("canalPorta") ?? 1);
  const connectionMode = String(formData.get("connectionMode") ?? "DIRECT") as "DIRECT" | "AGENT";

  if (!dispositivoId || !nome || !ip || !usuario || !senha) {
    throw new Error("Preencha todos os campos do dispositivo.");
  }

  await prisma.dispositivo.update({
    where: { id: dispositivoId },
    data: { nome, ip, usuario, senha, canalPorta, connectionMode },
  });
  revalidatePath("/admin");
}

/**
 * Usada tanto pelo /admin (MANUTENCAO, qualquer condomínio) quanto pelo
 * /moradores (SINDICO, apenas o próprio condomínio).
 */
export async function createMorador(formData: FormData): Promise<void> {
  const session = await requireSession(["MANUTENCAO", "SINDICO"]);

  const condominioId = String(formData.get("condominioId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const unidade = String(formData.get("unidade") ?? "").trim();
  const bloco = String(formData.get("bloco") ?? "").trim() || null;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  if (!condominioId || !nome || !unidade) {
    throw new Error("Preencha nome, unidade e selecione o condomínio.");
  }
  if (session.role === "SINDICO" && session.condominioId !== condominioId) {
    throw new Error("Você não tem permissão para cadastrar moradores neste condomínio.");
  }

  await prisma.morador.create({
    data: { condominioId, nome, unidade, bloco, telefone, email },
  });
  revalidatePath("/admin");
  revalidatePath("/moradores");
}

/**
 * Edita os dados cadastrais do morador (nome, bloco, unidade, telefone, e-mail).
 * Não mexe na facial já cadastrada no equipamento.
 */
export async function atualizarMorador(formData: FormData): Promise<void> {
  const session = await requireSession(["MANUTENCAO", "SINDICO"]);

  const moradorId = String(formData.get("moradorId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const unidade = String(formData.get("unidade") ?? "").trim();
  const bloco = String(formData.get("bloco") ?? "").trim() || null;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  if (!moradorId || !nome || !unidade) {
    throw new Error("Preencha nome e unidade.");
  }

  const morador = await prisma.morador.findUniqueOrThrow({ where: { id: moradorId } });
  if (session.role === "SINDICO" && session.condominioId !== morador.condominioId) {
    throw new Error("Você não tem permissão para editar este morador.");
  }

  await prisma.morador.update({
    where: { id: moradorId },
    data: { nome, unidade, bloco, telefone, email },
  });
  revalidatePath("/admin");
  revalidatePath("/moradores");
}

export async function gerarLinkCadastro(formData: FormData): Promise<void> {
  const session = await requireSession(["MANUTENCAO", "SINDICO"]);

  const moradorId = String(formData.get("moradorId") ?? "");
  if (!moradorId) throw new Error("Selecione um morador.");

  const morador = await prisma.morador.findUniqueOrThrow({ where: { id: moradorId } });
  if (session.role === "SINDICO" && session.condominioId !== morador.condominioId) {
    throw new Error("Você não tem permissão para gerar links para este morador.");
  }

  const cadastro = await prisma.cadastroFacial.create({
    data: {
      moradorId,
      expiraEm: new Date(Date.now() + LINK_EXPIRATION_HOURS * 60 * 60 * 1000),
    },
  });

  const redirectTo =
    session.role === "MANUTENCAO"
      ? `/admin?linkGerado=${cadastro.token}&condominioId=${morador.condominioId}`
      : `/moradores?linkGerado=${cadastro.token}`;
  redirect(redirectTo);
}

/**
 * Exclui o morador do sistema. Antes disso, remove a face e o usuário dele
 * de todos os equipamentos (modo DIRECT) onde o cadastro facial foi concluído
 * — se a remoção falhar em algum equipamento, o morador NÃO é excluído, para
 * nunca deixar o software e o equipamento dessincronizados.
 */
export async function removerMorador(formData: FormData): Promise<void> {
  const session = await requireSession(["MANUTENCAO", "SINDICO"]);

  const moradorId = String(formData.get("moradorId") ?? "");
  if (!moradorId) throw new Error("Selecione um morador.");

  const morador = await prisma.morador.findUniqueOrThrow({
    where: { id: moradorId },
    include: {
      cadastros: {
        include: {
          jobs: {
            where: { status: "CONCLUIDO" },
            include: { dispositivo: true },
          },
        },
      },
    },
  });

  if (session.role === "SINDICO" && session.condominioId !== morador.condominioId) {
    throw new Error("Você não tem permissão para excluir este morador.");
  }

  if (morador.intelbrasUserId) {
    const dispositivos = new Map<string, Dispositivo>();
    for (const cadastro of morador.cadastros) {
      for (const job of cadastro.jobs) {
        dispositivos.set(job.dispositivo.id, job.dispositivo);
      }
    }

    for (const dispositivo of dispositivos.values()) {
      if (dispositivo.connectionMode !== "DIRECT") {
        // Modo AGENT: remoção no equipamento precisa ser feita manualmente por enquanto.
        continue;
      }

      const device = {
        ip: dispositivo.ip,
        usuario: dispositivo.usuario,
        senha: dispositivo.senha,
        canalPorta: dispositivo.canalPorta,
      };

      try {
        await removeFace(device, morador.intelbrasUserId);
        await removeUser(device, morador.intelbrasUserId);
      } catch (error) {
        const message =
          error instanceof IntelbrasError
            ? `${error.message} — ${JSON.stringify(error.body)}`
            : error instanceof Error
              ? error.message
              : "Erro desconhecido ao comunicar com o equipamento.";
        throw new Error(
          `Não foi possível remover o morador do equipamento "${dispositivo.nome}": ${message}. ` +
            `O cadastro NÃO foi excluído do sistema — tente novamente.`,
        );
      }
    }
  }

  await prisma.morador.delete({ where: { id: moradorId } });
  revalidatePath("/admin");
  revalidatePath("/moradores");
}

export async function createManutencaoUser(formData: FormData): Promise<void> {
  await requireSession(["MANUTENCAO"]);

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) throw new Error("Preencha usuário e senha.");

  await prisma.user.create({
    data: { username, passwordHash: await hashPassword(password), role: "MANUTENCAO" },
  });
  revalidatePath("/admin");
}

export async function createSindicoUser(formData: FormData): Promise<void> {
  await requireSession(["MANUTENCAO"]);

  const condominioId = String(formData.get("condominioId") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!condominioId || !username || !password) {
    throw new Error("Preencha usuário, senha e selecione o condomínio.");
  }

  await prisma.user.create({
    data: { username, passwordHash: await hashPassword(password), role: "SINDICO", condominioId },
  });
  revalidatePath("/admin");
}

/** Garante que existe um token de agente para o condomínio (cria se ainda não existir). */
export async function gerarAgentToken(formData: FormData): Promise<void> {
  await requireSession(["MANUTENCAO"]);

  const condominioId = String(formData.get("condominioId") ?? "");
  if (!condominioId) throw new Error("Selecione um condomínio.");

  const existente = await prisma.agentToken.findUnique({ where: { condominioId } });
  if (!existente) {
    await prisma.agentToken.create({ data: { condominioId } });
  }
  revalidatePath("/admin");
}

/** Exclui um acesso (manutenção ou síndico). O usuário "admin" nunca pode ser excluído. */
export async function removerUsuario(formData: FormData): Promise<void> {
  await requireSession(["MANUTENCAO"]);

  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("Selecione um usuário.");

  const usuario = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (usuario.username === "admin") {
    throw new Error("O usuário admin não pode ser excluído.");
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}
