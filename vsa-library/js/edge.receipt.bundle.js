// ==================================================
// edge.receipt.bundle.js
// Receipt Upload + Telegram Order Status Bundle
// ==================================================

(function () {
    'use strict';

    const DEFAULT_RECEIPT_BASE_ENDPOINT =
        window.RECEIPT_API_BASE_ENDPOINT ||
        window.RECEIPT_BASE_ENDPOINT ||
        'https://pay.vsacheat.com';

    const LEGACY_RECEIPT_UPLOAD_ENDPOINT =
        window.RECEIPT_UPLOAD_ENDPOINT || '';

    const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

    const PLAN_MAP = {
        lite: { name: 'Lite Package', durationDays: 7 },
        trial: { name: 'Trial Package', durationDays: 30 },
        basic: { name: 'Basic Package', durationDays: 90 },
        plus: { name: 'Plus Package', durationDays: 180 },
        premium: { name: 'Premium Package', durationDays: 365 }
    };

    let selectedReceiptFile = null;
    let receiptUploaded = false;
    let latestPaymentOrderId = localStorage.getItem('latestPaymentOrderId') || '';
    let orderStatusTimer = null;
    let originalThankYouHTML = '';

    const $ = (id) => document.getElementById(id);

    const els = {
        receiptFileInput: null,
        receiptChooseBtn: null,
        receiptPreview: null,
        receiptFileName: null,
        uploadReceiptBtn: null,
        receiptUploadStatus: null,
        receiptUploadedFlag: null,
        thankYouPage: null,
        selectedPlanName: null,
        paymentAmount: null,
        paymentNote: null,
        userName: null,
        userDisplayName: null
    };

    function bindElements() {
        els.receiptFileInput = $('receiptFileInput');
        els.receiptChooseBtn = $('receiptChooseBtn');
        els.receiptPreview = $('receiptPreview');
        els.receiptFileName = $('receiptFileName');
        els.uploadReceiptBtn = $('uploadReceiptBtn');
        els.receiptUploadStatus = $('receiptUploadStatus');
        els.receiptUploadedFlag = $('receiptUploadedFlag');
        els.thankYouPage = $('thankYouPage');
        els.selectedPlanName = $('selectedPlanName');
        els.paymentAmount = $('paymentAmount');
        els.paymentNote = $('paymentNote');
        els.userName = $('userName');
        els.userDisplayName = $('userDisplayName');

        if (els.thankYouPage && !originalThankYouHTML) {
            originalThankYouHTML = els.thankYouPage.innerHTML;
        }
    }

    function cleanBaseUrl(url) {
        return String(url || '')
            .trim()
            .replace(/\/upload-receipt\/?$/i, '')
            .replace(/\/order-status\/?$/i, '')
            .replace(/\/$/, '');
    }

    function getReceiptBaseEndpoint() {
        const explicitBase =
            window.ORDER_STATUS_BASE_ENDPOINT ||
            window.RECEIPT_API_BASE_ENDPOINT ||
            window.RECEIPT_BASE_ENDPOINT ||
            LEGACY_RECEIPT_UPLOAD_ENDPOINT ||
            DEFAULT_RECEIPT_BASE_ENDPOINT;

        return cleanBaseUrl(explicitBase);
    }

    function getReceiptUploadEndpoint() {
        const explicitUpload = String(LEGACY_RECEIPT_UPLOAD_ENDPOINT || '').trim();

        if (explicitUpload && /\/upload-receipt\/?$/i.test(explicitUpload)) {
            return explicitUpload.replace(/\/$/, '');
        }

        const base = explicitUpload ? cleanBaseUrl(explicitUpload) : getReceiptBaseEndpoint();
        return `${base}/upload-receipt`;
    }

    function escapeHtmlText(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    function setReceiptStatus(message, type) {
        if (!els.receiptUploadStatus) return;

        els.receiptUploadStatus.className =
            `receipt-upload-status show ${type === 'loading' ? 'status-loading' : type}`;

        if (type === 'loading') {
            els.receiptUploadStatus.innerHTML = `
                <i class="fas fa-spinner spinner-icon"></i>
                <span>${escapeHtmlText(message)}</span>
            `;
        } else if (type === 'success') {
            els.receiptUploadStatus.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${escapeHtmlText(message)}</span>
            `;
        } else if (type === 'error') {
            els.receiptUploadStatus.innerHTML = `
                <i class="fas fa-times-circle"></i>
                <span>${escapeHtmlText(message)}</span>
            `;
        } else {
            els.receiptUploadStatus.innerHTML = `<span>${escapeHtmlText(message)}</span>`;
        }
    }

    function clearReceiptStatus() {
        if (!els.receiptUploadStatus) return;
        els.receiptUploadStatus.innerHTML = '';
        els.receiptUploadStatus.className = 'receipt-upload-status';
    }

    function attachThankYouButtons() {
        const supportBtn = $('contactSupportBtnDynamic') || $('contactSupportBtn');
        if (supportBtn && !supportBtn.dataset.receiptBound) {
            supportBtn.dataset.receiptBound = '1';
            supportBtn.addEventListener('click', function () {
                window.open('https://t.me/m/Qnw6Bzy6MzM1', '_blank');
            });
        }
    }

    function renderPendingThankYou() {
        bindElements();
        if (!els.thankYouPage) return;

        if (originalThankYouHTML) {
            els.thankYouPage.innerHTML = originalThankYouHTML;
            attachThankYouButtons();
        }
    }

    function renderApprovedThankYou(order) {
        bindElements();
        if (!els.thankYouPage) return;

        const customer = escapeHtmlText(order.customerName || getReceiptCustomerName() || 'Người dùng');
        const expiry = escapeHtmlText(order.vipExpiryDate || 'Đang cập nhật');

        els.thankYouPage.innerHTML = `
            <div class="thank-you-icon" style="background: var(--success);">
                <i class="fas fa-crown"></i>
            </div>
            <h2 class="thank-you-title">CHÚC MỪNG</h2>
            <div class="thank-you-message">
                <div class="highlight-box">
                    <span class="highlight-text">
                        <i class="fas fa-check-circle"></i> Chúc mừng ${customer} đã đến với VSA VIP.
                    </span>
                    <p style="margin: 8px 0 6px; font-weight: 500;">
                        Bạn có thể thoả sức sử dụng các tiện ích nâng cao từ bây giờ.
                    </p>
                    <div style="background: rgba(16, 185, 129, 0.15); border-radius: 6px; padding: 8px; margin: 8px 0;">
                        <p style="margin-bottom: 3px; font-weight: 700; color: var(--success); font-size: 12px;">
                            <i class="fas fa-calendar-check"></i> Thời hạn VIP: ${expiry}
                        </p>
                    </div>
                    <p style="margin-top: 10px; font-weight: 600; color: var(--success); font-size: 12px;">
                        <i class="fas fa-heart" style="color: var(--danger);"></i> Cảm ơn bạn đã ủng hộ!
                    </p>
                </div>
            </div>
            <div class="action-buttons">
                <button class="action-btn" onclick="window.location.href='index.html'">
                    <i class="fas fa-home"></i> Trang chủ
                </button>
                <button class="action-btn primary" id="contactSupportBtnDynamic">
                    <i class="fas fa-headset"></i> Hỗ trợ
                </button>
            </div>`;

        attachThankYouButtons();
    }

    function renderRejectedThankYou(order) {
        bindElements();
        if (!els.thankYouPage) return;

        const customer = escapeHtmlText(order.customerName || getReceiptCustomerName() || 'Không xác định');
        const packageName = escapeHtmlText(order.packageName || els.selectedPlanName?.textContent?.trim() || 'Không xác định');
        const amount = escapeHtmlText(order.amount || els.paymentAmount?.textContent?.trim() || 'Không xác định');
        const note = escapeHtmlText(order.paymentNote || els.paymentNote?.textContent?.trim() || 'Không xác định');
        const timestamp = escapeHtmlText(order.timestamp || 'Không xác định');

        els.thankYouPage.innerHTML = `
            <div class="thank-you-icon" style="
                width:54px;
                height:54px;
                font-size:22px;
                background:linear-gradient(135deg,#ef4444,#b91c1c);
                box-shadow:0 8px 20px rgba(239,68,68,0.25);
                margin-bottom:12px;
            ">
                <i class="fas fa-circle-exclamation"></i>
            </div>

            <h2 class="thank-you-title" style="
                color:#ef4444;
                font-size:18px;
                margin-bottom:12px;
                letter-spacing:.3px;
            ">
                THÔNG BÁO QUAN TRỌNG
            </h2>

            <div class="thank-you-message" style="
                background:var(--surface);
                border:1px solid rgba(239,68,68,0.18);
                border-radius:16px;
                padding:14px;
                text-align:left;
                margin-bottom:14px;
            ">
                <div style="
                    display:flex;
                    align-items:center;
                    gap:8px;
                    margin-bottom:10px;
                    color:#ef4444;
                    font-size:13px;
                    font-weight:800;
                ">
                    <i class="fas fa-ban"></i>
                    Đơn hàng chưa được ghi nhận thanh toán
                </div>

                <p style="
                    color:var(--text-secondary);
                    font-size:12px;
                    line-height:1.5;
                    margin:0 0 12px;
                ">
                    Hệ thống chưa tìm thấy giao dịch phù hợp với thông tin bên dưới.
                    Vui lòng kiểm tra lại nội dung chuyển khoản hoặc liên hệ hỗ trợ nếu bạn đã thanh toán.
                </p>

                <div style="
                    background:var(--background);
                    border-radius:12px;
                    padding:10px 12px;
                    border:1px solid var(--border);
                ">
                    <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed var(--border);font-size:12px;">
                        <span style="color:var(--text-secondary);"><i class="fas fa-user"></i> Khách hàng</span>
                        <span style="font-weight:700;color:var(--text-primary);text-align:right;">${customer}</span>
                    </div>

                    <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed var(--border);font-size:12px;">
                        <span style="color:var(--text-secondary);"><i class="fas fa-box"></i> Gói mua</span>
                        <span style="font-weight:700;color:var(--text-primary);text-align:right;">${packageName}</span>
                    </div>

                    <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed var(--border);font-size:12px;">
                        <span style="color:var(--text-secondary);"><i class="fas fa-wallet"></i> Số tiền</span>
                        <span style="font-weight:700;color:var(--text-primary);text-align:right;">${amount}</span>
                    </div>

                    <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed var(--border);font-size:12px;">
                        <span style="color:var(--text-secondary);"><i class="fas fa-receipt"></i> Nội dung CK</span>
                        <span style="font-weight:700;color:var(--text-primary);text-align:right;word-break:break-word;">${note}</span>
                    </div>

                    <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0 0;font-size:12px;">
                        <span style="color:var(--text-secondary);"><i class="fas fa-clock"></i> Thời gian gửi</span>
                        <span style="font-weight:700;color:var(--text-primary);text-align:right;">${timestamp}</span>
                    </div>
                </div>

                <div style="
                    margin-top:12px;
                    padding:10px 12px;
                    border-radius:10px;
                    background:rgba(239,68,68,0.08);
                    border:1px solid rgba(239,68,68,0.14);
                    color:var(--text-secondary);
                    font-size:11.5px;
                    line-height:1.45;
                ">
                    <i class="fas fa-shield-halved" style="color:#ef4444;"></i>
                    Đơn hàng đã bị huỷ do hệ thống chưa ghi nhận thanh toán.
                    Nếu bạn đã chuyển khoản, vui lòng liên hệ hỗ trợ để được kiểm tra nhanh hơn.
                </div>
            </div>

            <div class="action-buttons">
                <button class="action-btn" onclick="window.location.href='index.html'">
                    <i class="fas fa-home"></i> Trang chủ
                </button>
                <button class="action-btn primary" id="contactSupportBtnDynamic">
                    <i class="fas fa-headset"></i> Hỗ trợ
                </button>
            </div>`;

        attachThankYouButtons();
    }

    async function checkOrderStatusOnce() {
        const orderId = latestPaymentOrderId || localStorage.getItem('latestPaymentOrderId');
        if (!orderId) return;

        try {
            const response = await fetch(
                `${getReceiptBaseEndpoint()}/order-status/${encodeURIComponent(orderId)}?t=${Date.now()}`
            );
            const result = await response.json();

            if (!result.success) return;

            if (result.status === 'approved') {
                renderApprovedThankYou(result);
                stopOrderStatusPolling();
            } else if (result.status === 'rejected') {
                renderRejectedThankYou(result);
                stopOrderStatusPolling();
            }
        } catch (error) {
            console.warn('Không thể kiểm tra trạng thái đơn hàng:', error);
        }
    }

    function startOrderStatusPolling() {
        latestPaymentOrderId = latestPaymentOrderId || localStorage.getItem('latestPaymentOrderId') || '';
        if (!latestPaymentOrderId) return;

        stopOrderStatusPolling();
        checkOrderStatusOnce();
        orderStatusTimer = setInterval(checkOrderStatusOnce, 5000);
    }

    function stopOrderStatusPolling() {
        if (orderStatusTimer) {
            clearInterval(orderStatusTimer);
            orderStatusTimer = null;
        }
    }

    function resetReceiptUploadState() {
        bindElements();

        selectedReceiptFile = null;
        receiptUploaded = false;
        latestPaymentOrderId = '';

        if (els.receiptUploadedFlag) els.receiptUploadedFlag.value = '0';
        if (els.receiptFileInput) els.receiptFileInput.value = '';
        if (els.receiptFileName) els.receiptFileName.textContent = 'Chưa chọn ảnh biên lai';

        if (els.receiptPreview) {
            els.receiptPreview.src = '';
            els.receiptPreview.style.display = 'none';
        }

        if (els.uploadReceiptBtn) {
            els.uploadReceiptBtn.disabled = false;
            els.uploadReceiptBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Gửi hoá đơn';
        }

        clearReceiptStatus();
        stopOrderStatusPolling();
        localStorage.removeItem('latestPaymentOrderId');
    }

    function handleReceiptFileChange(event) {
        bindElements();

        const file = event.target.files && event.target.files[0];
        clearReceiptStatus();
        receiptUploaded = false;

        if (els.receiptUploadedFlag) els.receiptUploadedFlag.value = '0';

        if (!file) {
            resetReceiptUploadState();
            return;
        }

        if (!file.type || !file.type.startsWith('image/')) {
            selectedReceiptFile = null;
            if (els.receiptFileInput) els.receiptFileInput.value = '';
            if (els.receiptFileName) els.receiptFileName.textContent = 'File không hợp lệ';
            if (els.receiptPreview) els.receiptPreview.style.display = 'none';
            setReceiptStatus('Vui lòng chọn file hình ảnh hợp lệ', 'error');
            return;
        }

        if (file.size > MAX_RECEIPT_SIZE) {
            selectedReceiptFile = null;
            if (els.receiptFileInput) els.receiptFileInput.value = '';
            if (els.receiptFileName) els.receiptFileName.textContent = 'File vượt quá 10MB';
            if (els.receiptPreview) els.receiptPreview.style.display = 'none';
            setReceiptStatus('Ảnh biên lai tối đa 10MB', 'error');
            return;
        }

        selectedReceiptFile = file;
        if (els.receiptFileName) els.receiptFileName.textContent = `Đã chọn: ${file.name}`;

        const reader = new FileReader();
        reader.onload = function (e) {
            if (els.receiptPreview) {
                els.receiptPreview.src = e.target.result;
                els.receiptPreview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    function getReceiptCustomerName() {
        bindElements();

        const nameFromUser = els.userName?.textContent?.trim();
        const nameFromDisplay = els.userDisplayName?.textContent?.trim();

        return nameFromUser || nameFromDisplay || 'Không xác định';
    }

    function resolvePlanFromPage() {
        const packageName = els.selectedPlanName?.textContent?.trim() || '';
        const text = packageName.toLowerCase();

        for (const [key, info] of Object.entries(PLAN_MAP)) {
            if (text.includes(key) || text.includes(info.name.toLowerCase())) {
                return { planKey: key, ...info };
            }
        }

        return { planKey: '', name: packageName || 'Không xác định', durationDays: '' };
    }

    async function uploadReceiptToAdmin() {
        bindElements();

        if (!selectedReceiptFile) {
            setReceiptStatus('Vui lòng chọn ảnh biên lai', 'error');
            return;
        }

        const planInfo = resolvePlanFromPage();
        const formData = new FormData();

        formData.append('receipt', selectedReceiptFile);
        formData.append('customerName', getReceiptCustomerName());
        formData.append('packageName', els.selectedPlanName?.textContent?.trim() || planInfo.name || 'Không xác định');
        formData.append('amount', els.paymentAmount?.textContent?.trim() || 'Không xác định');
        formData.append('paymentNote', els.paymentNote?.textContent?.trim() || 'Không xác định');
        formData.append('currentUrl', window.location.href);
        formData.append('timestamp', new Date().toLocaleString('vi-VN'));
        formData.append('planKey', planInfo.planKey || '');
        formData.append('durationDays', planInfo.durationDays || '');

        try {
            if (els.uploadReceiptBtn) {
                els.uploadReceiptBtn.disabled = true;
                els.uploadReceiptBtn.innerHTML = '<i class="fas fa-spinner spinner-icon"></i> Đang gửi';
            }

            setReceiptStatus('Đang gửi', 'loading');

            const response = await fetch(getReceiptUploadEndpoint(), {
                method: 'POST',
                body: formData
            });

            let result = null;
            try {
                result = await response.json();
            } catch (_jsonError) {
                const rawText = await response.text().catch(() => '');
                console.error('Receipt upload non-JSON response:', {
                    url: getReceiptUploadEndpoint(),
                    status: response.status,
                    body: rawText ? rawText.slice(0, 500) : ''
                });
                throw new Error(
                    'Server trả về dữ liệu không hợp lệ. Kiểm tra endpoint đang gọi: ' +
                    getReceiptUploadEndpoint()
                );
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Không thể gửi biên lai');
            }

            receiptUploaded = true;
            latestPaymentOrderId = result.orderId || '';

            if (latestPaymentOrderId) {
                localStorage.setItem('latestPaymentOrderId', latestPaymentOrderId);
            }

            if (els.receiptUploadedFlag) els.receiptUploadedFlag.value = '1';

            setReceiptStatus('Đã gửi thông tin chờ xác nhận', 'success');
        } catch (error) {
            receiptUploaded = false;
            if (els.receiptUploadedFlag) els.receiptUploadedFlag.value = '0';
            setReceiptStatus(error.message || 'Lỗi khi gửi biên lai, vui lòng thử lại', 'error');
        } finally {
            if (els.uploadReceiptBtn) {
                els.uploadReceiptBtn.disabled = false;
                els.uploadReceiptBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Gửi hoá đơn';
            }
        }
    }

    function hasSelectedUnuploadedReceipt() {
        return !!selectedReceiptFile && !receiptUploaded;
    }

    function init() {
        bindElements();

        if (els.receiptFileInput && !els.receiptFileInput.dataset.receiptBound) {
            els.receiptFileInput.dataset.receiptBound = '1';
            els.receiptFileInput.addEventListener('change', handleReceiptFileChange);
        }

        if (els.uploadReceiptBtn && !els.uploadReceiptBtn.dataset.receiptBound) {
            els.uploadReceiptBtn.dataset.receiptBound = '1';
            els.uploadReceiptBtn.addEventListener('click', uploadReceiptToAdmin);
        }

        attachThankYouButtons();

        if (localStorage.getItem('latestPaymentOrderId')) {
            latestPaymentOrderId = localStorage.getItem('latestPaymentOrderId') || '';
        }
    }

    window.EdgeReceiptBundle = {
        init,
        uploadReceiptToAdmin,
        handleReceiptFileChange,
        resetReceiptUploadState,
        startOrderStatusPolling,
        stopOrderStatusPolling,
        checkOrderStatusOnce,
        renderPendingThankYou,
        renderApprovedThankYou,
        renderRejectedThankYou,
        hasSelectedUnuploadedReceipt,
        getReceiptUploadEndpoint,
        getReceiptBaseEndpoint
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();