import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

const [, , modSource, destPath, configDir] = process.argv;

try {
    const zip = new AdmZip(modSource);
    const zipEntries = zip.getEntries();
    const totalFiles = zipEntries.filter(e => !e.isDirectory).length;
    let processed = 0;

    for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        const fileName = entry.entryName.split('/').pop();
        let destFile;
        if (fileName === 'ConfigManager.txt' || fileName === 'Properties.txt') {
            destFile = path.join(configDir, fileName);
        } else {
            destFile = path.join(destPath, fileName);
        }
        const destDir = path.dirname(destFile);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        if (fs.existsSync(destFile)) {
            fs.unlinkSync(destFile);
        }
        fs.writeFileSync(destFile, entry.getData());
        processed++;
        process.send({ progress: Math.round((processed / totalFiles) * 100) });
    }
    process.send({ success: true });
} catch (err) {
    process.send({ success: false, error: err.message });
}