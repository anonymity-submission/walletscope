const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
const browser = await puppeteer.launch({
    headless: false, 
    args: [
      `--disable-extensions-except=${path.resolve('./metamask-extension')}`, 
      `--load-extension=${path.resolve('./metamask-extension')}`,           
      '--disable-web-security', 
      '--disable-features=IsolateOrigins,site-per-process', 
      '--allow-file-access-from-files', 
      '--no-sandbox', 
      '--disable-setuid-sandbox' 
    ],
  });  

  const pages = await browser.pages();
  const extensionPage = pages[0]; 

  // simulate user operation, open extension UI
  await extensionPage.goto('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/popup.html');

  // take screenshot of the current page
  await extensionPage.screenshot({ path: 'extension-screenshot.png' });

  await browser.close();
})();
