import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kalarica OS",
    short_name: "Kalarica",
    description: "Internal business operating system for Kalarica.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f0e8",
    theme_color: "#b8904f",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
