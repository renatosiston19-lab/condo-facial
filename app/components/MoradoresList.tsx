"use client";

import { useMemo, useRef, useState } from "react";
import { createMorador, atualizarMorador, gerarLinkCadastro, removerMorador } from "@/app/admin/actions";

export interface MoradorRow {
  id: string;
  nome: string;
  unidade: string;
  bloco: string | null;
  telefone: string | null;
  email: string | null;
}

const LOGO_ASPECT_RATIO = 3296 / 1767;
const LOGO_EXPORT_WIDTH_PX = 400;
let logoDataUrlCache: Promise<string | null> | null = null;

/** Carrega a logo e a redimensiona num canvas antes de gerar o data URL,
 * para não embutir a imagem original (alta resolução, ~1.2MB) no PDF. */
function carregarLogoComoDataUrl(): Promise<string | null> {
  if (!logoDataUrlCache) {
    logoDataUrlCache = new Promise<string | null>((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = LOGO_EXPORT_WIDTH_PX;
        canvas.height = Math.round(LOGO_EXPORT_WIDTH_PX / LOGO_ASPECT_RATIO);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = "/logo-infra.png";
    });
  }
  return logoDataUrlCache;
}

const DIALOG_CLASS =
  "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 rounded-lg p-6 w-full max-w-sm backdrop:bg-black/50";

function DeleteMoradorButton({ morador }: { morador: MoradorRow }) {
  const [confirmando, setConfirmando] = useState(false);

  if (confirmando) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-xs text-gray-600">Excluir {morador.nome}?</span>
        <form action={removerMorador} className="inline">
          <input type="hidden" name="moradorId" value={morador.id} />
          <button type="submit" className="text-red-700 underline text-xs">Sim</button>
        </form>
        <button type="button" onClick={() => setConfirmando(false)} className="text-xs underline">
          Não
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setConfirmando(true)} className="text-red-700 underline text-xs">
      Excluir
    </button>
  );
}

export function MoradoresList({
  condominioId,
  condominioNome,
  moradores,
}: {
  condominioId: string;
  condominioNome: string;
  moradores: MoradorRow[];
}) {
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const [editando, setEditando] = useState<MoradorRow | null>(null);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroBloco, setFiltroBloco] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("");

  const filtrados = useMemo(() => {
    const nome = filtroNome.trim().toLowerCase();
    const bloco = filtroBloco.trim().toLowerCase();
    const unidade = filtroUnidade.trim().toLowerCase();

    return moradores.filter((m) => {
      if (nome && !m.nome.toLowerCase().includes(nome)) return false;
      if (bloco && !(m.bloco ?? "").toLowerCase().includes(bloco)) return false;
      if (unidade && !m.unidade.toLowerCase().includes(unidade)) return false;
      return true;
    });
  }, [moradores, filtroNome, filtroBloco, filtroUnidade]);

  function abrirEdicao(morador: MoradorRow) {
    setEditando(morador);
    editDialogRef.current?.showModal();
  }

  async function exportarPdf() {
    const [{ default: jsPDF }, autoTableModule, logoDataUrl] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
      carregarLogoComoDataUrl(),
    ]);
    const autoTable = autoTableModule.default;

    const doc = new jsPDF();
    const logoWidthMm = 40;
    const logoHeightMm = logoWidthMm / LOGO_ASPECT_RATIO;
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 14, 10, logoWidthMm, logoHeightMm);
    }

    doc.setFontSize(14);
    doc.text(`Moradores — ${condominioNome}`, 14, logoHeightMm + 20);
    autoTable(doc, {
      startY: logoHeightMm + 26,
      head: [["Nome", "Bloco", "Unidade", "Telefone", "E-mail"]],
      body: filtrados.map((m) => [m.nome, m.bloco ?? "-", m.unidade, m.telefone ?? "-", m.email ?? "-"]),
    });
    doc.save(`moradores-${condominioNome.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-medium">Moradores</h3>
        <div className="flex gap-2">
          <button onClick={exportarPdf} type="button" className="border rounded px-3 py-1 text-sm">
            Exportar PDF
          </button>
          <button
            onClick={() => addDialogRef.current?.showModal()}
            type="button"
            className="bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-3 py-1 text-sm transition-colors"
          >
            Adicionar morador
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <input
          placeholder="Buscar por nome"
          value={filtroNome}
          onChange={(e) => setFiltroNome(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Buscar por bloco"
          value={filtroBloco}
          onChange={(e) => setFiltroBloco(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Buscar por unidade"
          value={filtroUnidade}
          onChange={(e) => setFiltroUnidade(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      <ul className="text-sm space-y-1">
        {filtrados.map((m) => (
          <li key={m.id} className="flex items-center gap-2 flex-wrap">
            <span>
              {m.nome} — {m.bloco ? `bloco ${m.bloco}, ` : ""}unidade {m.unidade}
            </span>
            <form action={gerarLinkCadastro}>
              <input type="hidden" name="moradorId" value={m.id} />
              <button type="submit" className="text-brand-red underline text-xs">
                Gerar link de cadastro facial
              </button>
            </form>
            <button type="button" onClick={() => abrirEdicao(m)} className="text-brand-navy underline text-xs">
              Editar
            </button>
            <DeleteMoradorButton morador={m} />
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="text-gray-500">Nenhum morador encontrado.</li>
        )}
      </ul>

      <dialog ref={addDialogRef} className={DIALOG_CLASS}>
        <h4 className="font-medium mb-3">Adicionar morador</h4>
        <form
          action={createMorador}
          onSubmit={() => addDialogRef.current?.close()}
          className="grid grid-cols-2 gap-2 text-sm"
        >
          <input type="hidden" name="condominioId" value={condominioId} />
          <input name="nome" placeholder="Nome do morador" required className="border rounded px-2 py-1 col-span-2" />
          <input name="bloco" placeholder="Bloco (opcional)" className="border rounded px-2 py-1" />
          <input name="unidade" placeholder="Unidade (ex: 101)" required className="border rounded px-2 py-1" />
          <input name="telefone" placeholder="Telefone (opcional)" className="border rounded px-2 py-1 col-span-2" />
          <input name="email" placeholder="E-mail (opcional)" className="border rounded px-2 py-1 col-span-2" />
          <div className="col-span-2 flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => addDialogRef.current?.close()}
              className="flex-1 border rounded px-3 py-1"
            >
              Cancelar
            </button>
            <button type="submit" className="flex-1 bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-3 py-1 transition-colors">
              Adicionar
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={editDialogRef} className={DIALOG_CLASS}>
        <h4 className="font-medium mb-3">Editar morador</h4>
        {editando && (
          <form
            key={editando.id}
            action={atualizarMorador}
            onSubmit={() => editDialogRef.current?.close()}
            className="grid grid-cols-2 gap-2 text-sm"
          >
            <input type="hidden" name="moradorId" value={editando.id} />
            <input
              name="nome"
              placeholder="Nome do morador"
              defaultValue={editando.nome}
              required
              className="border rounded px-2 py-1 col-span-2"
            />
            <input name="bloco" placeholder="Bloco (opcional)" defaultValue={editando.bloco ?? ""} className="border rounded px-2 py-1" />
            <input
              name="unidade"
              placeholder="Unidade (ex: 101)"
              defaultValue={editando.unidade}
              required
              className="border rounded px-2 py-1"
            />
            <input
              name="telefone"
              placeholder="Telefone (opcional)"
              defaultValue={editando.telefone ?? ""}
              className="border rounded px-2 py-1 col-span-2"
            />
            <input
              name="email"
              placeholder="E-mail (opcional)"
              defaultValue={editando.email ?? ""}
              className="border rounded px-2 py-1 col-span-2"
            />
            <div className="col-span-2 flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => editDialogRef.current?.close()}
                className="flex-1 border rounded px-3 py-1"
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-3 py-1 transition-colors">
                Salvar
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
