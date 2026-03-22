import express from "express";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";
import { ImageCacheService } from "./server/services/imageCache";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Cache Service
  await ImageCacheService.init();

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

  // MangaDex Image Proxy with Cache
  app.get("/api/mangadex-images/data/:hash/:filename", async (req, res) => {
    const { hash, filename } = req.params;
    const url = `https://uploads.mangadex.org/data/${hash}/${filename}`;
    const subPath = path.join("data", hash, filename);
    
    const cachedPath = await ImageCacheService.cacheImage(url, subPath);
    if (cachedPath) {
      res.sendFile(cachedPath);
    } else {
      res.status(404).send("Image not found");
    }
  });

  app.get("/api/mangadex-images/data-saver/:hash/:filename", async (req, res) => {
    const { hash, filename } = req.params;
    const url = `https://uploads.mangadex.org/data-saver/${hash}/${filename}`;
    const subPath = path.join("data-saver", hash, filename);
    
    const cachedPath = await ImageCacheService.cacheImage(url, subPath);
    if (cachedPath) {
      res.sendFile(cachedPath);
    } else {
      res.status(404).send("Image not found");
    }
  });

  app.get("/api/mangadex-images/covers/:mangaId/:filename", async (req, res) => {
    const { mangaId, filename } = req.params;
    const url = `https://uploads.mangadex.org/covers/${mangaId}/${filename}`;
    const subPath = path.join("covers", mangaId, filename);
    
    const cachedPath = await ImageCacheService.cacheImage(url, subPath);
    if (cachedPath) {
      res.sendFile(cachedPath);
    } else {
      res.status(404).send("Image not found");
    }
  });

  app.get("/api/admin/cache-stats", async (req, res) => {
    const stats = await ImageCacheService.getStats();
    res.json(stats);
  });

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
