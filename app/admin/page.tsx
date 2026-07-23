import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/logout-action";
import { MoradoresList } from "@/app/components/MoradoresList";
import { Header } from "@/app/components/Header";
import { DeleteUsuarioButton } from "@/app/components/DeleteUsuarioButton";
import { CondominioSelector } from "@/app/components/CondominioSelector";
import { LinkGeradoBanner } from "@/app/components/LinkGeradoBanner";
import { DispositivoEditButton } from "@/app/components/DispositivoEditButton";
import { AgentTokenSection } from "@/app/components/AgentTokenSection";
import {
  createCondominio,
  createDispositivo,
  createManutencaoUser,
  createSindicoUser,
} from "./actions";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ linkGerado?: string; condominioId?: string }>;
}) {
  const session = await requireSession(["MANUTENCAO"]);
  const { linkGerado, condominioId } = await searchParams;

  const condominios = await prisma.condominio.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
  const usuariosManutencao = await prisma.user.findMany({
    where: { role: "MANUTENCAO" },
    orderBy: { createdAt: "desc" },
  });

  const selectedId = condominioId ?? condominios[0]?.id;
  const condominio = selectedId
    ? await prisma.condominio.findUnique({
        where: { id: selectedId },
        include: { dispositivos: true, moradores: true, usuarios: true, agentToken: true },
      })
    : null;

  return (
    <main className="flex-1 mx-auto max-w-3xl px-4 py-10 space-y-10 w-full">
      <Header
        title="Admin — Cadastro Facial"
        right={
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{session.username}</span>
            <form action={logout}>
              <button type="submit" className="underline">Sair</button>
            </form>
          </div>
        }
      />

      {linkGerado && <LinkGeradoBanner token={linkGerado} />}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Novo condomínio</h2>
        <form action={createCondominio} className="flex gap-2">
          <input name="nome" placeholder="Nome do condomínio" required className="border rounded px-3 py-2 flex-1" />
          <button type="submit" className="bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-4 py-2 transition-colors">Criar</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Acessos da equipe de manutenção</h2>
        <ul className="text-sm space-y-1">
          {usuariosManutencao.map((u) => (
            <li key={u.id}>
              {u.username}
              {u.username !== "admin" && <DeleteUsuarioButton userId={u.id} username={u.username} />}
            </li>
          ))}
        </ul>
        <form action={createManutencaoUser} className="grid grid-cols-2 gap-2 text-sm">
          <input name="username" placeholder="Usuário" required className="border rounded px-2 py-1" />
          <input name="password" type="password" placeholder="Senha" required className="border rounded px-2 py-1" />
          <button type="submit" className="col-span-2 bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-3 py-1 transition-colors">
            Criar acesso de manutenção
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Condomínio</h2>

        {condominios.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum condomínio cadastrado ainda.</p>
        ) : (
          <CondominioSelector condominios={condominios} selectedId={selectedId!} />
        )}

        {condominio && (
          <div className="border rounded-lg p-4 space-y-6">
            <h2 className="text-lg font-semibold">{condominio.nome}</h2>

            <div className="space-y-3">
              <h3 className="font-medium">Dispositivos</h3>
              <ul className="text-sm space-y-1">
                {condominio.dispositivos.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span>
                      {d.nome} — {d.ip} (porta {d.canalPorta}, modo {d.connectionMode})
                    </span>
                    <DispositivoEditButton dispositivo={d} />
                  </li>
                ))}
              </ul>
              <form action={createDispositivo} className="grid grid-cols-2 gap-2 text-sm">
                <input type="hidden" name="condominioId" value={condominio.id} />
                <input name="nome" placeholder="Nome (ex: Portaria)" required className="border rounded px-2 py-1" />
                <input name="ip" placeholder="IP (ex: 192.168.1.108)" required className="border rounded px-2 py-1" />
                <input name="usuario" placeholder="Usuário admin" required className="border rounded px-2 py-1" />
                <input name="senha" type="password" placeholder="Senha admin" required className="border rounded px-2 py-1" />
                <input name="canalPorta" type="number" defaultValue={1} min={1} className="border rounded px-2 py-1" />
                <select name="connectionMode" className="border rounded px-2 py-1">
                  <option value="DIRECT">Direto (nuvem acessa o IP)</option>
                  <option value="AGENT">Agente local</option>
                </select>
                <button type="submit" className="col-span-2 bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-3 py-1 transition-colors">
                  Adicionar dispositivo
                </button>
              </form>
            </div>

            <AgentTokenSection
              condominioId={condominio.id}
              token={condominio.agentToken?.token ?? null}
            />

            <MoradoresList
              condominioId={condominio.id}
              condominioNome={condominio.nome}
              moradores={condominio.moradores}
            />

            <div className="space-y-3">
              <h3 className="font-medium">Acessos do síndico</h3>
              <ul className="text-sm space-y-1">
                {condominio.usuarios.map((u) => (
                  <li key={u.id}>
                    {u.username}
                    <DeleteUsuarioButton userId={u.id} username={u.username} />
                  </li>
                ))}
              </ul>
              <form action={createSindicoUser} className="grid grid-cols-2 gap-2 text-sm">
                <input type="hidden" name="condominioId" value={condominio.id} />
                <input name="username" placeholder="Usuário" required className="border rounded px-2 py-1" />
                <input name="password" type="password" placeholder="Senha" required className="border rounded px-2 py-1" />
                <button type="submit" className="col-span-2 bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-3 py-1 transition-colors">
                  Criar acesso de síndico
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
