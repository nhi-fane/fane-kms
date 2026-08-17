import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
const backupDir = path.resolve(__dirname, '../../backups');
const credentialsPath = path.resolve(__dirname, '../../google-credentials.json');
const FOLDER_ID = '1FNxbCnpZPAylW5x3Gedb8j-A9jpwRfwh';

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

export const backupDatabase = async () => {
  try {
    if (!fs.existsSync(dbPath)) {
      console.error('[Backup] Database file not found at', dbPath);
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const backupFileName = `backup_dev_${dateStr}.db`;
    const localBackupPath = path.join(backupDir, backupFileName);

    // 1. Local Backup
    fs.copyFileSync(dbPath, localBackupPath);
    console.log(`[Backup] Successfully copied local DB to ${backupFileName}`);

    // 2. Google Drive Backup
    await uploadToDrive(localBackupPath, backupFileName);
    
  } catch (error) {
    console.error('[Backup Error]', error);
  }
};

const getDriveClient = () => {
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Credentials file not found at ${credentialsPath}`);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
};

async function uploadToDrive(filePath: string, filename: string) {
  try {
    const drive = getDriveClient();

    // Check if file for today already exists
    const q = `'${FOLDER_ID}' in parents and name='${filename}' and trashed=false`;
    const response = await drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const existingFile = response.data.files && response.data.files.length > 0 ? response.data.files[0] : null;

    const media = {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(filePath),
    };

    if (existingFile && existingFile.id) {
      // Update existing
      await drive.files.update({
        fileId: existingFile.id,
        media: media,
        supportsAllDrives: true,
      });
      console.log(`[Google Drive] Updated existing backup: ${filename}`);
    } else {
      // Create new
      await drive.files.create({
        requestBody: {
          name: filename,
          parents: [FOLDER_ID],
        },
        media: media,
        fields: 'id',
        supportsAllDrives: true,
      });
      console.log(`[Google Drive] Uploaded new backup: ${filename}`);
    }
  } catch (err: any) {
    console.error(`[Google Drive Error] Upload failed:`, err.message);
  }
}

export const cleanupOldBackups = async () => {
  console.log('[Cleanup] Starting 90-day backup cleanup...');
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // 1. Cleanup Local
  try {
    const files = fs.readdirSync(backupDir);
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtime < ninetyDaysAgo) {
        fs.unlinkSync(filePath);
        console.log(`[Cleanup Local] Deleted old backup: ${file}`);
      }
    }
  } catch (err) {
    console.error('[Cleanup Local Error]', err);
  }

  // 2. Cleanup Google Drive
  try {
    const drive = getDriveClient();
    const isoDate = ninetyDaysAgo.toISOString();
    const q = `'${FOLDER_ID}' in parents and modifiedTime < '${isoDate}' and trashed=false`;
    
    const response = await drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files) {
      for (const file of response.data.files) {
        if (file.id) {
          await drive.files.delete({ fileId: file.id, supportsAllDrives: true });
          console.log(`[Cleanup Drive] Deleted old backup: ${file.name}`);
        }
      }
    }
  } catch (err: any) {
    console.error('[Cleanup Drive Error]', err.message);
  }
};
