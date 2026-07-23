"use client";

import { useRef } from "react";
import { atualizarDispositivo } from "@/app/admin/actions";

const DIALOG_CLASS =
  "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 rounded-lg p-6 w-full max-w-sm backdrop:bg-black/50";

export interface DispositivoRow {
  id: string;
  nome: string;
  ip: string;
  usuario: string;
  senha: string;
  canalPorta: number;
  connectionMode: "DIRECT" | "AGENT";
}

export function DispositivoEditButton({ dispositivo }: { dispositivo: DispositivoRow }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-brand-navy underline text-xs"
      >
        Editar
      </button>

      <dialog ref={dialogRef} className={DIALOG_CLASS}>
        <h4 className="font-medium mb-3">Editar dispositivo</h4>
        <form
          action={atualizarDispositivo}
          onSubmit={() => dialogRef.current?.close()}
          className="grid grid-cols-2 gap-2 text-sm"
        >
          <input type="hidden" name="dispositivoId" value={dispositivo.id} />
          <input
            name="nome"
            placeholder="Nome (ex: Portaria)"
            defaultValue={dispositivo.nome}
            required
            className="border rounded px-2 py-1 col-span-2"
          />
          <input
            name="ip"
            placeholder="IP (ex: 192.168.1.108)"
            defaultValue={dispositivo.ip}
            required
            className="border rounded px-2 py-1"
          />
          <input
            name="usuario"
            placeholder="Usuário admin"
            defaultValue={dispositivo.usuario}
            required
            className="border rounded px-2 py-1"
          />
          <input
            name="senha"
            type="password"
            placeholder="Senha admin"
            defaultValue={dispositivo.senha}
            required
            className="border rounded px-2 py-1"
          />
          <input
            name="canalPorta"
            type="number"
            defaultValue={dispositivo.canalPorta}
            min={1}
            className="border rounded px-2 py-1"
          />
          <select name="connectionMode" defaultValue={dispositivo.connectionMode} className="border rounded px-2 py-1 col-span-2">
            <option value="DIRECT">Direto (nuvem acessa o IP)</option>
            <option value="AGENT">Agente local</option>
          </select>
          <div className="col-span-2 flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 border rounded px-3 py-1"
            >
              Cancelar
            </button>
            <button type="submit" className="flex-1 bg-brand-navy hover:bg-brand-navy-dark text-white rounded px-3 py-1 transition-colors">
              Salvar
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
