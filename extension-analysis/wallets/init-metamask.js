import path from 'node:path';
import unzipper from 'unzipper';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import dotenv from 'dotenv';
dotenv.config();
import { clickButtonByText, findInputByHint, checkTermsBox } from '../util.js';

// const EXT_ZIP  = path.resolve('sources/metamask-chrome-12.18.2.zip');
const EXT_PATH = "sources/metamask-chrome-12.18.2";
const EXT_ID   = 'gfbcggkpcdpiiihmopfbhabfeabcccaf'; // MetaMask ID

const SEED_PHRASE = process.env.SEED_PHRASE;
const PASSWORD = process.env.PASS_WORD;                  // ✔ 8+ chars + 符号，生产环境请安全存储
const NETWORK  = 'Ethereum Mainnet';                 // 可选，下面示例默认主网

/* ---------- 1. 启动包含扩展的 Chrome ---------- */
async function launchWithMetaMask () {
  return puppeteer.launch({
    headless: false,                              // 扩展只能非 headless
    defaultViewport: null,
    args: [
      `--remote-debugging-port=9222`,
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

  // a) Welcome page → "agree terms"
  await checkTermsBox(page);

  // b) Select "Create a new wallet" (or change to "Import wallet")
  await clickButtonByText(page, 'Import an existing wallet');

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

  await fillInputs(page, SEED_PHRASE);
  // e) Check the service terms checkbox

  // f) Click "Create" to create a wallet
  await clickButtonByText(page, 'Confirm Secret Recovery Phrase');

  // g) Skip the seed phrase backup (click "Remind me later" in the example)
  var inputbox = await findInputByHint(page, 'New password');
  await inputbox.type(PASSWORD);

  inputbox = await findInputByHint(page, 'Confirm password');
  await inputbox.type(PASSWORD);

  await checkTermsBox(page);
  await clickButtonByText(page, 'Import my wallet');
  await new Promise(resolve => setTimeout(resolve, 200));

  await clickButtonByText(page, 'Done');
  await clickButtonByText(page, 'Next');
  await clickButtonByText(page, 'Done');
  await new Promise(resolve => setTimeout(resolve, 800));
  try {
    await clickButtonByText(page, 'Not now');
  } catch (error) {
    console.log('Not now button not found');
  }

  // Now you're in the main interface, you can switch the network as needed:
  if (NETWORK !== 'Ethereum Mainnet') {
    await page.click('.network-display');
    await clickButtonByText(page, NETWORK);
  }
}

async function initMetaMask() {
  const browser = await launchWithMetaMask();
  const mmPage = await getMetamaskPage(browser);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  await setupMetaMask(mmPage);

  console.log('🎉 MetaMask setup completed!');
  return {browser, page: mmPage};
}

export { initMetaMask };