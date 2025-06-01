import path from 'node:path';
import unzipper from 'unzipper';
import puppeteer from 'puppeteer';
import fs from 'node:fs';

// const EXT_ZIP  = path.resolve('sources/metamask-chrome-12.18.2.zip');
const EXT_PATH = "sources/metamask-chrome-12.18.2";
const EXT_ID   = 'gfbcggkpcdpiiihmopfbhabfeabcccaf'; // MetaMask ID

const PASSWORD = 'Strong#Test1234';                  // ✔ 8+ chars + 符号，生产环境请安全存储
const NETWORK  = 'Ethereum Mainnet';                 // 可选，下面示例默认主网

/* ---------- 0. 若还没解压，就解压一次 ---------- */
// async function ensureUnzip () {
//   try { await fs.access(EXT_PATH); }               // 已存在则跳过
//   catch {
//     await fs.mkdir(EXT_PATH, { recursive: true });
//     await fs.createReadStream(EXT_ZIP)
//       .pipe(unzipper.Extract({ path: EXT_PATH }))
//       .promise();
//   }
// }

/* ---------- 1. 启动包含扩展的 Chrome ---------- */
async function launchWithMetaMask () {
  return puppeteer.launch({
    headless: false,                              // 扩展只能非 headless
    defaultViewport: null,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
  });
}

async function getMetamaskPage(browser) {
  // 1. wait for metamask page
  const target = await browser.waitForTarget(t =>
    t.type() === 'page' &&
    t.url().startsWith(`chrome-extension://${EXT_ID}/home.html`)
  );

  // 2. convert to puppeteer.Page
  const page = await target.page();
  await page.bringToFront();      // bring to front
  await page.waitForNetworkIdle(); // wait for network idle

  return page;                    // use it to click "Get started" etc.
}

/* ---------- 2. Complete the first-time setup ---------- */      
async function setupMetaMask (page) {

  // a) Welcome page → "Get started"
  let checkboxSelector = '#onboarding__terms-checkbox';
  await page.waitForSelector(checkboxSelector);  
  await page.click(checkboxSelector); 
  // await new Promise(resolve => setTimeout(resolve, 100000000));

  // b) Select "Create a new wallet" (or change to "Import wallet")
  await clickButtonByText(page, 'Import an existing wallet');
  // await new Promise(resolve => setTimeout(resolve, 100000000));

  // c) Agree to the terms → "I agree"
  await clickButtonByText(page, 'I agree');

  // d) Set privatekey  
  async function fillInputs(page, str) {
    const parts = str.split(" ");

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      let inputSelector = `input#import-srp__srp-word-${index}`; 
      await page.waitForSelector(inputSelector); 
      await page.type(inputSelector, part); 
    }
  }

  const privateKey = process.env.PRIVATE_KEY;
  console.log(privateKey);
  await fillInputs(page, privateKey);

  await new Promise(resolve => setTimeout(resolve, 100000000));

  // e) Check the service terms checkbox
  await page.click('input[type="checkbox"]');

  // f) Click "Create" to create a wallet
  await clickButtonByText(page, 'Create');

  // g) Skip the seed phrase backup (click "Remind me later" in the example)
  await clickByText(page, 'Remind me later');
  await clickByText(page, 'Skip');

  // h) All Done
  await clickByText(page, 'All Done');

  // i) Close the popup
  await page.keyboard.press('Escape');

  // Now you're in the main interface, you can switch the network as needed:
  if (NETWORK !== 'Ethereum Mainnet') {
    await page.click('.network-display');
    await clickByText(page, NETWORK);
  }
}

/* ---------- 3. Utility function: click by text ---------- */

export async function clickButtonByText(page, label, opt = {}) {
  const { timeout = 10_000 } = opt;
  const isRegex  = label instanceof RegExp;
  const pattern  = isRegex ? label.source : label;

  // 1️⃣ 先等页面里出现“任何”候选元素
  await page.waitForSelector('button, [role="button"], [role^="link"]', {
    timeout,
  });

  // 2️⃣ 在页面端查找符合条件的那个
  const handle = await page.evaluateHandle(
    ({ pattern, isRegex }) => {
      const re = isRegex ? new RegExp(pattern, 'i') : null;

      function visible(el) {
        const s = window.getComputedStyle(el);
        return s && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
      }

      const candidates = [
        ...document.querySelectorAll('button, [role="button"], [role^="link"]'),
      ];

      return (
        candidates.find(el => {
          if (!visible(el)) return false;
          const text = el.innerText.trim();
          return isRegex ? re.test(text) : text.includes(pattern);
        }) || null
      );
    },
    { pattern, isRegex }
  );

  if (!handle || (await handle.evaluate(node => node === null))) {
    throw new Error(`点击失败：未找到包含文本「${label}」的可点击元素`);
  }

  // 3️⃣ 点击
  await handle.asElement().click();
}

// puppeteer.launch(
//   {
//     headless: false,                              // 扩展只能非 headless
//     defaultViewport: null,
//     args: [
//       `--disable-extensions-except=${EXT_PATH}`,
//       `--load-extension=${EXT_PATH}`,
//       '--no-sandbox',
//       '--disable-setuid-sandbox'
//     ],
//   }
// ).then(async browser => {
//   const page = await browser.newPage();
//   await setupMetaMask(page);
//   // await browser.close();
// });



(async () => {
  // await ensureUnzip();
  const browser = await launchWithMetaMask();
  const mmPage = await getMetamaskPage(browser);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await setupMetaMask(mmPage);

  console.log('🎉 MetaMask 初始化完成！');
  // browser.disconnect(); // 留给后续脚本继续复用
})();
