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
      if (!url || typeof url !== 'string' || url.trim() === '') {
        return res.status(400).json({ error: "Invalid link format" });
      }

      // Add https:// if missing
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      const microlinkRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const data = await microlinkRes.json();

      let title = data?.data?.title || "";
      let image = data?.data?.image?.url || data?.data?.logo?.url || "";

      // Make sure we clean up the fallback default if Microlink couldn't find a custom group name
      if (title.includes('WhatsApp Group Invite') || title.includes('WhatsApp Community Invite')) {
         title = title.replace('WhatsApp Group Invite', '').replace('WhatsApp Community Invite', '').replace(' - ', '').trim();
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
