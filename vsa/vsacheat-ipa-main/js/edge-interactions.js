// ============================================
// EDGE INTERACTIONS - Disable Long Press & Context Menu
// Version 1.0.0
// Purpose: Prevent context menu, copy, share, link preview on long press
// for iOS WebView and all modern browsers
// ============================================

(function() {
    'use strict';
    
    // ===== CONFIGURATION =====
    const CONFIG = {
        // Chỉ áp dụng cho các phần tử này (nếu là string selector)
        // Nếu để null thì áp dụng cho tất cả
        targetSelectors: null, // example: ['a', '.nav-pill-item', 'button']
        
        // Debug mode - in ra console để kiểm tra
        debug: false,
        
        // Chặn context menu trên toàn trang
        blockContextMenu: true,
        
        // Chặn selection (bôi đen văn bản)
        blockSelection: true,
        
        // Chặn drag image (kéo thả ảnh)
        blockDrag: true,
        
        // Chặn copy/cut/paste
        blockCopy: true,
        
        // Chặn long press trên link
        blockLinkLongPress: true,
        
        // Thời gian debounce (ms) để tránh ảnh hưởng đến tap bình thường
        debounceDelay: 0
    };
    
    // ===== HELPER FUNCTIONS =====
    function log(message, type = 'info') {
        if (!CONFIG.debug) return;
        
        const prefix = '[EdgeInteractions]';
        switch(type) {
            case 'error':
                console.error(prefix, message);
                break;
            case 'warn':
                console.warn(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    }
    
    // Kiểm tra xem phần tử có cần được xử lý không
    function shouldProcessElement(element) {
        if (!CONFIG.targetSelectors || CONFIG.targetSelectors.length === 0) {
            return true;
        }
        
        // Kiểm tra element có match selector nào không
        for (const selector of CONFIG.targetSelectors) {
            if (element.matches && element.matches(selector)) {
                return true;
            }
            // Kiểm tra parent (cho phép chọn vùng)
            if (element.closest && element.closest(selector)) {
                return true;
            }
        }
        
        return false;
    }
    
    // ===== PREVENT CONTEXT MENU (Chặn menu chuột phải / nhấn giữ) =====
    function preventContextMenu(e) {
        // Cho phép nếu element không cần xử lý
        if (!shouldProcessElement(e.target)) {
            return;
        }
        
        // Chặn context menu
        if (CONFIG.blockContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            log('Blocked context menu on:', e.target.tagName, e.target.className);
            return false;
        }
    }
    
    // ===== PREVENT TEXT SELECTION (Chặn bôi đen văn bản) =====
    function preventSelection(e) {
        if (!CONFIG.blockSelection) return;
        if (!shouldProcessElement(e.target)) return;
        
        // Ngăn chặn selection bắt đầu
        e.preventDefault();
        log('Blocked selection start on:', e.target.tagName);
        return false;
    }
    
    // ===== PREVENT DRAG (Chặn kéo thả ảnh/link) =====
    function preventDrag(e) {
        if (!CONFIG.blockDrag) return;
        if (!shouldProcessElement(e.target)) return;
        
        e.preventDefault();
        log('Blocked drag on:', e.target.tagName);
        return false;
    }
    
    // ===== PREVENT COPY/CUT (Chặn sao chép) =====
    function preventCopy(e) {
        if (!CONFIG.blockCopy) return;
        
        // Kiểm tra clipboardData nếu có
        if (e.clipboardData) {
            e.clipboardData.setData('text/plain', '');
            e.clipboardData.clearData();
        }
        
        e.preventDefault();
        e.stopPropagation();
        log('Blocked copy/cut event');
        return false;
    }
    
    // ===== PREVENT LONG PRESS ON LINKS (Chặn nhấn giữ link) =====
    // Lưu trữ timeout cho long press detection
    let longPressTimeout = null;
    let isLongPressTriggered = false;
    let touchStartTarget = null;
    let touchStartTime = 0;
    const LONG_PRESS_DURATION = 500; // 500ms để nhận diện long press
    
    function onTouchStart(e) {
        if (!CONFIG.blockLinkLongPress) return;
        if (!shouldProcessElement(e.target)) return;
        
        // Lưu thông tin touch start
        touchStartTarget = e.target;
        touchStartTime = Date.now();
        isLongPressTriggered = false;
        
        // Đặt timeout để phát hiện long press
        longPressTimeout = setTimeout(() => {
            if (touchStartTarget && !isLongPressTriggered) {
                isLongPressTriggered = true;
                // Phát sự kiện long press (có thể tùy chỉnh thêm)
                log('Long press detected on:', touchStartTarget.tagName);
                
                // Ngăn chặn hành vi mặc định của long press trên link
                const preventEvent = new Event('contextmenu', {
                    cancelable: true,
                    bubbles: true
                });
                if (touchStartTarget.dispatchEvent(preventEvent)) {
                    e.preventDefault();
                }
            }
        }, LONG_PRESS_DURATION);
    }
    
    function onTouchMove(e) {
        // Nếu người dùng di chuyển ngón tay, hủy long press detection
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }
        touchStartTarget = null;
    }
    
    function onTouchEnd(e) {
        // Hủy timeout khi kết thúc touch
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }
        
        // Reset trạng thái
        touchStartTarget = null;
        isLongPressTriggered = false;
    }
    
    // ===== CSS STYLES TO DISABLE USER INTERACTION (CSS layer) =====
    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'edge-interactions-styles';
        style.textContent = `
            /* Disable user select on all elements */
            * {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                -khtml-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            
            /* Allow select on input/textarea elements for usability */
            input, textarea, [contenteditable="true"] {
                -webkit-touch-callout: default !important;
                -webkit-user-select: text !important;
                user-select: text !important;
            }
            
            /* Disable image dragging */
            img, a img, picture source {
                -webkit-user-drag: none !important;
                user-drag: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
            }
            
            /* Disable link preview on iOS */
            a, button, .nav-pill-item, .nav-pill-icon, .nav-pill-label {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                touch-action: manipulation !important;
            }
            
            /* Prevent text selection on pseudo elements */
            ::selection {
                background: transparent !important;
            }
            
            ::-moz-selection {
                background: transparent !important;
            }
        `;
        
        document.head.appendChild(style);
        log('Injected CSS styles to disable user interactions');
    }
    
    // ===== PREVENT ALL GESTURES =====
    function preventGestures(e) {
        if (!shouldProcessElement(e.target)) return;
        
        // Chặn các gesture events
        const gestureEvents = ['gesturestart', 'gesturechange', 'gestureend'];
        if (gestureEvents.includes(e.type)) {
            e.preventDefault();
            log('Blocked gesture:', e.type);
        }
    }
    
    // ===== FIX: Đối với iOS WebView, có thể cần xử lý thêm sự kiện "contextmenu" riêng =====
    function fixiOSContextMenu() {
        // iOS đôi khi gửi contextmenu event khác
        document.addEventListener('contextmenu', function(e) {
            if (shouldProcessElement(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                log('Blocked iOS contextmenu');
                return false;
            }
        }, true);
    }
    
    // ===== BIND ALL EVENT LISTENERS =====
    function bindEvents() {
        // Ngăn context menu (chuột phải / long press)
        if (CONFIG.blockContextMenu) {
            document.addEventListener('contextmenu', preventContextMenu, true);
            // Thêm vào window để đảm bảo
            window.addEventListener('contextmenu', preventContextMenu, true);
        }
        
        // Ngăn selection
        if (CONFIG.blockSelection) {
            document.addEventListener('selectstart', preventSelection, true);
            document.addEventListener('selectionchange', function(e) {
                // Clear selection nếu có
                if (window.getSelection) {
                    const selection = window.getSelection();
                    if (selection && selection.toString().length > 0) {
                        selection.removeAllRanges();
                    }
                }
            }, true);
        }
        
        // Ngăn drag
        if (CONFIG.blockDrag) {
            document.addEventListener('dragstart', preventDrag, true);
            document.addEventListener('dragend', preventDrag, true);
        }
        
        // Ngăn copy
        if (CONFIG.blockCopy) {
            document.addEventListener('copy', preventCopy, true);
            document.addEventListener('cut', preventCopy, true);
            // Thêm paste để an toàn
            document.addEventListener('paste', function(e) {
                if (shouldProcessElement(e.target)) {
                    e.preventDefault();
                    log('Blocked paste event');
                }
            }, true);
        }
        
        // Ngăn long press link (touch events)
        if (CONFIG.blockLinkLongPress) {
            document.addEventListener('touchstart', onTouchStart, { passive: false });
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd, { passive: false });
            document.addEventListener('touchcancel', onTouchEnd, { passive: false });
        }
        
        // Ngăn gesture events
        document.addEventListener('gesturestart', preventGestures, true);
        document.addEventListener('gesturechange', preventGestures, true);
        document.addEventListener('gestureend', preventGestures, true);
        
        // Bổ sung cho iOS WebView
        fixiOSContextMenu();
        
        log('All event listeners bound successfully');
    }
    
    // ===== AUTO INITIALIZE =====
    function init() {
        log('Initializing Edge Interactions...');
        
        // Inject CSS styles first
        injectStyles();
        
        // Bind all event listeners
        bindEvents();
        
        // Thêm attribute disable context menu cho body
        document.body.setAttribute('oncontextmenu', 'return false;');
        
        log('Edge Interactions initialized successfully');
        
        // Log environment info for debugging
        if (CONFIG.debug) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent);
            log(`Environment: ${isIOS ? 'iOS' : 'Non-iOS'}, WebView: ${isWebView}`);
        }
    }
    
    // Chờ DOM load xong mới khởi tạo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export để sử dụng nếu cần (optional)
    window.EdgeInteractions = {
        version: '1.0.0',
        config: CONFIG,
        reinit: init
    };
    
})();
