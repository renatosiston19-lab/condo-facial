import Image from "next/image";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <form action={login} className="w-full max-w-sm space-y-4 border rounded-lg p-6">
        <Image
          src="/logo-infra.png"
          alt="Infra Monitoramento"
          width={220}
          height={118}
          priority
          className="h-16 w-auto mx-auto"
        />
        <h1 className="text-xl font-semibold text-brand-navy text-center">Entrar</h1>

        {erro && (
          <p className="text-red-600 text-sm">Usuário ou senha inválidos.</p>
        )}

        <div className="space-y-1">
          <label className="text-sm block">Usuário</label>
          <input name="username" required autoFocus className="border rounded px-3 py-2 w-full" />
        </div>

        <div className="space-y-1">
          <label className="text-sm block">Senha</label>
          <input name="password" type="password" required className="border rounded px-3 py-2 w-full" />
        </div>

        <button type="submit" className="bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-4 py-2 w-full transition-colors">
          Entrar
        </button>
      </form>
    </main>
  );
}
