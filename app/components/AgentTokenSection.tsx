"use client";

import { useEffect, useState } from "react";
import { gerarAgentToken } from "@/app/admin/actions";

export function AgentTokenSection({
  condominioId,
  token,
}: {
  condominioId: string;
  token: string | null;
}) {
  const [origin, setOrigin] = useState("");
  const [copiadoToken, setCopiadoToken] = useState(false);
  const [copiadoUrl, setCopiadoUrl] = useState(false);

  useEffect(() => {
    // window.location só existe no cliente; precisa do effect para evitar
    // divergência entre a renderização do servidor e a do navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  function copiar(valor: string, marcar: (v: boolean) => void) {
    navigator.clipboard
      .writeText(valor)
      .then(() => marcar(true))
      .catch(() => {});
  }

  if (!token) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Agente local</h3>
        <p className="text-sm text-gray-600">
          Nenhum token gerado ainda para este condomínio.
        </p>
        <form action={gerarAgentToken}>
          <input type="hidden" name="condominioId" value={condominioId} />
          <button type="submit" className="bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-3 py-1 text-sm transition-colors">
            Gerar token do agente
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium">Agente local</h3>
      <p className="text-sm text-gray-600">
        Cole estes dois valores no arquivo <code>agent-config.json</code> do computador da portaria:
      </p>
      <div className="text-sm space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">apiUrl:</span>
          <code className="break-all">{origin}</code>
          <button type="button" onClick={() => copiar(origin, setCopiadoUrl)} className="border rounded px-2 py-0.5 text-xs shrink-0">
            {copiadoUrl ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">agentToken:</span>
          <code className="break-all">{token}</code>
          <button type="button" onClick={() => copiar(token, setCopiadoToken)} className="border rounded px-2 py-0.5 text-xs shrink-0">
            {copiadoToken ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
