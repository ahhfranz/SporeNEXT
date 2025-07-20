import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

const [, , modSource, destPath, configDir] = process.argv;

try {
    const zip = new AdmZip(modSource);
    const entries = zip.getEntries().filter(e => !e.isDirectory);
    let processed = 0, total = entries.length;

    for (const entry of entries) {
        const fileName = entry.entryName.split('/').pop();
        const targetDir = (fileName === 'ConfigManager.txt' || fileName === 'Properties.txt') ? configDir : destPath;
        const destFile = path.join(targetDir, fileName);
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
        fs.writeFileSync(destFile, entry.getData());
        processed++;
        process.send({ progress: Math.round((processed / total) * 100) });
    }
    process.send({ success: true });
} catch (err) {
    process.send({ success: false, error: err.message });
}