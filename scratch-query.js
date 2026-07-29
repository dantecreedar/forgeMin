const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.resolve(__dirname, './backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json';
const serviceAccount = require(path.resolve(__dirname, './backend', serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const repositories = [];
  const repoSnap = await db.collection('repositories').get();
  repoSnap.forEach(doc => {
    repositories.push({ id: doc.id, ...doc.data() });
  });

  fs.writeFileSync('out.json', JSON.stringify({ repositories }, null, 2), 'utf8');
}

run().catch(console.error);
