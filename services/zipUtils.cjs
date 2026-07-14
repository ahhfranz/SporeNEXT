const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function extractZip(zipPath, destPath) {
  return new Promise((resolve, reject) => {
    const absZipPath = path.resolve(zipPath);
    const absDestPath = path.resolve(destPath);
    const cmd = `Expand-Archive -Path '${absZipPath.replace(/'/g, "''")}' -DestinationPath '${absDestPath.replace(/'/g, "''")}' -Force`;
    const base64Cmd = Buffer.from(cmd, 'utf-16le').toString('base64');
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      base64Cmd
    ]);

    let stderrData = '';
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Extraction failed'));
      } else {
        resolve();
      }
    });
  });
}

function extractImagesFromZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    const escapedPath = zipPath.replace(/'/g, "''");
    const escapedDestDir = destDir.replace(/'/g, "''");
    const cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::OpenRead('${escapedPath}'); [System.IO.Directory]::CreateDirectory('${escapedDestDir}') | Out-Null; foreach ($entry in $zip.Entries) { if ($entry.FullName.EndsWith('.png', [System.StringComparison]::OrdinalIgnoreCase) -or $entry.FullName.EndsWith('.jpg', [System.StringComparison]::OrdinalIgnoreCase) -or $entry.FullName.EndsWith('.jpeg', [System.StringComparison]::OrdinalIgnoreCase)) { $targetPath = [System.IO.Path]::Combine('${escapedDestDir}', [System.IO.Path]::GetFileName($entry.FullName)); [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true); } }; $zip.Dispose();"`;
    
    exec(cmd, { timeout: 8000 }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function readXmlFromZip(zipPath, entryName) {
  return new Promise((resolve, reject) => {
    const escapedPath = zipPath.replace(/'/g, "''");
    const cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $temp = [System.IO.Path]::GetTempFileName(); $zip = [System.IO.Compression.ZipFile]::OpenRead('${escapedPath}'); $entry = $zip.GetEntry('${entryName}'); if ($entry) { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $temp, $true); $zip.Dispose(); Get-Content $temp -Raw; Remove-Item $temp; } else { $zip.Dispose(); Write-Output 'NO_XML'; }"`;

    exec(cmd, { timeout: 8000 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const output = stdout ? stdout.trim() : '';
      resolve(output === 'NO_XML' ? null : output);
    });
  });
}

module.exports = {
  extractZip,
  extractImagesFromZip,
  readXmlFromZip
};
