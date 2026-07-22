import Image from "next/image";
import { prisma } from "@/lib/db";
import { FaceCapture } from "./FaceCapture";

export default async function CadastroPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const cadastro = await prisma.cadastroFacial.findUnique({
    where: { token },
    include: { morador: true },
  });

  if (!cadastro) {
    return <ErrorScreen message="Link de cadastro não encontrado." />;
  }
  if (cadastro.expiraEm < new Date()) {
    return <ErrorScreen message="Este link expirou. Peça um novo link à administração do condomínio." />;
  }
  if (cadastro.status !== "PENDENTE") {
    return <ErrorScreen message="Este link já foi utilizado." />;
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
      <Image
        src="/logo-infra.png"
        alt="Infra Monitoramento"
        width={180}
        height={97}
        priority
        className="h-14 w-auto"
      />
      <h1 className="text-xl font-semibold text-center text-brand-navy">
        Olá, {cadastro.morador.nome.split(" ")[0]}!
      </h1>
      <p className="text-sm text-gray-600 text-center max-w-xs">
        Vamos cadastrar sua facial para liberar seu acesso. Posicione seu rosto dentro da área
        marcada e tire a foto.
      </p>
      <FaceCapture token={token} />
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <p className="text-center text-red-600 max-w-xs">{message}</p>
    </main>
  );
}
