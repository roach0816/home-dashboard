import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Dashboard",
    short_name: "Home",
    description: "A self-hosted landing page for home automation, homelab, and network bookmarks.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#3b82f6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
