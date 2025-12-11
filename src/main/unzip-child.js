import yauzl from "yauzl";
import fs from "fs";
import path from "path";

const [, , zipPath, extractPath] = process.argv;

function extractZip(zipPath, extractPath) {
    return new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, async (err, zipfile) => {
            if (err) return reject(err);

            await fs.promises.mkdir(extractPath, { recursive: true });

            let totalEntries = zipfile.entryCount || 0;
            let extractedEntries = 0;

            let lastProgressUpdate = Date.now();

            function sendProgress() {
                const now = Date.now();
                if (now - lastProgressUpdate >= 1000) {
                    if (process.connected && process.send) {
                        process.send({
                            progress: Math.round(
                                (extractedEntries / totalEntries) * 100
                            ),
                        });
                    }
                    lastProgressUpdate = now;
                }
            }

            zipfile.readEntry();

            zipfile.on("entry", async (entry) => {
                const filePath = path.join(extractPath, entry.fileName);

                if (/\/$/.test(entry.fileName)) {
                    await fs.promises.mkdir(filePath, { recursive: true });
                    extractedEntries++;
                    sendProgress();
                    return zipfile.readEntry();
                }

                await fs.promises.mkdir(path.dirname(filePath), {
                    recursive: true,
                });

                zipfile.openReadStream(entry, (err, readStream) => {
                    if (err) return reject(err);

                    const writeStream = fs.createWriteStream(filePath);

                    readStream.pipe(writeStream);

                    writeStream.on("finish", async () => {
                        extractedEntries++;
                        sendProgress();

                        if (extractedEntries % 50 === 0) {
                            return setImmediate(() => zipfile.readEntry());
                        }

                        zipfile.readEntry();
                    });

                    writeStream.on("error", reject);
                });
            });

            zipfile.on("end", resolve);
            zipfile.on("error", reject);
        });
    });
}

(async () => {
    try {
        await extractZip(zipPath, extractPath);
        process.send && process.send({ success: true });
        process.exit(0);
    } catch (err) {
        process.send && process.send({ success: false, error: err.message });
        process.exit(1);
    }
})();
