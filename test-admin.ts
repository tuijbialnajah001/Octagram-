import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

initializeApp({
  projectId: config.projectId,
});

const db = getFirestore();
db.settings({ databaseId: config.firestoreDatabaseId });

async function run() {
  const snapshot = await db.collection('groups').limit(1).get();
  console.log('Got groups:', snapshot.docs.length);
}
run().catch(console.error);
