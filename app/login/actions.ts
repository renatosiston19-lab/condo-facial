"use server";

import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function login(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?erro=1");
  }

  await createSession(user);
  redirect(user.role === "MANUTENCAO" ? "/admin" : "/moradores");
}
