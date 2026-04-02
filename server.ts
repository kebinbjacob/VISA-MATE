import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "VisaMate API is running" });
  });

  // Live UAE Job Aggregation Endpoint
  app.get("/api/jobs/search", async (req, res) => {
    const query = (req.query.q as string) || "developer";
    const jobs: any[] = [];
    let idCounter = 1;

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    // 1. LinkedIn (UAE) Scraper
    try {
      const liUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(query)}&location=United%20Arab%20Emirates`;
      const { data } = await axios.get(liUrl, { headers: browserHeaders });
      const $ = cheerio.load(data);
      $('.base-card').each((i, el) => {
        const title = $(el).find('.base-search-card__title').text().trim();
        const company = $(el).find('.base-search-card__subtitle').text().trim();
        const location = $(el).find('.job-search-card__location').text().trim();
        const link = $(el).find('.base-card__full-link').attr('href');
        
        if (title && link) {
          jobs.push({
            id: `li-${idCounter++}`,
            title,
            company,
            location,
            link,
            description_snippet: "View job on LinkedIn for full description.",
            source: 'LinkedIn'
          });
        }
      });
    } catch (e: any) {
      console.warn("LinkedIn scraping failed:", e.message);
    }

    // 2. Dubizzle Scraper (Basic attempt)
    try {
      const dubUrl = `https://dubai.dubizzle.com/jobs/search/?keywords=${encodeURIComponent(query)}`;
      const { data } = await axios.get(dubUrl, { headers: browserHeaders });
      const $ = cheerio.load(data);
      // Dubizzle classes change often, this is a best-effort generic selector
      $('[data-testid="listing-card"]').each((i, el) => {
        const title = $(el).find('h2').text().trim();
        const company = $(el).find('[data-testid="listing-company"]').text().trim() || "Confidential";
        const location = $(el).find('[data-testid="listing-location"]').text().trim() || "Dubai, UAE";
        const linkPath = $(el).find('a').attr('href');
        const link = linkPath ? `https://dubai.dubizzle.com${linkPath}` : '';
        const description_snippet = $(el).find('p').first().text().trim();
        
        if (title && link) {
          jobs.push({
            id: `dub-${idCounter++}`,
            title,
            company,
            location,
            link,
            description_snippet,
            source: 'Dubizzle'
          });
        }
      });
    } catch (e: any) {
      console.error("Dubizzle scraping failed:", e.message);
    }

    // Return aggregated results
    res.json(jobs);
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
    console.log(`VisaMate Server running on http://localhost:${PORT}`);
  });
}

startServer();
