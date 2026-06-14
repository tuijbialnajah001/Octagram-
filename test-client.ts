import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
});

const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, "groups"));
  console.log("Documents:", snapshot.docs.length);
}
run().catch(console.error);
