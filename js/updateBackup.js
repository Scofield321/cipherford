const fs = require("fs");
const path = require("path");

// Path to your project folder where JSON files are downloaded
const downloadsFolder = path.join(__dirname, "downloads"); // adjust if needed
const projectBackupPath = path.join(__dirname, "localStorage-backup.json");

// Find the latest timestamped backup
const files = fs
  .readdirSync(downloadsFolder)
  .filter((f) => f.startsWith("localStorage-backup-") && f.endsWith(".json"))
  .sort(); // sorts by name; ISO timestamps sort chronologically

if (files.length === 0) {
  console.log("No timestamped backups found!");
  process.exit(1);
}

const latestFile = files[files.length - 1];
const latestBackup = path.join(downloadsFolder, latestFile);

// Copy latest backup to project root as `localStorage-backup.json`
fs.copyFileSync(latestBackup, projectBackupPath);
console.log(`Updated project backup with latest file: ${latestFile}`);
