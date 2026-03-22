import express from "express";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // MangaDex API Proxy
  app.use(
    "/api/mangadex",
    createProxyMiddleware({
      target: "https://api.mangadex.org",
      changeOrigin: true,
      pathRewrite: {
        "^/api/mangadex": "",
      },
      on: {
        proxyRes: (proxyRes) => {
          proxyRes.headers["Access-Control-Allow-Origin"] = "*";
        },
      },
    })
  );

  // MangaDex Image Proxy
  app.use(
    "/api/mangadex-images",
    createProxyMiddleware({
      target: "https://uploads.mangadex.org",
      changeOrigin: true,
      pathRewrite: {
        "^/api/mangadex-images": "",
      },
      on: {
        proxyRes: (proxyRes) => {
          proxyRes.headers["Access-Control-Allow-Origin"] = "*";
        },
      },
    })
  );

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
