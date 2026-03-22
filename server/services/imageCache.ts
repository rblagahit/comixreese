import axios from "axios";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";

const CACHE_FOLDER = path.join(process.cwd(), "image-cache");
const MAX_CACHE_SIZE = parseInt(process.env.IMAGE_CACHE_MAX_SIZE || "5368709120"); // 5GB limit default
const MAX_FILE_SIZE = parseInt(process.env.IMAGE_CACHE_MAX_FILE || "52428800"); // 50MB per image default

export class ImageCacheService {
  static async init() {
    await fs.ensureDir(CACHE_FOLDER);
  }

  static async cacheImage(url: string, subPath: string): Promise<string | null> {
    const cachePath = path.join(CACHE_FOLDER, subPath);

    // Check if already cached
    if (await fs.pathExists(cachePath)) {
      return cachePath;
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(cachePath));

    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
          Referer: "https://mangadex.org/",
          Accept: "image/webp,image/apng,image/*,*/*",
        },
      });

      if (response.status !== 200) {
        console.warn("Failed to fetch image", { url, status: response.status });
        return null;
      }

      const content = Buffer.from(response.data);

      if (content.length > MAX_FILE_SIZE) {
        console.warn("Image too large", { url, size: content.length });
        return null;
      }

      const contentType = response.headers["content-type"];
      if (!contentType?.startsWith("image/")) {
        console.warn("Invalid image content", { url, mime: contentType });
        return null;
      }

      await fs.writeFile(cachePath, content);

      // Clean old cache if needed
      await this.enforceCacheLimit();

      return cachePath;
    } catch (error) {
      console.error("Image cache error", { url, error: (error as Error).message });
      return null;
    }
  }

  static async enforceCacheLimit() {
    try {
      const files = await this.getAllFiles(CACHE_FOLDER);
      
      let totalSize = 0;
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const stats = await fs.stat(file);
          totalSize += stats.size;
          return { path: file, size: stats.size, lastAccess: stats.atimeMs };
        })
      );

      if (totalSize > MAX_CACHE_SIZE) {
        fileStats.sort((a, b) => a.lastAccess - b.lastAccess);
        
        let currentSize = totalSize;
        const toDelete = [];

        for (const file of fileStats) {
          if (currentSize <= MAX_CACHE_SIZE * 0.8) {
            break;
          }
          toDelete.push(file.path);
          currentSize -= file.size;
        }

        await Promise.all(toDelete.map(file => fs.remove(file)));
        console.info("Cache cleanup", { deletedFiles: toDelete.length, freedBytes: totalSize - currentSize });
      }
    } catch (error) {
      console.error("Cache cleanup error", error);
    }
  }

  private static async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    if (!(await fs.pathExists(dirPath))) return [];
    
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        files.push(...(await this.getAllFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  static async getStats() {
    try {
      const files = await this.getAllFiles(CACHE_FOLDER);
      let totalSize = 0;
      for (const file of files) {
        const stats = await fs.stat(file);
        totalSize += stats.size;
      }

      return {
        size: totalSize,
        sizeFormatted: this.formatBytes(totalSize),
        files: files.length,
        limit: MAX_CACHE_SIZE,
        limitFormatted: this.formatBytes(MAX_CACHE_SIZE),
        usagePercent: Math.round((totalSize / MAX_CACHE_SIZE) * 100 * 100) / 100,
      };
    } catch (error) {
      return { size: 0, files: 0, limit: MAX_CACHE_SIZE };
    }
  }

  static formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;
    while (bytes >= 1024 && unitIndex < units.length - 1) {
      bytes /= 1024;
      unitIndex++;
    }
    return `${bytes.toFixed(2)} ${units[unitIndex]}`;
  }

  static getSubPath(url: string, mangaId: string, chapterId: string, pageNumber: number): string {
    const urlHash = crypto.createHash("md5").update(url).digest("hex");
    return path.join(
      mangaId.substring(0, 2),
      mangaId,
      chapterId,
      `${pageNumber}_${urlHash}.jpg`
    );
  }

  static async clearChapterCache(mangaId: string, chapterId: string) {
    const chapterPath = path.join(CACHE_FOLDER, mangaId.substring(0, 2), mangaId, chapterId);
    if (await fs.pathExists(chapterPath)) {
      await fs.remove(chapterPath);
    }
  }
}
