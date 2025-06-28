import puppeteer from 'puppeteer';
const EXT_ID   = 'gfbcggkpcdpiiihmopfbhabfeabcccaf'; // MetaMask ID
import { initMetaMask } from './wallets/init-metamask.js';


class MetamaskCrawler {
    constructor(browser, page) {
        this.browser = browser;
        this.page = page;
        this.originalPage = page;
        this.visitedStates = new Set();
        this.inputElements = [];
        this.currentPath = [];
        this.maxDepth = 10;
        this.waitTime = 1000;
        this.processed = new Set();
    }
    // check if there are new pages and close them
    async handleNewPages() {
        try {
            const allPages = await this.browser.pages();
            const newPages = allPages.filter(page => page !== this.originalPage);

            if (newPages.length > 0) {
                console.log(`Found ${newPages.length} new pages, closing...`);

                // close all new pages
                for (const newPage of newPages) {
                    try {
                        const url = newPage.url();
                        console.log(`Closing new page: ${url}`);
                        await newPage.close();
                    } catch (error) {
                        console.log('Failed to close page:', error.message);
                    }
                }

                // bring the original page to the front
                await this.originalPage.bringToFront();
                await new Promise(resolve => setTimeout(resolve, 500));

                console.log('All new pages closed, focus returned to original page');
                return true;
            }

            return false;
        } catch (error) {
            console.log('Error handling new pages:', error.message);
            return false;
        }
    }

    // check for popups and close them
    async handlePopups() {
        try {
            // check for JavaScript popups
            this.page.on('dialog', async dialog => {
                console.log('Detected popup:', dialog.message());
                await dialog.dismiss();
            });

            // check for modals or overlays
            const modals = await this.page.$$('.modal, .overlay, .popup, [role="dialog"]');
            for (const modal of modals) {
                try {
                    const isVisible = await this.page.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    }, modal);

                    if (isVisible) {
                        // try to click the close button
                        const closeButton = await modal.$('.close, .modal-close, [data-dismiss="modal"], .fa-times');
                        if (closeButton) {
                            await closeButton.click();
                            console.log('Closed modal');
                        } else {
                            // if no close button, press ESC
                            await this.page.keyboard.press('Escape');
                        }
                    }
                } catch (error) {
                    console.log('Failed to close modal:', error.message);
                }
            }
        } catch (error) {
            console.log('Failed to handle popups:', error.message);
        }
    }
    // improved page signature method
    async getPageSignature() {
        return await this.page.evaluate(() => {
            // 1. count and properties of various elements
            const buttons = document.querySelectorAll('button, [role="button"], .button');
            const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
            const links = document.querySelectorAll('a[href]');
            const selects = document.querySelectorAll('select');
            const clickableElements = document.querySelectorAll('[onclick], [role="button"], button, a[href]');
            
            // 2. get detailed information of visible elements
            function getVisibleElementsSignature() {
                const visibleElements = [];
                
                // get all possible interactive elements
                const interactiveSelectors = [
                    'button', '[role="button"]', 'a[href]', 'input', 'select', 'textarea',
                    '[onclick]', '[tabindex]', '.clickable', '.menu-item', '.account-list-item'
                ];
                
                interactiveSelectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            const style = window.getComputedStyle(el);
                            const rect = el.getBoundingClientRect();
                            
                            // only consider visible elements
                            if (style.display !== 'none' && 
                                style.visibility !== 'hidden' && 
                                style.opacity !== '0' &&
                                rect.width > 0 && rect.height > 0) {
                                
                                visibleElements.push({
                                    tag: el.tagName,
                                    text: el.textContent?.trim().substring(0, 30) || '',
                                    classes: el.className.toString().split(' ').filter(c => c).slice(0, 3),
                                    id: el.id || '',
                                    type: el.type || '',
                                    disabled: el.disabled || false,
                                    position: {
                                        x: Math.round(rect.left / 10) * 10, // reduce precision to avoid small movements
                                        y: Math.round(rect.top / 10) * 10,
                                        w: Math.round(rect.width / 10) * 10,
                                        h: Math.round(rect.height / 10) * 10
                                    }
                                });
                            }
                        });
                    } catch (e) {
                        // ignore selector errors
                    }
                });
                
                return visibleElements;
            }
            
            // 3. get page structure features
            function getPageStructure() {
                const structure = {};
                
                // count the number of visible elements of each type
                const elementTypes = ['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA', 'DIV', 'SPAN'];
                elementTypes.forEach(type => {
                    const elements = document.querySelectorAll(type.toLowerCase());
                    let visibleCount = 0;
                    elements.forEach(el => {
                        const style = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();
                        if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
                            visibleCount++;
                        }
                    });
                    structure[type] = visibleCount;
                });
                
                return structure;
            }
            
            // 4. get elements with specific class names (Metamask specific)
            function getMetamaskSpecificElements() {
                const metamaskSelectors = [
                    '.account-list-item',
                    '.network-dropdown-button', 
                    '.menu-item',
                    '.transaction-list-item',
                    '.token-cell',
                    '.send-v2__form-field',
                    '.confirm-page-container-navigation',
                    '.page-container__footer-button',
                    '.multichain-account-list-item',
                    '.eth-overview__button',
                    '.token-overview__button',
                    '.import-button',
                    '.create-account__button'
                ];
                
                const metamaskElements = {};
                metamaskSelectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        let visibleCount = 0;
                        const texts = [];
                        
                        elements.forEach(el => {
                            const style = window.getComputedStyle(el);
                            const rect = el.getBoundingClientRect();
                            if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
                                visibleCount++;
                                const text = el.textContent?.trim();
                                if (text && text.length < 50) {
                                    texts.push(text);
                                }
                            }
                        });
                        
                        metamaskElements[selector] = {
                            count: visibleCount,
                            texts: texts.slice(0, 5) // only keep the first 5 texts
                        };
                    } catch (e) {
                        metamaskElements[selector] = { count: 0, texts: [] };
                    }
                });
                
                return metamaskElements;
            }
            
            // 5. get text content features
            function getTextSignature() {
                const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, a');
                const significantTexts = [];
                
                textElements.forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && text.length > 2 && text.length < 100) {
                        const style = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();
                        
                        // only consider visible text
                        if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
                            significantTexts.push(text);
                        }
                    }
                });
                
                // sort the text to ensure consistency, then take the first 20
                return significantTexts.sort().slice(0, 20);
            }
            
            // 6. get form state
            function getFormSignature() {
                const forms = document.querySelectorAll('form');
                const formStates = [];
                
                forms.forEach(form => {
                    const inputs = form.querySelectorAll('input, select, textarea');
                    const formState = {
                        inputCount: inputs.length,
                        values: []
                    };
                    
                    inputs.forEach(input => {
                        if (input.type !== 'password') { // do not record passwords
                            formState.values.push({
                                type: input.type || input.tagName.toLowerCase(),
                                name: input.name || '',
                                hasValue: !!(input.value || input.textContent?.trim()),
                                placeholder: input.placeholder || ''
                            });
                        }
                    });
                    
                    formStates.push(formState);
                });
                
                return formStates;
            }
            
            // 7. generate comprehensive signature
            const visibleElements = getVisibleElementsSignature();
            const pageStructure = getPageStructure();
            const metamaskElements = getMetamaskSpecificElements();
            const textSignature = getTextSignature();
            const formSignature = getFormSignature();
            
            const signature = {
                // basic counts
                counts: {
                    buttons: buttons.length,
                    inputs: inputs.length,
                    links: links.length,
                    selects: selects.length,
                    clickable: clickableElements.length
                },
                
                // page structure
                structure: pageStructure,
                
                // visible elements features (generate hash to reduce data)
                visibleElementsHash: JSON.stringify(visibleElements).substring(0, 500),
                
                // Metamask specific elements
                metamask: metamaskElements,
                
                // text features
                textHash: textSignature.join('|').substring(0, 300),
                
                // form state
                forms: formSignature,
                
                // URL and title
                url: window.location.href,
                title: document.title,
                
                // timestamp (for debugging)
                timestamp: Date.now()
            };
            
            // generate the final signature string
            const finalSignature = JSON.stringify(signature);
            
            // if the signature is too long, generate a hash
            if (finalSignature.length > 2000) {
                // simple hash function
                let hash = 0;
                for (let i = 0; i < finalSignature.length; i++) {
                    const char = finalSignature.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // convert to 32-bit integer
                }
                return hash.toString() + '_' + finalSignature.substring(0, 1000);
            }
            
            return finalSignature;
        });
    }
    // identify clickable elements
    async getClickableElements() {
        return await this.page.evaluate(() => {
            const selectors = [
                'button:not([disabled])',
                '[role="button"]:not([disabled])',
                'a[href]:not([disabled])',
                '.button:not([disabled])',
                '[onclick]:not([disabled])',
                'input[type="submit"]:not([disabled])',
                'input[type="button"]:not([disabled])',
                '[tabindex]:not([tabindex="-1"]):not([disabled])',
                '.clickable:not([disabled])',
                // Metamask specific selectors
                '.account-list-item',
                '.network-dropdown-button',
                '.menu-item',
                '.transaction-list-item',
                '.token-cell',
                '.send-v2__form-field',
                '.confirm-page-container-navigation',
                '.page-container__footer-button',
                '.permissions-connect-choose-account__account',
                '.connected-accounts-list__account-item',
                '.multichain-account-list-item',
                '.multichain-token-list-button'
            ];

            function isElementVisible(element) {
                if (!element) return false;
                
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                
                return (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    rect.width > 0 &&
                    rect.height > 0
                );
            }

            function isElementClickable(element) {
                if (!element) return false;
                
                try {
                    const rect = element.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const elementAtPoint = document.elementFromPoint(centerX, centerY);
                    
                    return element.contains(elementAtPoint) || elementAtPoint === element;
                } catch (e) {
                    return true;
                }
            }

            function getElementSignature(element) {
                return JSON.stringify({
                    tagName: element.tagName,
                    className: element.className,
                    id: element.id,
                    text: element.textContent?.trim().substring(0, 50),
                    type: element.type,
                    name: element.name,
                    position: {
                        x: Math.round(element.getBoundingClientRect().left),
                        y: Math.round(element.getBoundingClientRect().top)
                    }
                });
            }

            const elements = [];
            const seen = new Set();
            
            selectors.forEach(selector => {
                try {
                    const found = document.querySelectorAll(selector);
                    found.forEach(el => {
                        if (isElementVisible(el) && isElementClickable(el)) {
                            const signature = getElementSignature(el);
                            if (!seen.has(signature)) {
                                seen.add(signature);
                                elements.push({
                                    signature: signature,
                                    selector: selector,
                                    text: el.textContent?.trim(),
                                    tagName: el.tagName,
                                    className: el.className,
                                    id: el.id,
                                    rect: el.getBoundingClientRect()
                                });
                            }
                        }
                    });
                } catch (e) {
                    console.log(`Selector error: ${selector}`, e);
                }
            });

            return elements;
        });
    }

    // identify input elements
    async getInputElements() {
        return await this.page.evaluate(() => {
            const selectors = [
                'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled])',
                'textarea:not([disabled])',
                '[contenteditable="true"]:not([disabled])',
                'select:not([disabled])',
                // Metamask specific input elements
                '.unit-input__input',
                '.send-v2__form-field input',
                '.import-account__input',
                '.new-account-create-form__input',
                '.form-field__input',
                '.multichain-import-token-search__input'
            ];

            function isElementVisible(element) {
                if (!element) return false;
                
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                
                return (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    rect.width > 0 &&
                    rect.height > 0
                );
            }

            function getElementPath(element) {
                const parts = [];
                let current = element;
                
                while (current && current !== document.body) {
                    let selector = current.tagName.toLowerCase();
                    
                    if (current.id) {
                        selector += `#${current.id}`;
                    } else if (current.className) {
                        const classes = current.className.toString().split(' ').filter(Boolean);
                        if (classes.length > 0) {
                            selector += `.${classes[0]}`;
                        }
                    }
                    
                    const text = current.textContent?.trim();
                    if (text && text.length < 30) {
                        selector += `[text="${text}"]`;
                    }
                    
                    parts.unshift(selector);
                    current = current.parentElement;
                }
                
                return parts.join(' > ');
            }

            const elements = [];
            const seen = new Set();
            
            selectors.forEach(selector => {
                try {
                    const found = document.querySelectorAll(selector);
                    found.forEach(el => {
                        if (isElementVisible(el)) {
                            const signature = JSON.stringify({
                                path: getElementPath(el),
                                type: el.type || el.tagName.toLowerCase(),
                                name: el.name,
                                id: el.id
                            });
                            
                            if (!seen.has(signature)) {
                                seen.add(signature);
                                elements.push({
                                    path: getElementPath(el),
                                    type: el.type || el.tagName.toLowerCase(),
                                    placeholder: el.placeholder,
                                    name: el.name,
                                    id: el.id,
                                    className: el.className,
                                    signature: signature
                                });
                            }
                        }
                    });
                } catch (e) {
                    console.log(`Input selector error: ${selector}`, e);
                }
            });

            return elements;
        });
    }
    // smart element location (keep the previous code)
    async findElement(elementInfo) {
        try {
            if (elementInfo.id) {
                try {
                    const element = await this.page.$(`#${elementInfo.id}`);
                    if (element) return element;
                } catch (e) {
                    // continue trying other methods
                }
            }

            if (elementInfo.text && elementInfo.text.trim().length > 0 && elementInfo.text.length < 50) {
                try {
                    const elements = await this.page.$x(`//*[contains(text(), '${elementInfo.text.trim()}')]`);
                    if (elements.length > 0) {
                        for (const element of elements) {
                            const isVisible = await this.page.evaluate(el => {
                                const style = window.getComputedStyle(el);
                                const rect = el.getBoundingClientRect();
                                return style.display !== 'none' && rect.width > 0 && rect.height > 0;
                            }, element);
                            if (isVisible) return element;
                        }
                    }
                } catch (e) {
                    // continue trying other methods
                }
            }

            if (elementInfo.className) {
                try {
                    const classes = elementInfo.className.split(' ').filter(cls => cls && cls.length > 0);
                    if (classes.length > 0) {
                        const selector = `${elementInfo.tagName.toLowerCase()}.${classes[0]}`;
                        const element = await this.page.$(selector);
                        if (element) return element;
                    }
                } catch (e) {
                    // continue trying other methods
                }
            }

            if (elementInfo.rect) {
                try {
                    const element = await this.page.evaluateHandle((rect) => {
                        const centerX = rect.x + rect.width / 2;
                        const centerY = rect.y + rect.height / 2;
                        return document.elementFromPoint(centerX, centerY);
                    }, elementInfo.rect);
                    
                    if (element) {
                        const tagName = await this.page.evaluate(el => el ? el.tagName : null, element);
                        if (tagName && tagName.toLowerCase() === elementInfo.tagName.toLowerCase()) {
                            return element;
                        }
                    }
                } catch (e) {
                    // last attempt failed
                }
            }

            return null;
        } catch (error) {
            console.log('Element location failed:', error.message);
            return null;
        }
    }

     // modified click element method - added new page handling
     async clickElement(elementInfo) {
        try {
            console.log('Trying to click element:', elementInfo.text || elementInfo.tagName);
            
            // record the number of pages before clicking
            const pagesBefore = await this.browser.pages();
            const pagesCountBefore = pagesBefore.length;
            
            const element = await this.findElement(elementInfo);
            
            if (element) {
                // scroll to the element visible
                await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // ensure the element is in the viewport
                await this.page.evaluate(el => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, element);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // click the element
                await element.click();
                
                // wait for a short time to allow the new page to open
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // check if there are new pages opened
                const pagesAfter = await this.browser.pages();
                const pagesCountAfter = pagesAfter.length;
                
                if (pagesCountAfter > pagesCountBefore) {
                    console.log(`New pages opened (${pagesCountBefore} -> ${pagesCountAfter})`);
                    await this.handleNewPages();
                }
                
                // handle possible popups
                // await this.handlePopups();
                
                // ensure we are still on the original page
                await this.originalPage.bringToFront();
                
                // final wait
                await new Promise(resolve => setTimeout(resolve, this.waitTime - 800));
                
                return true;
            } else {
                console.log('Cannot locate element:', elementInfo.text || elementInfo.tagName);
                return false;
            }
            
        } catch (error) {
            console.log('Click failed:', error.message);
            
            // even if there is an error, check for new pages
            try {
                await this.handleNewPages();
                await this.originalPage.bringToFront();
            } catch (e) {
                console.log('Error recovery failed:', e.message);
            }
            
            return false;
        }
    }

    // record input elements and their paths
    recordInputElement(elementInfo) {
        const fullInfo = {
            ...elementInfo,
            triggerPath: [...this.currentPath],
            timestamp: Date.now()
        };
        
        if (!this.processed.has(elementInfo.signature)) {
            this.inputElements.push(fullInfo);
            this.processed.add(elementInfo.signature);
            console.log('Found input element:', {
                path: fullInfo.path,
                type: fullInfo.type,
                triggerPath: fullInfo.triggerPath.map(p => p.text || p.tagName)
            });
        }
    }

    // attempt to return to the previous state
    async attemptNavigation() {
        try {
            // try to press ESC
            await this.page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // try to click the back button
            const backSelectors = [
                '[data-testid="back-button"]',
                '.back-button',
                '[title*="back"]',
                '[title*="Back"]',
                '.fa-arrow-left',
                '.icon-arrow-left'
            ];
            
            for (const selector of backSelectors) {
                try {
                    const backButton = await this.page.$(selector);
                    if (backButton) {
                        await backButton.click();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        break;
                    }
                } catch (e) {
                    // continue trying the next selector
                }
            }
        } catch (error) {
            console.log('Navigation failed:', error.message);
        }
    }

    // main crawling logic
    async crawl(depth = 0) {
        if (depth >= this.maxDepth) {
            console.log('Reached max depth, stopping crawl');
            return;
        }

        // wait for the page to stabilize
        await new Promise(resolve => setTimeout(resolve, this.waitTime));

        const pageSignature = await this.getPageSignature();
        if (this.visitedStates.has(pageSignature)) {
            console.log('Page already visited, skipping');
            return;
        }
        
        this.visitedStates.add(pageSignature);
        console.log(`Crawl depth ${depth}, current page recorded`);

        // record all input elements on the current page
        const inputElements = await this.getInputElements();
        inputElements.forEach(element => {
            this.recordInputElement(element);
        });

        // get clickable elements
        const clickableElements = await this.getClickableElements();
        console.log(`Found ${clickableElements.length} clickable elements, ${inputElements.length} input elements`);

        // click each clickable element
        for (let i = 0; i < clickableElements.length; i++) {
            const element = clickableElements[i];
            
            // add to the current path
            this.currentPath.push({
                text: element.text,
                tagName: element.tagName,
                className: element.className,
                index: i,
                depth: depth
            });

            try {
                const info = element.text || element.tagName
                if (info.includes('Confirm') || info.includes('Submit')) {
                    continue;
                }
                const success = await this.clickElement(element);
                if (success) {
                    // recursive crawl of new state
                    await this.crawl(depth + 1);
                }
                
            } catch (error) {
                console.log('Error handling element:', error.message);
            } finally {
                // remove the current step
                this.currentPath.pop();
                
                // attempt to return to the previous state
                await this.attemptNavigation();
            }
        }
    }

    // generate report
    generateReport() {
        const report = {
            totalInputElements: this.inputElements.length,
            inputElements: this.inputElements.map(item => ({
                path: item.path,
                triggerPath: item.triggerPath.map(p => ({
                    text: p.text,
                    tagName: p.tagName,
                    depth: p.depth
                })),
                type: item.type,
                placeholder: item.placeholder,
                name: item.name,
                id: item.id
            })),
            crawlStats: {
                visitedStates: this.visitedStates.size,
                maxDepthReached: Math.max(...this.inputElements.map(item => 
                    item.triggerPath.length > 0 ? Math.max(...item.triggerPath.map(p => p.depth || 0)) : 0
                ), 0)
            }
        };
        
        console.log('=== Crawl report ===');
        console.log(JSON.stringify(report, null, 2));
        
        return report;
    }

    // start crawling
    async start() {
        console.log('Starting to crawl Metamask extension...');
        try {
            await this.crawl();
            return this.generateReport();
        } catch (error) {
            console.error('Error during crawling:', error);
            return this.generateReport();
        }
    }
}

// main function - start Metamask crawling
async function startMetamaskCrawling(options = {}) {
    const {
        maxDepth = 8,
        waitTime = 1500
    } = options;

    try {
        const {browser, metamaskPage} = await initMetaMask();
        // console.log('metamaskPage', metamaskPage);

        // wait for the page to load
        await new Promise(resolve => setTimeout(resolve, 3_000));

        // create crawler instance
        const crawler = new MetamaskCrawler(browser, metamaskPage);
        crawler.maxDepth = maxDepth;
        crawler.waitTime = waitTime;

        // start crawling
        const report = await crawler.start();

        return {
            report,
            browser,
            page: metamaskPage
        };

    } catch (error) {
        console.error('Startup failed:', error);
        await browser.close();
        throw error;
    }
}

// example usage
async function main() {
    try {
        const result = await startMetamaskCrawling({
            headless: false,  // set to true for headless mode
            maxDepth: 6,
            waitTime: 1000
        });

        console.log('Crawling completed!');
        console.log('Report:', result.report);

        // keep the browser open to check the results
        // await result.browser.close();

    } catch (error) {
        console.error('Program execution failed:', error);
    }
}

// export
export { MetamaskCrawler, startMetamaskCrawling };
