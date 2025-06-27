class MetamaskCrawler {
    constructor() {
        this.visitedStates = new Set();
        this.inputElements = [];
        this.currentPath = [];
        this.maxDepth = 10;
        this.waitTime = 1000; // wait time for each click
        this.processed = new Set();
    }

    // get the signature of the page
    getPageSignature() {
        const buttons = document.querySelectorAll('button, [role="button"], .button');
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
        const texts = Array.from(document.querySelectorAll('*')).map(el => el.textContent?.trim()).filter(Boolean);
        
        return JSON.stringify({
            buttonCount: buttons.length,
            inputCount: inputs.length,
            textHash: texts.join('').substring(0, 200),
            url: window.location.href
        });
    }

    // get the clickable elements
    getClickableElements() {
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
            '.page-container__footer-button'
        ];

        const elements = [];
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                found.forEach(el => {
                    if (this.isElementVisible(el) && this.isElementClickable(el)) {
                        elements.push(el);
                    }
                });
            } catch (e) {
                console.log(`Selector error: ${selector}`, e);
            }
        });

        return this.deduplicateElements(elements);
    }

    // get the input elements
    getInputElements() {
        const selectors = [
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled])',
            'textarea:not([disabled])',
            '[contenteditable="true"]:not([disabled])',
            'select:not([disabled])',
            // Metamask specific input elements
            '.unit-input__input',
            '.send-v2__form-field input',
            '.import-account__input',
            '.new-account-create-form__input'
        ];

        const elements = [];
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                found.forEach(el => {
                    if (this.isElementVisible(el)) {
                        elements.push(el);
                    }
                });
            } catch (e) {
                console.log(`Input selector error: ${selector}`, e);
            }
        });

        return this.deduplicateElements(elements);
    }

    // check if the element is visible
    isElementVisible(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top >= 0 &&
            rect.left >= 0
        );
    }

    // check if the element is clickable
    isElementClickable(element) {
        if (!element) return false;
        
        try {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const elementAtPoint = document.elementFromPoint(centerX, centerY);
            
            return element.contains(elementAtPoint) || elementAtPoint === element;
        } catch (e) {
            return true; // if the check fails, assume clickable
        }
    }

    // deduplicate the elements
    deduplicateElements(elements) {
        const unique = [];
        const seen = new Set();
        
        elements.forEach(el => {
            const signature = this.getElementSignature(el);
            if (!seen.has(signature)) {
                seen.add(signature);
                unique.push(el);
            }
        });
        
        return unique;
    }

    // get the signature of the element
    getElementSignature(element) {
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

    // get the path of the element
    getElementPath(element) {
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
            
            // add the text content as the description
            const text = current.textContent?.trim();
            if (text && text.length < 30) {
                selector += `[text="${text}"]`;
            }
            
            parts.unshift(selector);
            current = current.parentElement;
        }
        
        return parts.join(' > ');
    }

    // click the element
    async clickElement(element) {
        return new Promise((resolve) => {
            try {
                // record the click information
                const elementInfo = {
                    path: this.getElementPath(element),
                    text: element.textContent?.trim(),
                    type: element.tagName.toLowerCase(),
                    timestamp: Date.now()
                };
                
                console.log('Clicked element:', elementInfo);
                
                // simulate the real user click
                element.focus();
                element.click();
                
                // also try to trigger other events
                ['mousedown', 'mouseup', 'change'].forEach(eventType => {
                    try {
                        const event = new Event(eventType, { bubbles: true });
                        element.dispatchEvent(event);
                    } catch (e) {
                        console.log(`Event triggering failed: ${eventType}`, e);
                    }
                });
                
                setTimeout(resolve, this.waitTime);
            } catch (error) {
                console.log('Click failed:', error);
                setTimeout(resolve, 100);
            }
        });
    }

    // record the input element and its path
    recordInputElement(element) {
        const elementInfo = {
            element: element,
            path: this.getElementPath(element),
            triggerPath: [...this.currentPath],
            type: element.type || element.tagName.toLowerCase(),
            placeholder: element.placeholder,
            name: element.name,
            id: element.id,
            className: element.className,
            timestamp: Date.now()
        };
        
        const signature = this.getElementSignature(element);
        if (!this.processed.has(signature)) {
            this.inputElements.push(elementInfo);
            this.processed.add(signature);
            console.log('Found input element:', elementInfo);
        }
    }

    // the main crawling logic
    async crawl(depth = 0) {
        if (depth >= this.maxDepth) {
            console.log('Maximum depth reached, stopping crawling');
            return;
        }

        // wait for the page to be stable
        await new Promise(resolve => setTimeout(resolve, this.waitTime));

        const pageSignature = this.getPageSignature();
        if (this.visitedStates.has(pageSignature)) {
            console.log('Page already visited, skipping');
            return;
        }
        
        this.visitedStates.add(pageSignature);
        console.log(`Crawling depth ${depth}, page: ${window.location.href}`);

        // record all the input elements of the current page
        const inputElements = this.getInputElements();
        inputElements.forEach(element => {
            this.recordInputElement(element);
        });

        // get the clickable elements
        const clickableElements = this.getClickableElements();
        console.log(`找到 ${clickableElements.length} 个可点击元素，${inputElements.length} 个输入元素`);

        // click each clickable element
        for (let i = 0; i < clickableElements.length; i++) {
            const element = clickableElements[i];
            const elementInfo = {
                path: this.getElementPath(element),
                text: element.textContent?.trim(),
                index: i
            };

            // add to the current path
            this.currentPath.push(elementInfo);

            try {
                await this.clickElement(element);
                
                // recursively crawl the new state
                await this.crawl(depth + 1);
                
            } catch (error) {
                console.log('Error processing element:', error);
            } finally {
                // remove the current step
                this.currentPath.pop();
                
                // try to return to the previous page or reset the state
                await this.attemptNavigation();
            }
        }
    }

    // try to navigate back to the previous state
    async attemptNavigation() {
        try {
            // try to press the ESC key
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // try to click the back button
            const backButtons = document.querySelectorAll('[data-testid="back-button"], .back-button, [title*="back"], [title*="Back"]');
            if (backButtons.length > 0) {
                backButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.log('Navigation failed:', error);
        }
    }

    // generate the report
    generateReport() {
        const report = {
            totalInputElements: this.inputElements.length,
            inputElements: this.inputElements.map(item => ({
                path: item.path,
                triggerPath: item.triggerPath,
                type: item.type,
                placeholder: item.placeholder,
                name: item.name,
                id: item.id
            })),
            crawlStats: {
                visitedStates: this.visitedStates.size,
                maxDepthReached: this.currentPath.length
            }
        };
        
        console.log('=== Crawling Report ===');
        console.log(JSON.stringify(report, null, 2));
        
        return report;
    }

    // start the crawling
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

// example usage
async function startMetamaskCrawling() {
    const crawler = new MetamaskCrawler();
    
    // can adjust the parameters
    crawler.maxDepth = 8;  // maximum crawling depth
    crawler.waitTime = 1500;  // wait time for each page
    
    const report = await crawler.start();
    
    // save the result to the global variable for checking
    window.metamaskCrawlReport = report;
    
    console.log('Crawling finished! Result saved to window.metamaskCrawlReport');
    return report;
}

// automatically start (if needed)
if (typeof window !== 'undefined') {
    // wait for the page to be loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(startMetamaskCrawling, 2000);
        });
    } else {
        setTimeout(startMetamaskCrawling, 2000);
    }
}

// export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MetamaskCrawler, startMetamaskCrawling };
}