// ==UserScript==
// @name Gemini Model Switcher
// @description Integrate Gemini's model-switching and send actions into standalone buttons. With just a single click, you can send your prompt using your preferred model, making quick model switching much more convenient. This feature only supports the English version of Gemini Web. It also hides unnecessary content in the sidebar.
// @name:zh-CN     Gemini模型切换器
// @description:zh-CN     将Gemini的切换不同模型并点击发送按钮集成为独立的按钮。只需点一下鼠标，即可使用自己想要的模型发送，增加快速切换模型的便捷性。仅支持 Gemini Web 英文。同时隐藏侧边栏中无用的内容
// @namespace     lenor_tamp_code
// @version     13.5
// @author     Lenor
// @match     https://gemini.google.com/*
// @website      https://github.com/LenorEric/Gemini-Model-Button
// @grant     none
// @downloadURL https://update.greasyfork.org/scripts/562721/Gemini%20Model%20Switcher.user.js
// @updateURL https://update.greasyfork.org/scripts/562721/Gemini%20Model%20Switcher.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const MODEL_CONFIG = {
        lite: {
            label: 'Lite',
            currentBaseTexts: ['Flash-Lite'],
            menuTexts: [' 3.1 Flash-Lite ', ' 3.1 Flash-Lite '],
            effort: 'standard'
        },
        liteThinking: {
            label: 'Lite-T',
            currentBaseTexts: ['Flash-Lite'],
            menuTexts: [' 3.1 Flash-Lite ', ' 3.1 Flash-Lite '],
            effort: 'extended'
        },
        flash: {
            label: 'Flash',
            currentBaseTexts: ['Flash'],
            menuTexts: [' 3.5 Flash ', ' 3.5 Flash '],
            effort: 'standard'
        },
        flashThinking: {
            label: 'Flash-T',
            currentBaseTexts: ['Flash'],
            menuTexts: [' 3.5 Flash ', ' 3.5 Flash '],
            effort: 'extended'
        },
        proStandard: {
            label: 'Pro-S',
            currentBaseTexts: ['Pro'],
            menuTexts: [' 3.1 Pro ', ' 3.1 Pro '],
            effort: 'standard'
        },
        proExtended: {
            label: 'Pro-E',
            currentBaseTexts: ['Pro'],
            menuTexts: [' 3.1 Pro ', ' 3.1 Pro '],
            effort: 'extended'
        }
    };

    const THINKING_LEVEL_TEXTS = [' Thinking level ', ' 思考等级 '];
    const EFFORT_TEXTS = {
        standard: [' Standard ', ' 标准 '],
        extended: [' Extended ', ' 拓展 ']
    };

    function getEl(xpath, context = document, expectedTagName = null) {
        const result = document.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const normalizedTagName = expectedTagName ? expectedTagName.toUpperCase() : null;

        for (let i = 0; i < result.snapshotLength; i++) {
            const element = result.snapshotItem(i);
            if (!normalizedTagName || element.tagName === normalizedTagName) {
                return element;
            }
        }

        return null;
    }

    function toXPathLiteral(text) {
        if (!text.includes("'")) {
            return `'${text}'`;
        }

        if (!text.includes('"')) {
            return `"${text}"`;
        }

        return `concat('${text.split("'").join(`', "'", '`)}')`;
    }

    function asArray(value) {
        return Array.isArray(value) ? value : [value];
    }

    function findFirstMatchingElement(texts, context = document) {
        for (const text of asArray(texts)) {
            const normalizedText = text.trim();
            const textMatchers = [
                `text()=${toXPathLiteral(text)}`,
                `normalize-space(text())=${toXPathLiteral(normalizedText)}`
            ];

            for (const matcher of textMatchers) {
                const exactTextMatch1 = getEl(`.//*[${matcher}]`, context, 'SPAN');
                if (exactTextMatch1) {
                    return { element: exactTextMatch1, matchedText: text };
                }
                const exactTextMatch2 = getEl(`.//*[${matcher}]`, context, 'DIV');
                if (exactTextMatch2) {
                    return { element: exactTextMatch2, matchedText: text };
                }
            }
        }

        return null;
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let isSwitching = false;

    function getSwitcherButton() {
        return getEl('//input-area-v2//bard-mode-switcher//button') || getEl('//bard-mode-switcher//button');
    }

    function getModelButtonBox(switcherBtn = getSwitcherButton()) {
        if (!switcherBtn) {
            return null;
        }

        return switcherBtn.querySelector('.mdc-button__label') || switcherBtn;
    }

    function getCurrentSelection(model, switcherBtn = getSwitcherButton()) {
        const modelButtonBox = getModelButtonBox(switcherBtn);
        if (!modelButtonBox) {
            return null;
        }

        const currentBase = findFirstMatchingElement(model.currentBaseTexts, modelButtonBox);
        const currentExtended = findFirstMatchingElement(EFFORT_TEXTS.extended, modelButtonBox);
        const currentEffort = currentExtended ? 'extended' : 'standard';

        return {
            baseMatches: Boolean(currentBase),
            effortMatches: currentEffort === model.effort,
            currentEffort
        };
    }

    async function waitForMatchingElement(texts, context = document, timeoutMs = 1500, intervalMs = 50) {
        const start = Date.now();

        while (Date.now() - start <= timeoutMs) {
            const match = findFirstMatchingElement(texts, context);
            if (match) {
                return match;
            }

            await delay(intervalMs);
        }

        return null;
    }

    async function selectBaseModel(switcherBtn, model) {
        switcherBtn.click();

        const menuOption = await waitForMatchingElement(model.menuTexts);
        if (!menuOption) {
            console.error(`[GeminiScript] 未找到基础模型: ${model.menuTexts.join(' / ')}`);
            switcherBtn.click();
            return false;
        }

        console.log(`[GeminiScript] 选择基础模型 "${menuOption.matchedText}"`);
        menuOption.element.click();
        return true;
    }

    async function selectThinkingEffort(targetEffort) {
        const switcherBtn = getSwitcherButton();
        if (!switcherBtn) {
            console.error('[GeminiScript] 找不到菜单触发按钮');
            return false;
        }

        switcherBtn.click();

        const thinkingLevel = await waitForMatchingElement(THINKING_LEVEL_TEXTS);
        if (!thinkingLevel) {
            console.error('[GeminiScript] 找不到 Thinking level 按钮');
            switcherBtn.click();
            return false;
        }

        thinkingLevel.element.click();

        const effortOption = await waitForMatchingElement(EFFORT_TEXTS[targetEffort]);
        if (!effortOption) {
            console.error(`[GeminiScript] 找不到思考等级: ${EFFORT_TEXTS[targetEffort].join(' / ')}`);
            return false;
        }

        console.log(`[GeminiScript] 选择思考等级 "${effortOption.matchedText}"`);
        effortOption.element.click();
        return true;
    }

    async function switchAndSend(modelKey) {
        if (isSwitching) {
            console.warn('[GeminiScript] 正在切换模型，请稍候');
            return;
        }

        const model = MODEL_CONFIG[modelKey];
        if (!model) {
            console.error(`[GeminiScript] 未知模型喵 key: ${modelKey}`);
            return;
        }

        isSwitching = true;

        try {
            const switcherBtn = getSwitcherButton();
            if (!switcherBtn) {
                console.error('[GeminiScript] 找不到菜单触发按钮');
                return;
            }

            const currentSelection = getCurrentSelection(model, switcherBtn);
            if (!currentSelection) {
                console.error('[GeminiScript] 找不到当前模型按钮区域');
                return;
            }

            console.log(`[GeminiScript] 准备切换到: ${model.label}`);

            let baseChanged = false;
            if (!currentSelection.baseMatches) {
                baseChanged = await selectBaseModel(switcherBtn, model);
                if (!baseChanged) {
                    return;
                }
                await delay(250);
            }

            const shouldSelectEffort = model.effort === 'extended'
                ? baseChanged || !currentSelection.effortMatches
                : !baseChanged && !currentSelection.effortMatches;

            if (shouldSelectEffort) {
                const effortSelected = await selectThinkingEffort(model.effort);
                if (!effortSelected) {
                    return;
                }
                await delay(150);
            }

            const sendBtn = getEl("//gem-icon-button[contains(@class, 'send-button')]", document, "GEM-ICON-BUTTON");

            if (sendBtn) {
                console.log('[GeminiScript] 点击发送');
                sendBtn.click();
            } else {
                console.error('[GeminiScript] 找不到发送按钮');
            }
        } finally {
            isSwitching = false;
        }
    }

    function hideSidebarNotebookLm() {
        const selectorsToHide = [
            '#app-root > main > side-navigation-v2 > bard-sidenav-container > bard-sidenav > side-navigation-content > div > div > infinite-scroller > mat-nav-list',
            '#app-root > main > side-navigation-v2 > bard-sidenav-container > bard-sidenav > side-navigation-content > div > div > infinite-scroller > expandable-section:nth-child(4)'
        ];

        for (const selector of selectorsToHide) {
            const element = document.querySelector(selector);
            if (!element) {
                continue;
            }

            element.style.setProperty('display', 'none', 'important');
            element.style.setProperty('visibility', 'hidden', 'important');
        }
    }

    function injectUI() {
        if (document.getElementById('gemini-vertical-switcher')) return;

        const inputArea = getEl('//input-area-v2');
        if (!inputArea) return;

        if (getComputedStyle(inputArea).position === 'static') {
            inputArea.style.position = 'relative';
        }
        inputArea.style.overflow = 'visible';

        const container = document.createElement('div');
        container.id = 'gemini-vertical-switcher';
        container.style.position = 'absolute';
        container.style.right = '-175px';
        container.style.bottom = '0px';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(2, 80px)';
        container.style.gridTemplateRows = 'repeat(3, 38px)';
        container.style.gap = '5px';
        container.style.zIndex = '100';

        const createBtn = (label, key, colorStart, colorEnd) => {
            const btn = document.createElement('button');
            btn.innerText = label;

            btn.style.width = '80px';
            btn.style.height = '38px';
            btn.style.background = `linear-gradient(135deg, ${colorStart}, ${colorEnd})`;
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.borderRadius = '12px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '12px';
            btn.style.fontWeight = '550';
            btn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
            btn.style.transition = 'transform 0.1s, box-shadow 0.1s';
            btn.style.fontFamily = '"Google Sans", Roboto, Arial, sans-serif';

            btn.onmouseover = () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 6px 8px rgba(0,0,0,0.3)';
            };
            btn.onmouseout = () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
            };

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    btn.style.transform = 'translateY(-2px)';
                }, 100);
                switchAndSend(key);
            };

            return btn;
        };

        container.appendChild(createBtn('Lite', 'lite', '#34a853', '#2e8b46'));
        container.appendChild(createBtn('Lite-T', 'liteThinking', '#0f9d58', '#0b8043'));
        container.appendChild(createBtn('Flash', 'flash', '#4285f4', '#3367d6'));
        container.appendChild(createBtn('Flash-T', 'flashThinking', '#1a73e8', '#174ea6'));
        container.appendChild(createBtn('Pro-S', 'proStandard', '#9c27b0', '#7b1fa2'));
        container.appendChild(createBtn('Pro-E', 'proExtended', '#673ab7', '#512da8'));

        inputArea.appendChild(container);
    }

    const observer = new MutationObserver(() => {
        hideSidebarNotebookLm();
        injectUI();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    hideSidebarNotebookLm();
    setTimeout(() => {
        hideSidebarNotebookLm();
        injectUI();
    }, 1500);
})();

