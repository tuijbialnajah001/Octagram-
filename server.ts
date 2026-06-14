import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import cron from "node-cron";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON body
  app.use(express.json());

  // Firebase Setup for Automatic Daily Sync
  const firebaseConfigStr = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
  const firebaseConfig = JSON.parse(firebaseConfigStr);

  const firebaseApp = initializeApp({
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
  });

  const db = getFirestore(firebaseApp);

  const runSyncAll = async () => {
    console.log("Running manual or automatic WhatsApp group sync...");
    try {
      const snapshot = await getDocs(collection(db, "groups"));
      for (const document of snapshot.docs) {
        const data = document.data();
        let url = data.joinLink;
        if (url) {
          try {
            if (!/^https?:\/\//i.test(url)) {
              url = 'https://' + url;
            }
            const microlinkRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
            const mlData = await microlinkRes.json();
            
            let title = mlData?.data?.title || data.title;
            let image = mlData?.data?.image?.url || mlData?.data?.logo?.url || data.imageUrl;

            if (title.includes('WhatsApp Group Invite') || title.includes('WhatsApp Community Invite')) {
               title = title.replace('WhatsApp Group Invite', '').replace('WhatsApp Community Invite', '').replace(' - ', '').trim();
            }

            if (title !== data.title || image !== data.imageUrl) {
              await updateDoc(doc(db, "groups", document.id), {
                  title,
                  imageUrl: image,
                  serverSyncSecret: "0CTAGRAM_AUTO_SYNC_2026_SECRET",
                  updatedAt: Date.now()
              });
              console.log(`Auto-updated group: ${title}`);
            }
          } catch (e) {
            console.error(`Failed to auto-update link ${url}`, e);
          }
        }
      }
      console.log("Sync completed.");
      return { success: true, message: "Sync completed successfully." };
    } catch (err) {
      console.error("Error in sync:", err);
      return { success: false, error: err };
    }
  };

  // Setup cron to run every day at 00:00 server time
  cron.schedule('0 0 * * *', runSyncAll);

  // API Route to manually trigger the sync
  app.post("/api/force-sync-all", async (req, res) => {
    const result = await runSyncAll();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  });

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
