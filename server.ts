import express from "express";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { ImageCacheService } from "./server/services/imageCache";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mangaDexLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: parseInt(process.env.MANGADEX_RATE_LIMIT || "5"), // limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Cache Service
  await ImageCacheService.init();

  // MangaDex API Proxy
  app.use(
    "/api/mangadex",
    mangaDexLimiter,
    createProxyMiddleware({
      target: process.env.MANGADEX_BASE_URL || "https://api.mangadex.org",
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

  // Laravel-aligned routes
  app.post("/api/read/:chapterId/progress", express.json(), async (req, res) => {
    // This endpoint can be used if we want to move progress tracking to the backend
    // For now, we'll just acknowledge it, as the client handles Firestore directly
    const { chapterId } = req.params;
    const { page } = req.body;
    console.log(`Progress update for chapter ${chapterId}: page ${page}`);
    res.json({ status: "success", chapterId, page });
  });

  app.get("/api/reader/image/:chapterId", async (req, res) => {
    const { chapterId } = req.params;
    const { page, data_saver } = req.query;
    
    // This route would normally fetch the chapter pages and return the correct one
    // For simplicity in this environment, we'll redirect or proxy if we had the full logic here
    // But since the client knows the URL, this is more of a placeholder or a proxy
    res.status(501).send("Use the direct /api/mangadex-images routes for now");
  });

  app.get("/image/*", async (req, res) => {
    const pathParam = req.params[0];
    const url = `https://uploads.mangadex.org/${pathParam}`;
    
    const cachedPath = await ImageCacheService.cacheImage(url, pathParam);
    if (cachedPath) {
      res.sendFile(cachedPath);
    } else {
      res.status(404).send("Image not found");
    }
  });

  app.post("/api/comics/import", express.json(), async (req, res) => {
    const { mangadexId } = req.body;
    // This would normally trigger the import logic on the backend
    // For now, we'll just acknowledge it
    console.log(`Importing comic with MangaDex ID: ${mangadexId}`);
    res.json({ status: "success", mangadexId });
  });

  app.post("/api/comics/:comicId/bookmark", express.json(), async (req, res) => {
    const { comicId } = req.params;
    console.log(`Bookmarking comic: ${comicId}`);
    res.json({ status: "success", comicId });
  });

  app.delete("/api/comics/:comicId/bookmark", async (req, res) => {
    const { comicId } = req.params;
    console.log(`Unbookmarking comic: ${comicId}`);
    res.json({ status: "success", comicId });
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
