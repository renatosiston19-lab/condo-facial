import Image from "next/image";
import type { ReactNode } from "react";

export function Header({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Image
          src="/logo-infra.png"
          alt="Infra Monitoramento"
          width={160}
          height={86}
          priority
          className="h-9 w-auto"
        />
        <h1 className="text-2xl font-semibold text-brand-navy">{title}</h1>
      </div>
      {right}
    </div>
  );
}
