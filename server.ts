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
      
      const titleMatch = html.match(/<meta property=\"og:title\" content=\"([^\"]*)\"/i) || html.match(/<title>([^<]+)<\/title>/i);
      const imageMatch = html.match(/<meta property=\"og:image\" content=\"([^\"]*)\"/i);
      
      // WhatsApp might return title like "WhatsApp Group Invite" if it's invalid or "GroupName"
      let title = titleMatch ? titleMatch[1] : "";
      const image = imageMatch ? imageMatch[1] : "";

      // Sometimes title is "WhatsApp Group Invite". We can keep it or clear it.
      if (title === "WhatsApp Group Invite") {
        title = "";
      }

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
