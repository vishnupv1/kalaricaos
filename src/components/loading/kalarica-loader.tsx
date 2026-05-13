import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/kalarica-logo.png";

const sizeMap = {
  sm: { shell: "size-14", logo: "h-6 w-auto max-w-[72px]" },
  md: { shell: "size-20", logo: "h-9 w-auto max-w-[108px]" },
  lg: { shell: "size-28", logo: "h-12 w-auto max-w-[148px]" },
} as const;

type KalaricaLoaderProps = {
  size?: keyof typeof sizeMap;
  className?: string;
  label?: string;
};

export function KalaricaLoader({ size = "md", className, label = "Loading" }: KalaricaLoaderProps) {
  const dims = sizeMap[size];

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", dims.shell, className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span
        aria-hidden
        className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#b8904f]/20 border-t-[#b8904f]"
      />
      <Image
        src={LOGO_SRC}
        alt=""
        width={640}
        height={360}
        className={cn("relative z-10 object-contain", dims.logo)}
        priority
      />
    </div>
  );
}
