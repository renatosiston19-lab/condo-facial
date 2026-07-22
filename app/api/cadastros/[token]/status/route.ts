import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const cadastro = await prisma.cadastroFacial.findUnique({
    where: { token },
    select: { status: true, erro: true },
  });

  if (!cadastro) {
    return NextResponse.json({ error: "Link de cadastro não encontrado." }, { status: 404 });
  }

  return NextResponse.json(cadastro);
}
