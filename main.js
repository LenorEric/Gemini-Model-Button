// ==UserScript==
// @name     Gemini Model Switcher
// @namespace     lenor_tamp_code
// @version     11.1
// @description     将Gemini的切换不同模型并点击发送按钮集成为独立的三个按钮。只需点一下鼠标，即可使用自己想要的模型发送，增加快速切换模型的便捷性。支持 Gemini Web 英文和中文界面
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
        fast: {
            name: ['Fast', '快速'],
            descriptions: [' Answers quickly ', ' 快速回答 ']
        },
        thinking: {
            name: ['Thinking', '思考'],
            descriptions: [' Solves complex problems ', ' 解决复杂问题 ']
        },
        pro: {
            name: ['Pro', 'Pro'],
            descriptions: [
                ' Advanced math and code with 3.1 Pro ',
                ' 使用 3.1 Pro 处理高阶数学和代码任务 '
            ]
        }
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
            const exactTextMatch = getEl(`//*[text()=${toXPathLiteral(text)}]`, context, 'SPAN');
            if (exactTextMatch) {
                return { element: exactTextMatch, matchedText: text };
            }
        }

        return null;
    }

    async function switchAndSend(modelKey) {
        const model = MODEL_CONFIG[modelKey];
        if (!model) {
            console.error(`[GeminiScript] 未知模型 key: ${modelKey}`);
            return;
        }

        const modelNames = asArray(model.name);
        const modelDescriptions = asArray(model.descriptions);

        console.log(`[GeminiScript] 准备切换到: ${modelNames.join(' / ')}`);

        const currentModel = findFirstMatchingElement(modelNames);
        if (currentModel && currentModel.element.tagName === 'SPAN') {
            console.log('[GeminiScript] 已经是这个模型了喵');
        } else {
            const switcherBtn = getEl('//bard-mode-switcher//button');
            if (!switcherBtn) {
                console.error('[GeminiScript] 找不到菜单触发按钮');
                return;
            }

            switcherBtn.click();

            const menuOption = findFirstMatchingElement(modelDescriptions);

            if (menuOption) {
                console.log(`[GeminiScript] 找到菜单项 "${menuOption.matchedText}"，点击中...`);
                menuOption.element.click();
            } else {
                console.error(`[GeminiScript] 未找到这些文字中的任意一个: ${modelDescriptions.join(' / ')}`);
                switcherBtn.click();
                return;
            }
        }

        let sendBtn = getEl("//button[contains(@class, 'send-button')]");

        if (!sendBtn) {
            console.log('[GeminiScript] 第一次找到的发送按钮不对');
            sendBtn = getEl("//input-area-v2//div[contains(@class, 'input-area-container')]//button[not(@disabled)]");
        }

        if (sendBtn) {
            console.log('[GeminiScript] 点击发送');
            sendBtn.click();
        } else {
            console.error('[GeminiScript] 找不到发送按钮');
        }
    }

    function hideSidebarNotebookLm() {
        const selectorsToHide = [
            '#app-root > main > side-navigation-v2 > bard-sidenav-container > bard-sidenav > side-navigation-content > div > div > infinite-scroller > project-sidenav-list > div > div',
            '#app-root > main > side-navigation-v2 > bard-sidenav-container > bard-sidenav > side-navigation-content > div > div > infinite-scroller > project-sidenav-list > div > side-nav-entry-button.new-project-button'
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
        container.style.right = '-100px';
        container.style.bottom = '0px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
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

        container.appendChild(createBtn('Fast', 'fast', '#34a853', '#2e8b46'));
        container.appendChild(createBtn('Thinking', 'thinking', '#4285f4', '#3367d6'));
        container.appendChild(createBtn('Pro', 'pro', '#9c27b0', '#7b1fa2'));

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

