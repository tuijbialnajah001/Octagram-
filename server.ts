import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import https from "https";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON body
  app.use(express.json());

  // API Route to fetch WhatsApp Group info from URL
  app.post("/api/fetch-group-info", async (req, res) => {
    let { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "No URL provided" });
    }

    try {
      // Basic validation
      if (!url.includes('chat.whatsapp.com/')) {
        return res.status(400).json({ error: "Invalid WhatsApp group link" });
      }

      // Add https:// if missing
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WhatsApp/2.21.19.21 A',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      const html: string = await response.text();
      
      let title = "";
      const ogTitleMatch1 = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
      const ogTitleMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
      if (ogTitleMatch1 && ogTitleMatch1[1]) title = ogTitleMatch1[1];
      else if (ogTitleMatch2 && ogTitleMatch2[1]) title = ogTitleMatch2[1];
      
      if (!title) {
        const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleTagMatch && titleTagMatch[1]) title = titleTagMatch[1].trim();
      }

      // Cleanup WhatsApp's dynamic title suffixes
      if (title.includes('WhatsApp Group Invite') || title.includes('WhatsApp Community Invite') || title.includes('WhatsApp')) {
         title = title.replace('WhatsApp Group Invite', '').replace('WhatsApp Community Invite', '').replace('WhatsApp', '').replace(' - ', '').trim();
      }
      
      if (!title) {
        // Fallback to checking typical h2/h3 tags WhatsApp uses for group names in the preview page
        const h3Match = html.match(/<h[23][^>]*class=["'][^"']*["'][^>]*>([^<]+)<\/h[23]>/i);
        if (h3Match && h3Match[1] && h3Match[1] !== 'Features' && !h3Match[1].includes("WhatsApp installed") && !h3Match[1].includes("WhatsApp Group")) {
           title = h3Match[1].replace(/&#039;/g, "'").replace(/&amp;/g, "&").trim();
        }
      }

      let image = "";
      const ogImageMatch1 = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
      const ogImageMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
      if (ogImageMatch1 && ogImageMatch1[1]) image = ogImageMatch1[1];
      else if (ogImageMatch2 && ogImageMatch2[1]) image = ogImageMatch2[1];
      
      res.json({ title, image });
    } catch (error: any) {
      console.error("Error fetching URL:", error.message || error);
      res.status(500).json({ error: "Failed to fetch link preview", details: error.message || error });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
