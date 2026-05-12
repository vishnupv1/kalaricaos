import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/kalarica-logo.png";

type KalaricaLogoProps = {
  className?: string;
  /** Visual size — intrinsic asset is wide; height drives layout. */
  variant?: "header" | "hero" | "sidebar";
  priority?: boolean;
};

const heightClass = {
  header: "h-8 w-auto max-w-[140px] md:max-w-[160px]",
  sidebar: "h-9 w-auto max-w-[148px]",
  hero: "h-24 w-auto max-w-[280px] md:h-32 md:max-w-[360px]",
} as const;

export function KalaricaLogo({ className, variant = "header", priority = false }: KalaricaLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Kalarica — Artistry. Elegance. You."
      width={640}
      height={360}
      priority={priority}
      className={cn("object-contain object-left", heightClass[variant], className)}
    />
  );
}
