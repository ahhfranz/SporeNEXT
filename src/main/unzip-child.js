import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const [, , zipPath, extractPath] = process.argv;

try {
    if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);
    process.send && process.send({ success: true });
    process.exit(0);
} catch (err) {
    process.send && process.send({ success: false, error: err.message });
    process.exit(1);
}