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
    // 检查并处理新打开的页面
    async handleNewPages() {
        try {
            const allPages = await this.browser.pages();
            const newPages = allPages.filter(page => page !== this.originalPage);

            if (newPages.length > 0) {
                console.log(`检测到 ${newPages.length} 个新页面，准备关闭...`);

                // 关闭所有新页面
                for (const newPage of newPages) {
                    try {
                        const url = newPage.url();
                        console.log(`关闭新页面: ${url}`);
                        await newPage.close();
                    } catch (error) {
                        console.log('关闭页面失败:', error.message);
                    }
                }

                // 确保焦点回到原始页面
                await this.originalPage.bringToFront();
                await new Promise(resolve => setTimeout(resolve, 500));

                console.log('已关闭所有新页面，焦点返回原页面');
                return true;
            }

            return false;
        } catch (error) {
            console.log('处理新页面时出错:', error.message);
            return false;
        }
    }

    // 检查是否有弹窗并关闭
    async handlePopups() {
        try {
            // 检查是否有JavaScript弹窗
            this.page.on('dialog', async dialog => {
                console.log('检测到弹窗:', dialog.message());
                await dialog.dismiss();
            });

            // 检查是否有模态框或覆盖层
            const modals = await this.page.$$('.modal, .overlay, .popup, [role="dialog"]');
            for (const modal of modals) {
                try {
                    const isVisible = await this.page.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    }, modal);

                    if (isVisible) {
                        // 尝试点击关闭按钮
                        const closeButton = await modal.$('.close, .modal-close, [data-dismiss="modal"], .fa-times');
                        if (closeButton) {
                            await closeButton.click();
                            console.log('关闭了模态框');
                        } else {
                            // 如果没有关闭按钮，按ESC键
                            await this.page.keyboard.press('Escape');
                        }
                    }
                } catch (error) {
                    console.log('处理模态框失败:', error.message);
                }
            }
        } catch (error) {
            console.log('处理弹窗失败:', error.message);
        }
    }
    // 改进后的获取页面唯一标识符方法
    async getPageSignature() {
        return await this.page.evaluate(() => {
            // 1. 统计各种元素的数量和属性
            const buttons = document.querySelectorAll('button, [role="button"], .button');
            const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
            const links = document.querySelectorAll('a[href]');
            const selects = document.querySelectorAll('select');
            const clickableElements = document.querySelectorAll('[onclick], [role="button"], button, a[href]');
            
            // 2. 获取可见元素的详细信息
            function getVisibleElementsSignature() {
                const visibleElements = [];
                
                // 获取所有可能交互的元素
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
                            
                            // 只考虑可见元素
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
                                        x: Math.round(rect.left / 10) * 10, // 减少精度避免微小移动
                                        y: Math.round(rect.top / 10) * 10,
                                        w: Math.round(rect.width / 10) * 10,
                                        h: Math.round(rect.height / 10) * 10
                                    }
                                });
                            }
                        });
                    } catch (e) {
                        // 忽略错误的选择器
                    }
                });
                
                return visibleElements;
            }
            
            // 3. 获取页面结构特征
            function getPageStructure() {
                const structure = {};
                
                // 统计各种类型的可见元素数量
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
            
            // 4. 获取特定类名的元素（Metamask特有的）
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
                            texts: texts.slice(0, 5) // 只保留前5个文本
                        };
                    } catch (e) {
                        metamaskElements[selector] = { count: 0, texts: [] };
                    }
                });
                
                return metamaskElements;
            }
            
            // 5. 获取文本内容特征
            function getTextSignature() {
                const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, a');
                const significantTexts = [];
                
                textElements.forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && text.length > 2 && text.length < 100) {
                        const style = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();
                        
                        // 只考虑可见的文本
                        if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
                            significantTexts.push(text);
                        }
                    }
                });
                
                // 对文本进行排序以确保一致性，然后取前20个
                return significantTexts.sort().slice(0, 20);
            }
            
            // 6. 获取表单状态
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
                        if (input.type !== 'password') { // 不记录密码
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
            
            // 7. 生成综合签名
            const visibleElements = getVisibleElementsSignature();
            const pageStructure = getPageStructure();
            const metamaskElements = getMetamaskSpecificElements();
            const textSignature = getTextSignature();
            const formSignature = getFormSignature();
            
            const signature = {
                // 基础计数
                counts: {
                    buttons: buttons.length,
                    inputs: inputs.length,
                    links: links.length,
                    selects: selects.length,
                    clickable: clickableElements.length
                },
                
                // 页面结构
                structure: pageStructure,
                
                // 可见元素特征（生成哈希以减少数据量）
                visibleElementsHash: JSON.stringify(visibleElements).substring(0, 500),
                
                // Metamask特定元素
                metamask: metamaskElements,
                
                // 文本特征
                textHash: textSignature.join('|').substring(0, 300),
                
                // 表单状态
                forms: formSignature,
                
                // URL和标题
                url: window.location.href,
                title: document.title,
                
                // 时间戳（用于调试）
                timestamp: Date.now()
            };
            
            // 生成最终的签名字符串
            const finalSignature = JSON.stringify(signature);
            
            // 如果签名太长，生成哈希
            if (finalSignature.length > 2000) {
                // 简单的哈希函数
                let hash = 0;
                for (let i = 0; i < finalSignature.length; i++) {
                    const char = finalSignature.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // 转换为32位整数
                }
                return hash.toString() + '_' + finalSignature.substring(0, 1000);
            }
            
            return finalSignature;
        });
    }
    // 识别可点击的元素
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
                // Metamask特定选择器
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
                    console.log(`选择器错误: ${selector}`, e);
                }
            });

            return elements;
        });
    }

    // 识别可输入的元素
    async getInputElements() {
        return await this.page.evaluate(() => {
            const selectors = [
                'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled])',
                'textarea:not([disabled])',
                '[contenteditable="true"]:not([disabled])',
                'select:not([disabled])',
                // Metamask特定输入元素
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
                    console.log(`输入选择器错误: ${selector}`, e);
                }
            });

            return elements;
        });
    }
    // 智能元素定位 (保持之前的代码)
    async findElement(elementInfo) {
        try {
            if (elementInfo.id) {
                try {
                    const element = await this.page.$(`#${elementInfo.id}`);
                    if (element) return element;
                } catch (e) {
                    // 继续尝试其他方法
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
                    // 继续尝试其他方法
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
                    // 继续尝试其他方法
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
                    // 最后的尝试失败
                }
            }

            return null;
        } catch (error) {
            console.log('元素定位失败:', error.message);
            return null;
        }
    }

     // 修改后的点击元素方法 - 添加了新页面处理
     async clickElement(elementInfo) {
        try {
            console.log('尝试点击元素:', elementInfo.text || elementInfo.tagName);
            
            // 记录点击前的页面数量
            const pagesBefore = await this.browser.pages();
            const pagesCountBefore = pagesBefore.length;
            
            const element = await this.findElement(elementInfo);
            
            if (element) {
                // 滚动到元素可见
                await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // 确保元素在视口内
                await this.page.evaluate(el => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, element);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // 点击元素
                await element.click();
                
                // 等待一小段时间让新页面有时间打开
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // 检查是否有新页面打开
                const pagesAfter = await this.browser.pages();
                const pagesCountAfter = pagesAfter.length;
                
                if (pagesCountAfter > pagesCountBefore) {
                    console.log(`检测到新页面打开 (${pagesCountBefore} -> ${pagesCountAfter})`);
                    await this.handleNewPages();
                }
                
                // 处理可能的弹窗
                // await this.handlePopups();
                
                // 确保我们仍在原始页面上
                await this.originalPage.bringToFront();
                
                // 最终等待
                await new Promise(resolve => setTimeout(resolve, this.waitTime - 800));
                
                return true;
            } else {
                console.log('无法定位元素:', elementInfo.text || elementInfo.tagName);
                return false;
            }
            
        } catch (error) {
            console.log('点击失败:', error.message);
            
            // 即使出错也要检查新页面
            try {
                await this.handleNewPages();
                await this.originalPage.bringToFront();
            } catch (e) {
                console.log('错误恢复失败:', e.message);
            }
            
            return false;
        }
    }

    // 记录输入元素及其路径
    recordInputElement(elementInfo) {
        const fullInfo = {
            ...elementInfo,
            triggerPath: [...this.currentPath],
            timestamp: Date.now()
        };
        
        if (!this.processed.has(elementInfo.signature)) {
            this.inputElements.push(fullInfo);
            this.processed.add(elementInfo.signature);
            console.log('发现输入元素:', {
                path: fullInfo.path,
                type: fullInfo.type,
                triggerPath: fullInfo.triggerPath.map(p => p.text || p.tagName)
            });
        }
    }

    // 尝试返回上一状态
    async attemptNavigation() {
        try {
            // 尝试按ESC键
            await this.page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 尝试点击返回按钮
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
                    // 继续尝试下一个选择器
                }
            }
        } catch (error) {
            console.log('导航失败:', error.message);
        }
    }

    // 主要的爬取逻辑
    async crawl(depth = 0) {
        if (depth >= this.maxDepth) {
            console.log('达到最大深度，停止爬取');
            return;
        }

        // 等待页面稳定
        await new Promise(resolve => setTimeout(resolve, this.waitTime));

        const pageSignature = await this.getPageSignature();
        if (this.visitedStates.has(pageSignature)) {
            console.log('页面已访问过，跳过');
            return;
        }
        
        this.visitedStates.add(pageSignature);
        console.log(`爬取深度 ${depth}, 当前页面已记录`);

        // 记录当前页面的所有输入元素
        const inputElements = await this.getInputElements();
        inputElements.forEach(element => {
            this.recordInputElement(element);
        });

        // 获取可点击元素
        const clickableElements = await this.getClickableElements();
        console.log(`找到 ${clickableElements.length} 个可点击元素，${inputElements.length} 个输入元素`);

        // 点击每个可点击元素
        for (let i = 0; i < clickableElements.length; i++) {
            const element = clickableElements[i];
            
            // 添加到当前路径
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
                    // 递归爬取新状态
                    await this.crawl(depth + 1);
                }
                
            } catch (error) {
                console.log('处理元素时出错:', error.message);
            } finally {
                // 移除当前步骤
                this.currentPath.pop();
                
                // 尝试返回上一状态
                await this.attemptNavigation();
            }
        }
    }

    // 生成报告
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
        
        console.log('=== 爬取报告 ===');
        console.log(JSON.stringify(report, null, 2));
        
        return report;
    }

    // 启动爬取
    async start() {
        console.log('开始爬取 Metamask 插件...');
        try {
            await this.crawl();
            return this.generateReport();
        } catch (error) {
            console.error('爬取过程中出现错误:', error);
            return this.generateReport();
        }
    }
}

// 主函数 - 启动Metamask爬取
async function startMetamaskCrawling(options = {}) {
    const {
        maxDepth = 8,
        waitTime = 1500
    } = options;

    try {
        const {browser, metamaskPage} = await initMetaMask();
        // console.log('metamaskPage', metamaskPage);

        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3_000));

        // 创建爬虫实例
        const crawler = new MetamaskCrawler(browser, metamaskPage);
        crawler.maxDepth = maxDepth;
        crawler.waitTime = waitTime;

        // 开始爬取
        const report = await crawler.start();

        return {
            report,
            browser,
            page: metamaskPage
        };

    } catch (error) {
        console.error('启动失败:', error);
        await browser.close();
        throw error;
    }
}

// 使用示例
async function main() {
    try {
        const result = await startMetamaskCrawling({
            headless: false,  // 设置为true可以无头模式运行
            maxDepth: 6,
            waitTime: 1000
        });

        console.log('爬取完成！');
        console.log('报告:', result.report);

        // 保持浏览器打开以便检查结果
        // await result.browser.close();

    } catch (error) {
        console.error('程序执行失败:', error);
    }
}

// 导出
export { MetamaskCrawler, startMetamaskCrawling };
