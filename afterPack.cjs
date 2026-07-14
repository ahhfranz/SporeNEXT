const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const electronLicense = path.join(context.appOutDir, 'LICENSE.electron.txt');
  const chromiumLicenses = path.join(context.appOutDir, 'LICENSES.chromium.html');

  try {
    if (fs.existsSync(electronLicense)) {
      fs.unlinkSync(electronLicense);
    }
  } catch (err) {}

  try {
    if (fs.existsSync(chromiumLicenses)) {
      fs.unlinkSync(chromiumLicenses);
    }
  } catch (err) {}
};
