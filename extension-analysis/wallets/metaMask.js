const puppeteer = require('puppeteer');

async function setMetaMask(extensionPath) {
  let browser;
  let page;
    // Launch Chromium with Metamask extension
  browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--disable-web-security',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  await new Promise(resolve => setTimeout(resolve, 2000)); 

  const pages = await browser.pages();
  page = pages.find(page => page.url().includes('chrome-extension://'));
  if (!page) {
    console.log('Metamask page not found');
    await browser.close();
    return;
  }

  let checkboxSelector = '#onboarding__terms-checkbox';
  await page.waitForSelector(checkboxSelector);  
  await page.click(checkboxSelector); 

  checkboxSelector = "button.btn-secondary"
  await page.waitForSelector(checkboxSelector);  
  await page.click(checkboxSelector);  

  let buttonSelector = 'button.btn--rounded.btn-primary.btn--large'
  await page.waitForSelector(buttonSelector); 
  await page.click(buttonSelector); 

  const privateKey = 'put your private key here'  

  async function fillInputs(page, str) {
    const parts = str.split(" ");

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      let inputSelector = `input#import-srp__srp-word-${index}`; 
      await page.waitForSelector(inputSelector); 
      await page.type(inputSelector, part); 
    }
  }

  await fillInputs(page, privateKey); 

  buttonSelector = "button.btn--rounded.btn-primary.btn--large.import-srp__confirm-button"
  await page.waitForSelector(buttonSelector);  
  await page.click(buttonSelector); 

  inputSelector = 'input[data-testid="create-password-new"]'
  const psw = "00088000"
  await page.waitForSelector(inputSelector); 
  await page.type(inputSelector, psw); 

  inputSelector = 'input[data-testid="create-password-confirm"]'
  await page.waitForSelector(inputSelector);  
  await page.type(inputSelector, psw); 

  checkboxSelector = 'input[data-testid="create-password-terms"]';
  await page.waitForSelector(checkboxSelector);
  await page.evaluate((selector) => {
    const checkbox = document.querySelector(selector);
    if (checkbox) {
      checkbox.removeAttribute('readonly'); 
      checkbox.click(); 
    }
  }, checkboxSelector);

  buttonSelector = 'button[data-testid="create-password-import"]'
  await page.waitForSelector(buttonSelector);  
  await page.click(buttonSelector); 

  buttonSelector = 'button[data-testid="onboarding-complete-done"]'
  await page.waitForSelector(buttonSelector);  
  await page.click(buttonSelector); 

  buttonSelector = 'button[data-testid="pin-extension-next"]';
  await page.waitForSelector(buttonSelector);  
  await page.click(buttonSelector); 

  buttonSelector = 'button[data-testid="pin-extension-done"]'
  await page.waitForSelector(buttonSelector);  
  await page.click(buttonSelector); 

  buttonSelector = 'button.mm-button-primary'; 
  await page.waitForSelector(buttonSelector); 
  await page.click(buttonSelector);
  
  console.log("set wallet done")
  return {browser, page}
};

module.exports = { setMetaMask };