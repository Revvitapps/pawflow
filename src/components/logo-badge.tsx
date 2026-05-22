import Image from "next/image";

export function LogoBadge({
  src,
  alt,
  size = 56,
  rounded = "rounded-2xl",
  className = "",
  contain = true,
}: {
  src: string;
  alt: string;
  size?: number;
  rounded?: string;
  className?: string;
  contain?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-white shadow-sm ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={contain ? "object-contain" : "object-cover"}
        sizes={`${size}px`}
      />
    </div>
  );
}
