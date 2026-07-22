import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/logout-action";
import { MoradoresList } from "@/app/components/MoradoresList";
import { Header } from "@/app/components/Header";
import { LinkGeradoBanner } from "@/app/components/LinkGeradoBanner";

export default async function MoradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ linkGerado?: string }>;
}) {
  const session = await requireSession(["SINDICO"]);
  const { linkGerado } = await searchParams;

  const condominio = await prisma.condominio.findUniqueOrThrow({
    where: { id: session.condominioId! },
    include: { moradores: { orderBy: { createdAt: "desc" } } },
  });

  return (
    <main className="flex-1 mx-auto max-w-2xl px-4 py-10 space-y-8 w-full">
      <Header
        title={`${condominio.nome} — Moradores`}
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

      <MoradoresList
        condominioId={condominio.id}
        condominioNome={condominio.nome}
        moradores={condominio.moradores}
      />
    </main>
  );
}
