"use client";

import { useRouter } from "next/navigation";

export function CondominioSelector({
  condominios,
  selectedId,
}: {
  condominios: { id: string; nome: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/admin?condominioId=${e.target.value}`)}
      className="border rounded px-3 py-2 text-sm font-medium"
    >
      {condominios.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nome}
        </option>
      ))}
    </select>
  );
}
