const puppeteer = require('puppeteer');

puppeteer.launch().then(async browser => {
  const page = await browser.newPage();
  await page.goto('https://www.google.com');
  const targets = browser.targets()
  console.log(targets)
  // await browser.close();
});