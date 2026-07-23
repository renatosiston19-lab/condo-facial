"use client";

import { useState } from "react";
import { gerarLinkCadastroToken } from "@/app/admin/actions";

function formatarNumeroWhatsapp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

export function EnviarWhatsAppButton({
  morador,
}: {
  morador: { id: string; nome: string; telefone: string | null };
}) {
  const [enviando, setEnviando] = useState(false);

  if (!morador.telefone) return null;

  async function enviar() {
    // Abre a aba em branco já dentro do clique (gesto do usuário), para o
    // navegador não bloquear como pop-up depois que a action assíncrona voltar.
    const janela = window.open("", "_blank");
    setEnviando(true);
    try {
      const token = await gerarLinkCadastroToken(morador.id);
      const link = `${window.location.origin}/cadastro/${token}`;
      const numero = formatarNumeroWhatsapp(morador.telefone!);
      const mensagem = encodeURIComponent(
        `Olá ${morador.nome.split(" ")[0]}! Segue o link para você cadastrar sua facial no acesso do condomínio: ${link}`,
      );
      if (janela) janela.location.href = `https://wa.me/${numero}?text=${mensagem}`;
    } catch {
      janela?.close();
      alert("Não foi possível gerar o link. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button type="button" onClick={enviar} disabled={enviando} className="text-green-700 underline text-xs whitespace-nowrap">
      {enviando ? "Gerando..." : "Enviar por WhatsApp"}
    </button>
  );
}
