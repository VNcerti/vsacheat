// ============================================
// EDGE INTERACTIONS - Safe Mobile Interactions
// Version 1.1.0
// Purpose:
// - Cho phép bôi đen text / copy / paste
// - Vẫn chặn kéo ảnh, zoom gesture, nhấn giữ link/button hợp lý
// - Tối ưu cho iOS WebView và trình duyệt hiện đại
// ============================================

(function () {
    'use strict';

    const CONFIG = {
        targetSelectors: null,
        debug: false,

        // Chặn menu chuột phải / nhấn giữ ở các phần tử không nên hiện menu
        blockContextMenu: true,

        // Cho phép bôi đen văn bản
        blockSelection: false,

        // Chặn kéo ảnh/link
        blockDrag: true,

        // Cho phép copy/cut/paste
        blockCopy: false,

        // Chặn nhấn giữ link/button để tránh preview/share menu
        blockLinkLongPress: true
    };

    function log(message, ...args) {
        if (!CONFIG.debug) return;
        console.log('[EdgeInteractions]', message, ...args);
    }

    function shouldProcessElement(element) {
        if (!element) return false;

        if (!CONFIG.targetSelectors || CONFIG.targetSelectors.length === 0) {
            return true;
        }

        for (const selector of CONFIG.targetSelectors) {
            if (element.matches && element.matches(selector)) return true;
            if (element.closest && element.closest(selector)) return true;
        }

        return false;
    }

    function isEditableElement(element) {
        return !!(
            element &&
            (
                element.tagName === 'INPUT' ||
                element.tagName === 'TEXTAREA' ||
                element.isContentEditable ||
                element.closest?.('[contenteditable="true"]')
            )
        );
    }

    function isTextSelectableElement(element) {
        if (!element) return false;

        return !!element.closest?.(
            'p, span, div, h1, h2, h3, h4, h5, h6, li, label, small, strong, b, em, article, section, main, .copyable, .selectable-text'
        );
    }

    function isBlockedLongPressElement(element) {
        if (!element) return false;

        return !!element.closest?.(
            'a, button, img, svg, .nav-pill-item, .nav-pill-icon, .nav-pill-label, .no-longpress, .no-select'
        );
    }

    function preventContextMenu(e) {
        if (!CONFIG.blockContextMenu) return;
        if (!shouldProcessElement(e.target)) return;

        // Cho phép menu copy/paste trên input/textarea/contenteditable
        if (isEditableElement(e.target)) return;

        // Cho phép context menu trên text thường để copy
        if (isTextSelectableElement(e.target) && !isBlockedLongPressElement(e.target)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        log('Blocked context menu:', e.target.tagName);
        return false;
    }

    function preventSelection(e) {
        if (!CONFIG.blockSelection) return;
        if (!shouldProcessElement(e.target)) return;
        if (isEditableElement(e.target)) return;

        e.preventDefault();
        log('Blocked selection:', e.target.tagName);
        return false;
    }

    function preventDrag(e) {
        if (!CONFIG.blockDrag) return;
        if (!shouldProcessElement(e.target)) return;

        const target = e.target;

        if (
            target.tagName === 'IMG' ||
            target.closest?.('img') ||
            target.closest?.('a')
        ) {
            e.preventDefault();
            log('Blocked drag:', target.tagName);
            return false;
        }
    }

    function preventCopy(e) {
        if (!CONFIG.blockCopy) return;

        e.preventDefault();
        e.stopPropagation();
        log('Blocked copy/cut/paste');
        return false;
    }

    let longPressTimeout = null;
    let touchStartTarget = null;
    let touchMoved = false;

    const LONG_PRESS_DURATION = 500;

    function onTouchStart(e) {
        if (!CONFIG.blockLinkLongPress) return;
        if (!shouldProcessElement(e.target)) return;

        touchStartTarget = e.target;
        touchMoved = false;

        // Text thường vẫn cho nhấn giữ để copy
        if (!isBlockedLongPressElement(touchStartTarget)) {
            return;
        }

        longPressTimeout = setTimeout(() => {
            if (!touchStartTarget || touchMoved) return;

            const blockedElement = touchStartTarget.closest?.(
                'a, button, img, svg, .nav-pill-item, .nav-pill-icon, .nav-pill-label, .no-longpress, .no-select'
            );

            if (blockedElement) {
                e.preventDefault();
                log('Blocked long press:', blockedElement.tagName || blockedElement.className);
            }
        }, LONG_PRESS_DURATION);
    }

    function onTouchMove() {
        touchMoved = true;

        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }
    }

    function onTouchEnd() {
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }

        touchStartTarget = null;
        touchMoved = false;
    }

    function preventGestures(e) {
        if (!shouldProcessElement(e.target)) return;

        if (
            e.type === 'gesturestart' ||
            e.type === 'gesturechange' ||
            e.type === 'gestureend'
        ) {
            e.preventDefault();
            log('Blocked gesture:', e.type);
        }
    }

    function injectStyles() {
        const oldStyle = document.getElementById('edge-interactions-styles');
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = 'edge-interactions-styles';

        style.textContent = `
            * {
                -webkit-tap-highlight-color: transparent !important;
            }

            html, body {
                overscroll-behavior: none;
            }

            body, 
            p, span, div, h1, h2, h3, h4, h5, h6, 
            li, label, small, strong, b, em, 
            article, section, main,
            .copyable,
            .selectable-text {
                -webkit-touch-callout: default !important;
                -webkit-user-select: text !important;
                -khtml-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }

            input,
            textarea,
            [contenteditable="true"] {
                -webkit-touch-callout: default !important;
                -webkit-user-select: text !important;
                user-select: text !important;
            }

            img,
            a img,
            picture source {
                -webkit-user-drag: none !important;
                user-drag: none !important;
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
            }

            a,
            button,
            svg,
            .nav-pill-item,
            .nav-pill-icon,
            .nav-pill-label,
            .no-longpress,
            .no-select {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
                touch-action: manipulation !important;
            }

            ::selection {
                background: rgba(0, 122, 255, 0.25) !important;
            }

            ::-moz-selection {
                background: rgba(0, 122, 255, 0.25) !important;
            }
        `;

        document.head.appendChild(style);
        log('Styles injected');
    }

    function bindEvents() {
        document.addEventListener('contextmenu', preventContextMenu, true);
        window.addEventListener('contextmenu', preventContextMenu, true);

        document.addEventListener('selectstart', preventSelection, true);

        document.addEventListener('dragstart', preventDrag, true);
        document.addEventListener('dragend', preventDrag, true);

        if (CONFIG.blockCopy) {
            document.addEventListener('copy', preventCopy, true);
            document.addEventListener('cut', preventCopy, true);
            document.addEventListener('paste', preventCopy, true);
        }

        document.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: false });
        document.addEventListener('touchcancel', onTouchEnd, { passive: false });

        document.addEventListener('gesturestart', preventGestures, true);
        document.addEventListener('gesturechange', preventGestures, true);
        document.addEventListener('gestureend', preventGestures, true);

        log('Events bound');
    }

    function init() {
        injectStyles();
        bindEvents();

        // Không set oncontextmenu="return false" nữa
        // Vì dòng đó sẽ làm mất menu copy khi nhấn giữ text

        log('Edge Interactions initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.EdgeInteractions = {
        version: '1.1.0',
        config: CONFIG,
        reinit: init
    };

})();
