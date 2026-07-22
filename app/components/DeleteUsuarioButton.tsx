"use client";

import { useState } from "react";
import { removerUsuario } from "@/app/admin/actions";

export function DeleteUsuarioButton({ userId, username }: { userId: string; username: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (confirmando) {
    return (
      <span className="inline-flex items-center gap-1 ml-2">
        <span className="text-xs text-gray-600">Excluir &quot;{username}&quot;?</span>
        <form action={removerUsuario} className="inline">
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" className="text-red-700 underline text-xs">Sim</button>
        </form>
        <button type="button" onClick={() => setConfirmando(false)} className="text-xs underline">
          Não
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="text-red-700 underline text-xs ml-2"
    >
      Excluir
    </button>
  );
}
