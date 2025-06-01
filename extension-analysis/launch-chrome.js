import puppeteer from 'puppeteer';

async function launchWithMetaMask () {
  return puppeteer.launch({
    headless: false,                              // 扩展只能非 headless
    defaultViewport: null,
    args: [
      `--disable-extensions-except=${"sources/metamask-chrome-12.18.2"}`,
      `--load-extension=${"sources/metamask-chrome-12.18.2"}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
  });
}

puppeteer.launch(
  {
    headless: false,                              // 扩展只能非 headless
    defaultViewport: null,
    args: [
      `--disable-extensions-except=${"sources/metamask-chrome-12.18.2"}`,
      `--load-extension=${"sources/metamask-chrome-12.18.2"}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
  }
).then(async browser => {
  const page = await browser.newPage();
  await page.goto('https://www.google.com');
  const newWindowTarget = await browser.waitForTarget(
    target => target.url() === 'chrome-extension://gfbcggkpcdpiiihmopfbhabfeabcccaf/home.html#onboarding/welcome',
  );
  console.log(newWindowTarget);
});

