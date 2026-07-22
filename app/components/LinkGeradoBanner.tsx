"use client";

import { useEffect, useState } from "react";

export function LinkGeradoBanner({ token }: { token: string }) {
  const [url, setUrl] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const fullUrl = `${window.location.origin}/cadastro/${token}`;
    // window.location só existe no cliente; precisa do effect para evitar
    // divergência entre a renderização do servidor e a do navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(fullUrl);

    navigator.clipboard
      .writeText(fullUrl)
      .then(() => setCopiado(true))
      .catch(() => {
        // Alguns navegadores só permitem copiar a partir de um clique do usuário.
      });
  }, [token]);

  function copiar() {
    navigator.clipboard
      .writeText(url)
      .then(() => setCopiado(true))
      .catch(() => {});
  }

  return (
    <div className="rounded border border-green-600 bg-green-50 p-4 text-sm space-y-2">
      <p className="font-medium">
        Link de cadastro gerado{copiado ? " (copiado para a área de transferência)" : ""}:
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <code className="break-all">{url}</code>
        <button
          type="button"
          onClick={copiar}
          className="border rounded px-2 py-1 text-xs shrink-0"
        >
          {copiado ? "Copiado!" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
