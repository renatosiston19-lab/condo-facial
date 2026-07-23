import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/** Autentica uma requisição do agente local via `Authorization: Bearer <AgentToken>`. */
export async function authenticateAgent(request: NextRequest): Promise<{ condominioId: string } | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const agentToken = await prisma.agentToken.findUnique({ where: { token } });
  if (!agentToken) return null;

  return { condominioId: agentToken.condominioId };
}
