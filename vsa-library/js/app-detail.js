// app-detail.js - bản gọn đã tích hợp auto đổi link GitHub sang domain riêng

class AppDetailManager {
    constructor() {
        this.GOOGLE_SCRIPT_URL = CONFIG.GOOGLE_SCRIPT_URL;
        this.urlInfo = this.parseUrlId();
        this.appId = this.urlInfo ? this.urlInfo.id : null;
        this.appNameFromUrl = this.urlInfo ? this.urlInfo.name : null;
        this.retryCount = 0;
        this.MAX_RETRIES = 3;
        this.currentAppData = null;
        this.autoRefreshInterval = null;

        this.initializeElements();
        this.bindEvents();
        this.init();
    }

    initializeElements() {
        this.appContent = document.getElementById('appContent');
        this.loginPrompt = document.getElementById('loginPrompt');
        this.shareBtnContainer = document.getElementById('shareBtnContainer');
        this.debugInfo = document.getElementById('debugInfo');
        this.debugContent = document.getElementById('debugContent');
        this.alertOverlay = document.getElementById('customAlertOverlay');
    }

    bindEvents() {
        if (this.alertOverlay) {
            this.alertOverlay.addEventListener('click', (e) => {
                if (e.target === this.alertOverlay) {
                    this.alertOverlay.style.display = 'none';
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.alertOverlay && this.alertOverlay.style.display === 'flex') {
                this.alertOverlay.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            const downloadBtn = e.target.closest('.download-btn, .key-btn');

            if (downloadBtn && !downloadBtn.disabled) {
                const originalHTML = downloadBtn.innerHTML;
                downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
                downloadBtn.disabled = true;

                setTimeout(() => {
                    downloadBtn.innerHTML = originalHTML;
                    downloadBtn.disabled = false;
                }, 1200);
            }
        });

        window.addEventListener('beforeunload', () => {
            this.stopAutoRefresh();
        });
    }

    init() {
        this.applyTheme();
        this.loadAppDetail();

        const currentUser = this.getCurrentUser();

        if (currentUser && currentUser.email) {
            this.startAutoRefresh(currentUser.email);
        }
    }

    parseUrlId() {
        const urlParams = new URLSearchParams(window.location.search);
        const rawId = urlParams.get('id');

        if (!rawId) return null;

        if (/^\d+$/.test(rawId)) {
            return {
                id: rawId,
                name: null,
                fullId: rawId
            };
        }

        const match = rawId.match(/^(\d+)-(.+)$/);

        if (match) {
            return {
                id: match[1],
                name: match[2].replace(/-/g, ' '),
                fullId: rawId
            };
        }

        return {
            id: rawId,
            name: null,
            fullId: rawId
        };
    }

    createSeoUrl(appId, appName) {
        if (!appName) {
            return `app-detail.html?id=${appId}`;
        }

        const seoName = appName
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();

        return `app-detail.html?id=${appId}-${seoName}`;
    }

    updateBrowserUrl(appId, appName) {
        const newUrl = this.createSeoUrl(appId, appName);
        const currentUrl = window.location.href;

        if (!currentUrl.includes(newUrl)) {
            history.replaceState(null, '', newUrl);
        }
    }

    applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        const htmlElement = document.documentElement;

        if (savedTheme === 'dark') {
            htmlElement.setAttribute('data-theme', 'dark');
        } else {
            htmlElement.setAttribute('data-theme', 'light');

            if (!savedTheme) {
                localStorage.setItem('theme', 'light');
            }
        }
    }

    startAutoRefresh(userEmail) {
        if (!userEmail) return;

        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        this.performAutoRefresh(userEmail);

        this.autoRefreshInterval = setInterval(() => {
            this.performAutoRefresh(userEmail);
        }, 5000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    async performAutoRefresh(userEmail) {
        try {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=autoRefreshUser&email=${encodeURIComponent(userEmail)}`);
            const result = await response.json();

            if (result.success && result.autoRefreshed) {
                localStorage.setItem('currentUser', JSON.stringify(result.data));
            }
        } catch (error) {
            console.error('Auto refresh error:', error);
        }
    }

    showCustomAlert(type, title, message, buttons) {
        const alertIcon = document.getElementById('alertIcon');
        const alertTitle = document.getElementById('alertTitle');
        const alertMessage = document.getElementById('alertMessage');
        const alertButtons = document.getElementById('alertButtons');

        const iconMap = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            info: 'fas fa-info-circle'
        };

        alertIcon.className = 'alert-icon ' + type;
        alertIcon.innerHTML = `<i class="${iconMap[type] || iconMap.info}"></i>`;
        alertTitle.textContent = title;
        alertMessage.innerHTML = message;
        alertButtons.innerHTML = '';

        if (buttons && buttons.length > 0) {
            buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = `alert-btn ${button.type || 'primary'}`;
                btn.innerHTML = button.icon ? `<i class="${button.icon}"></i> ${button.text}` : button.text;

                btn.onclick = () => {
                    if (button.onClick) button.onClick();
                    this.alertOverlay.style.display = 'none';
                };

                alertButtons.appendChild(btn);
            });
        } else {
            const okBtn = document.createElement('button');
            okBtn.className = 'alert-btn primary';
            okBtn.innerHTML = '<i class="fas fa-check"></i> OK';
            okBtn.onclick = () => {
                this.alertOverlay.style.display = 'none';
            };
            alertButtons.appendChild(okBtn);
        }

        this.alertOverlay.style.display = 'flex';
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }

    getUserStatus() {
        const userData = this.getCurrentUser();
        return AppUtils.getUserStatus(userData);
    }

    canUserDownloadVIP(appVipPermissions) {
        const userData = this.getCurrentUser();
        return AppUtils.canUserDownloadVIP(userData, appVipPermissions);
    }

    getVipPermissionsReadable(appVipPermissions) {
        return AppUtils.getVipPermissionsReadable(appVipPermissions);
    }

    clearCache() {
        try {
            localStorage.removeItem('xspace_apps_cache');
            localStorage.removeItem('xspace_cache_timestamp');
        } catch (e) {}
    }

    showLoading() {
        this.appContent.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Đang tải thông tin ứng dụng...</p>
            </div>
        `;
    }

    showError(message, showRetry = true) {
        const retryButton = showRetry && this.retryCount < this.MAX_RETRIES
            ? `
                <button class="retry-btn" onclick="appDetail.retryLoadApp()">
                    <i class="fas fa-redo"></i>
                    Thử lại
                </button>
            `
            : '';

        this.appContent.innerHTML = `
            <div class="error-message">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Đã xảy ra lỗi</h3>
                <p>${message}</p>
                ${retryButton}
                <button class="download-btn" onclick="window.location.href='index.html'" style="margin-top: 16px; max-width: 200px;">
                    <i class="fas fa-home"></i>
                    Quay về trang chủ
                </button>
            </div>
        `;
    }

    retryLoadApp() {
        this.retryCount++;
        this.loadAppDetail();
    }

    forceReload() {
        this.clearCache();
        this.retryCount = 0;
        this.loadAppDetail();
    }

    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;

        const trimmed = url.trim();

        if (
            trimmed === '' ||
            trimmed === 'null' ||
            trimmed === 'undefined' ||
            trimmed === '#' ||
            trimmed.toLowerCase() === 'null' ||
            trimmed.toLowerCase() === 'undefined' ||
            trimmed === 'N/A' ||
            trimmed === 'n/a'
        ) {
            return false;
        }

        return (
            trimmed.startsWith('http://') ||
            trimmed.startsWith('https://') ||
            trimmed.startsWith('//')
        );
    }

    isValidImageUrl(url) {
        return this.isValidUrl(url);
    }

    hasValidFreeDownload(downloadlink) {
        return this.isValidUrl(downloadlink);
    }

    hasValidKeyLink(keylink) {
        return this.isValidUrl(keylink);
    }

    convertDownloadLink(link) {
        if (!link || typeof link !== 'string') {
            return link;
        }

        const trimmedLink = link.trim();
        const githubBase = 'https://github.com/VNcerti/modos/releases/download/1.0/';
        const customBase = 'https://vsacheat.com/download/';

        if (trimmedLink.includes(githubBase)) {
            try {
                const fileName = decodeURIComponent(trimmedLink.split('/').pop());
                return customBase + encodeURIComponent(fileName);
            } catch (error) {
                console.error('Lỗi convert GitHub link:', error);
                return trimmedLink;
            }
        }

        return trimmedLink;
    }

    processAppData(app) {
        app.viplink1 = app.viplink1 || '';
        app.downloadlink = app.downloadlink || '';
        app.keylink = app.keylink || '';
        app.categories = app.categories || 'other';
        app.vipPermissions = app.vipPermissions || 'all';

        const possibleKeys = {
            screenshot1: ['screenshot1', 'Screenshot1', 'screenshot_1', 'image1', 'Image1'],
            screenshot2: ['screenshot2', 'Screenshot2', 'screenshot_2', 'image2', 'Image2'],
            screenshot3: ['screenshot3', 'Screenshot3', 'screenshot_3', 'image3', 'Image3']
        };

        Object.keys(possibleKeys).forEach(targetKey => {
            let found = '';

            for (const key of possibleKeys[targetKey]) {
                if (app[key] && typeof app[key] === 'string' && app[key].trim() !== '') {
                    found = app[key].trim();
                    break;
                }
            }

            app[targetKey] = found;
        });

        return app;
    }

    createDescriptionHTML(description) {
        if (AppUtils && AppUtils.createFullDescriptionHTML) {
            return AppUtils.createFullDescriptionHTML(description);
        }

        if (!description) {
            return '<div class="app-description-check"></div>';
        }

        const lines = description.split('\n').filter(line => line.trim().length > 0);
        let html = '<div class="app-description-check">';

        lines.forEach(line => {
            html += `
                <div class="description-item">
                    <div class="check-icon-container"></div>
                    <div class="description-text">${this.escapeHtml(line.trim())}</div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    createScreenshotsHTML(app) {
        const screenshots = [app.screenshot1, app.screenshot2, app.screenshot3]
            .filter(url => this.isValidUrl(url));

        if (screenshots.length === 0) {
            return `
                <div class="no-screenshots-message">
                    <div class="no-screenshots-icon">
                        <i class="fas fa-images"></i>
                    </div>
                    <div class="no-screenshots-text">
                        <p>Ứng dụng này chưa có ảnh minh hoạ</p>
                        <p style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
                            Ảnh minh hoạ sẽ được cập nhật trong thời gian sớm nhất
                        </p>
                    </div>
                </div>
            `;
        }

        let html = `
            <div class="screenshots-container">
                <div class="screenshots-wrapper" id="screenshotsWrapper">
        `;

        screenshots.forEach((src, index) => {
            html += `
                <div class="screenshot-item">
                    <img src="${src}" 
                         alt="Ảnh minh hoạ ${index + 1} - ${app.name}" 
                         class="screenshot" 
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/220x400/2563eb/FFFFFF?text=Ảnh+${index + 1}';">
                </div>
            `;
        });

        html += `
                </div>
                ${screenshots.length > 1 ? `
                    <div class="screenshot-nav prev" onclick="appDetail.scrollScreenshots(-220)">
                        <i class="fas fa-chevron-left"></i>
                    </div>
                    <div class="screenshot-nav next" onclick="appDetail.scrollScreenshots(220)">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="screenshot-counter">
                        <span id="currentScreenshot">1</span> / ${screenshots.length}
                    </div>
                ` : ''}
            </div>
        `;

        return html;
    }

    scrollScreenshots(amount) {
        const wrapper = document.getElementById('screenshotsWrapper');

        if (wrapper) {
            wrapper.scrollBy({ left: amount, behavior: 'smooth' });
        }
    }

    initScreenshotScroll() {
        const wrapper = document.getElementById('screenshotsWrapper');
        const prevBtn = document.querySelector('.screenshot-nav.prev');
        const nextBtn = document.querySelector('.screenshot-nav.next');
        const counter = document.querySelector('#currentScreenshot');

        if (!wrapper) return;

        const totalItems = wrapper.querySelectorAll('.screenshot-item').length;

        if (totalItems > 1) {
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';
        }

        wrapper.addEventListener('scroll', function () {
            const scrollLeft = wrapper.scrollLeft;
            const itemWidth = 220;
            const currentIndex = Math.round(scrollLeft / itemWidth) + 1;

            if (counter) {
                counter.textContent = Math.min(currentIndex, totalItems);
            }

            if (prevBtn) {
                prevBtn.style.display = scrollLeft > 0 ? 'flex' : 'none';
            }

            if (nextBtn) {
                nextBtn.style.display = scrollLeft < (wrapper.scrollWidth - wrapper.clientWidth - 10) ? 'flex' : 'none';
            }
        });

        wrapper.dispatchEvent(new Event('scroll'));
    }

    displayAppDetail(app) {
        this.currentAppData = app;

        this.updateBrowserUrl(app.id, app.name);

        if (this.shareBtnContainer) {
            this.shareBtnContainer.style.display = 'flex';
        }

        const categoryLabels = {
            game: 'Trò chơi',
            social: 'Mạng xã hội',
            entertainment: 'Giải trí',
            photo: 'Ảnh & Video',
            clone: 'Nhân bản',
            premium: 'Mở khoá Premium',
            education: 'Giáo dục',
            health: 'Sức khỏe',
            utility: 'Tiện ích'
        };

        let categories = [];

        if (typeof app.categories === 'string') {
            categories = app.categories.split(',');
        } else if (Array.isArray(app.categories)) {
            categories = app.categories;
        }

        const tagsHTML = categories
            .map(cat => `<span class="app-tag">${categoryLabels[cat] || cat}</span>`)
            .join('');

        let formattedDate = 'Chưa cập nhật';

        if (app.updatedate) {
            try {
                const date = new Date(app.updatedate);

                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString('vi-VN');
                }
            } catch (e) {
                formattedDate = app.updatedate;
            }
        }

        document.title = `${app.name} - XSpace Store`;

        const user = this.getCurrentUser();
        const userStatus = this.getUserStatus();

        if (this.loginPrompt) {
            this.loginPrompt.style.display = user ? 'none' : 'block';
        }

        const hasFreeDownload = this.hasValidFreeDownload(app.downloadlink);
        const hasVipDownload = this.isValidUrl(app.viplink1);
        const hasKeyLink = this.hasValidKeyLink(app.keylink);
        const isVipOnly = hasVipDownload && !hasFreeDownload;

        let iconHTML = `
            <div class="app-icon-container">
                <img src="${app.image || 'https://via.placeholder.com/135/2563eb/FFFFFF?text=App'}" 
                     alt="${app.name}" 
                     class="app-icon-large"
                     onerror="this.src='https://via.placeholder.com/135/2563eb/FFFFFF?text=App'">
                ${isVipOnly ? `
                    <div class="app-badge-overlay">
                        <div class="vip-badge"></div>
                    </div>
                ` : ''}
            </div>
        `;

        let downloadButtons = [];

        if (hasFreeDownload) {
            downloadButtons.push(this.createDownloadButton(app, false, user, userStatus));
        }

        if (hasVipDownload) {
            downloadButtons.push(this.createDownloadButton(app, true, user, userStatus));
        }

        const downloadOptionsClass =
            downloadButtons.length === 2 ? 'download-options two-buttons' :
            downloadButtons.length === 1 ? 'download-options one-button' :
            'download-options';

        const keySectionHTML = hasKeyLink ? this.createKeySection(app, user, userStatus) : '';
        const vipCrownIcon = isVipOnly ? '<i class="fas fa-crown vip-crown-icon"></i>' : '';

        const html = `
            <div class="app-header">
                ${iconHTML}
                <div class="app-info">
                    <h1 class="app-title">
                        ${app.name}
                        ${vipCrownIcon}
                    </h1>
                    <div class="app-developer">${app.developer || 'Nhà phát triển'}</div>
                    <div class="app-meta">
                        <div class="meta-item">
                            <span class="meta-label">Phiên bản</span>
                            <span class="meta-value">${app.version || '1.0.0'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Cập nhật</span>
                            <span class="meta-value">${formattedDate}</span>
                        </div>
                    </div>
                    <div class="app-tags">${tagsHTML}</div>
                </div>
            </div>

            ${downloadButtons.length > 0 ? `
                <div class="download-section">
                    <h2 class="download-title">
                        <i class="fas fa-download"></i>
                        Tải ứng dụng
                    </h2>
                    <div class="${downloadOptionsClass}">
                        ${downloadButtons.join('')}
                    </div>
                    <div class="download-info">
                        <i class="fas fa-info-circle"></i>
                        ${app.viplink1 ? 'Premium: No Ads – Full Features – Unlimited Access' : 'Bản VIP đang được cập nhật'}
                    </div>
                </div>
            ` : ''}

            ${keySectionHTML}

            <div class="description-section">
                <h2 class="section-title">Mô tả ứng dụng</h2>
                ${this.createDescriptionHTML(app.description)}
            </div>

            <div class="screenshots-section">
                <h2 class="section-title">Hình ảnh ứng dụng</h2>
                ${this.createScreenshotsHTML(app)}
            </div>

            <div class="support-section" style="text-align: center; margin-top: 30px; padding: 16px; background: var(--surface); border-radius: 12px; border: 1px solid var(--border);">
                <h3 style="margin-bottom: 10px; color: var(--text-primary); font-size: 15px;">Cần hỗ trợ?</h3>
                <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 12px;">Liên hệ với chúng tôi nếu bạn gặp vấn đề khi tải hoặc sử dụng ứng dụng</p>
                <button class="download-btn download-btn-secondary" onclick="appDetail.contactSupport()" style="max-width: 180px; font-size: 12px; padding: 8px 16px;">
                    <i class="fas fa-headset"></i>
                    Liên hệ hỗ trợ
                </button>
            </div>
        `;

        this.appContent.innerHTML = html;

        setTimeout(() => this.initScreenshotScroll(), 100);
    }

    createKeySection(app, user, userStatus) {
        const originalLink = app.keylink;
        const link = this.convertDownloadLink(originalLink);

        if (!originalLink || !this.hasValidKeyLink(originalLink)) {
            return '';
        }

        if (!user) {
            return `
                <div class="key-section">
                    <h2 class="key-title">
                        <i class="fas fa-key"></i>
                        Mã đăng nhập
                    </h2>
                    <button class="key-btn" onclick="appDetail.requireLoginForKey()">
                        <i class="fas fa-key"></i>
                        Key đăng nhập
                    </button>
                    <div class="key-info">
                        <i class="fas fa-info-circle"></i>
                        Đăng nhập để lấy mã miễn phí
                    </div>
                </div>
            `;
        }

        return `
            <div class="key-section">
                <h2 class="key-title">
                    <i class="fas fa-key"></i>
                    Mã đăng nhập
                </h2>
                <button class="key-btn" onclick="appDetail.getKey('${link}', '${app.name}')">
                    <i class="fas fa-key"></i>
                    Key đăng nhập
                </button>
                <div class="key-info">
                    <i class="fas fa-info-circle"></i>
                    Nhấn để lấy mã - Hoàn toàn miễn phí
                </div>
            </div>
        `;
    }

    createDownloadButton(app, isVIP, user, userStatus) {
        const originalLink = isVIP ? app.viplink1 : app.downloadlink;
        const link = this.convertDownloadLink(originalLink);
        const isValidLink = originalLink && this.isValidUrl(originalLink);

        if (isVIP) {
            if (!isValidLink) {
                return `
                    <button class="download-btn download-btn-premium" disabled style="background: var(--text-muted);">
                        <i class="fas fa-crown"></i>
                        Tải VIP #1 (Đang cập nhật)
                    </button>
                `;
            }

            if (!user) {
                return `
                    <button class="download-btn download-btn-premium" onclick="appDetail.requireLogin(true)">
                        <i class="fas fa-crown"></i>
                        Tải VIP #1
                    </button>
                `;
            }

            const canDownload = this.canUserDownloadVIP(app.vipPermissions);

            if (!canDownload) {
                const requiredPackages = this.getVipPermissionsReadable(app.vipPermissions);

                return `
                    <button class="download-btn download-btn-premium" onclick="appDetail.showUpgradeRequiredAlert('${requiredPackages.join(', ')}')">
                        <i class="fas fa-crown"></i>
                        Tải VIP #1
                    </button>
                `;
            }

            return `
                <button class="download-btn download-btn-premium" onclick="appDetail.downloadApp('${link}', '${app.name}', true)">
                    <i class="fas fa-crown"></i>
                    Tải VIP #1
                </button>
            `;
        }

        if (!isValidLink) {
            return '';
        }

        if (!user) {
            return `
                <button class="download-btn" onclick="appDetail.requireLogin(false)">
                    <i class="fas fa-download"></i>
                    Tải miễn phí
                </button>
            `;
        }

        return `
            <button class="download-btn" onclick="appDetail.downloadApp('${link}', '${app.name}', false)">
                <i class="fas fa-download"></i>
                Tải miễn phí
            </button>
        `;
    }

    async loadAppDetail() {
        if (!this.appId) {
            this.showError('Không tìm thấy ID ứng dụng', false);
            return;
        }

        this.clearCache();
        this.showLoading();

        try {
            const timestamp = Date.now();
            const url = `${this.GOOGLE_SCRIPT_URL}?action=getApps&t=${timestamp}&nocache=true`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                const app = result.data.find(a => {
                    return (
                        a.id == this.appId ||
                        a.id === this.appId ||
                        a.id.toString() === this.appId.toString()
                    );
                });

                if (app) {
                    const processedApp = this.processAppData(app);
                    this.displayAppDetail(processedApp);
                    this.retryCount = 0;
                } else {
                    this.showError(`Không tìm thấy ứng dụng với ID: ${this.appId}`, true);
                }
            } else {
                throw new Error(result.message || 'Dữ liệu không hợp lệ từ server');
            }
        } catch (error) {
            if (this.retryCount < this.MAX_RETRIES) {
                this.showError(`Lỗi tải dữ liệu: ${error.message}. Thử lại?`, true);
            } else {
                this.showError(`Không thể tải thông tin ứng dụng sau ${this.MAX_RETRIES} lần thử. Vui lòng thử lại sau.`, false);
            }
        }
    }

    shareApp() {
        if (!this.currentAppData) return;
    
        const appName = this.currentAppData.name || 'ứng dụng';
        const appStoreUrl = 'https://vsacheat.com/appstore/';
    
        const shareText = `Xem ứng dụng ${appName} ngay tại thư viện VSA - Xem ngay tại : ${appStoreUrl}`;
    
        if (navigator.share) {
            navigator.share({
                title: appName,
                text: shareText,
                url: appStoreUrl
            })
            .then(() => console.log('✅ Chia sẻ thành công'))
            .catch((error) => {
                console.log('❌ Lỗi chia sẻ:', error);
                this.copyToClipboard(shareText);
            });
        } else {
            this.copyToClipboard(shareText);
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                this.showCustomAlert(
                    'success',
                    'Đã sao chép!',
                    'Đường dẫn đã được sao chép vào clipboard. Bạn có thể chia sẻ với bạn bè.',
                    [{ text: 'OK', type: 'primary', icon: 'fas fa-check' }]
                );
            })
            .catch(() => {
                this.showCustomAlert(
                    'error',
                    'Lỗi',
                    'Không thể sao chép đường dẫn. Vui lòng thử lại.',
                    [{ text: 'OK', type: 'primary', icon: 'fas fa-check' }]
                );
            });
    }

    downloadApp(url, appName, isVIP = false) {
        url = this.convertDownloadLink(url);

        if (!url || url === '#' || url === '' || url === 'null' || url === 'undefined') {
            this.showCustomAlert(
                'warning',
                'Thông báo',
                '⚠️ Link tải đang được cập nhật. Vui lòng thử lại sau.',
                [{ text: 'OK', type: 'primary', icon: 'fas fa-check' }]
            );
            return;
        }

        const type = isVIP ? 'VIP' : 'miễn phí';

        this.showCustomAlert(
            'info',
            'Xác nhận tải',
            `Bạn muốn tải xuống ứng dụng <strong>${appName}</strong> (${type})?<br><br>Chọn "Tải xuống" để tiếp tục.`,
            [
                {
                    text: 'Hủy',
                    type: 'secondary',
                    icon: 'fas fa-times',
                    onClick: () => {}
                },
                {
                    text: 'Tải xuống',
                    type: 'primary',
                    icon: 'fas fa-download',
                    onClick: () => {
                        window.open(url, '_blank');

                        setTimeout(() => {
                            this.showCustomAlert(
                                'success',
                                'Thành công!',
                                `✅ Đã bắt đầu tải xuống ${type}!`,
                                [{ text: 'OK', type: 'primary', icon: 'fas fa-check' }]
                            );
                        }, 500);
                    }
                }
            ]
        );
    }

    getKey(url, appName) {
        url = this.convertDownloadLink(url);

        if (!url || url === '#' || url === '' || url === 'null' || url === 'undefined') {
            this.showCustomAlert(
                'warning',
                'Thông báo',
                '⚠️ Link lấy mã đang được cập nhật. Vui lòng thử lại sau.',
                [{ text: 'OK', type: 'primary', icon: 'fas fa-check' }]
            );
            return;
        }

        this.showCustomAlert(
            'info',
            'Xác nhận lấy mã',
            `Bạn muốn lấy mã đăng nhập cho ứng dụng <strong>${appName}</strong>?<br><br>Chọn "Lấy mã" để tiếp tục.`,
            [
                {
                    text: 'Hủy',
                    type: 'secondary',
                    icon: 'fas fa-times',
                    onClick: () => {}
                },
                {
                    text: 'Lấy mã',
                    type: 'primary',
                    icon: 'fas fa-key',
                    onClick: () => {
                        window.open(url, '_blank');

                        setTimeout(() => {
                            this.showCustomAlert(
                                'success',
                                'Thành công!',
                                '✅ Bạn sẽ được chuyển đến trang lấy mã đăng nhập!',
                                [{ text: 'OK', type: 'primary', icon: 'fas fa-check' }]
                            );
                        }, 500);
                    }
                }
            ]
        );
    }

    requireLogin(isVIP = false) {
        const type = isVIP ? 'VIP' : 'miễn phí';

        this.showCustomAlert(
            'warning',
            'Yêu cầu đăng nhập',
            `Bạn cần đăng nhập để tải ứng dụng ${type}.<br><br>Chuyển đến trang đăng nhập?`,
            [
                {
                    text: 'Hủy',
                    type: 'secondary',
                    icon: 'fas fa-times',
                    onClick: () => {}
                },
                {
                    text: 'Đăng nhập',
                    type: 'primary',
                    icon: 'fas fa-sign-in-alt',
                    onClick: () => {
                        window.location.href = 'profile.html';
                    }
                }
            ]
        );
    }

    requireLoginForKey() {
        this.showCustomAlert(
            'warning',
            'Yêu cầu đăng nhập',
            'Bạn cần đăng nhập để lấy mã đăng nhập miễn phí.<br><br>Chuyển đến trang đăng nhập?',
            [
                {
                    text: 'Hủy',
                    type: 'secondary',
                    icon: 'fas fa-times',
                    onClick: () => {}
                },
                {
                    text: 'Đăng nhập',
                    type: 'primary',
                    icon: 'fas fa-sign-in-alt',
                    onClick: () => {
                        window.location.href = 'profile.html';
                    }
                }
            ]
        );
    }

    requirePremium() {
        this.showCustomAlert(
            'warning',
            'Yêu cầu nâng cấp',
            'Tài khoản của bạn chưa được cấp phép VIP hoặc đã hết hạn.<br><br>Nâng cấp tài khoản Premium ngay?',
            [
                {
                    text: 'Hủy',
                    type: 'secondary',
                    icon: 'fas fa-times',
                    onClick: () => {}
                },
                {
                    text: 'Nâng cấp',
                    type: 'warning',
                    icon: 'fas fa-crown',
                    onClick: () => {
                        window.location.href = 'payment.html';
                    }
                }
            ]
        );
    }

    showUpgradeRequiredAlert(requiredPackages) {
        this.showCustomAlert(
            'warning',
            'Không đủ điều kiện',
            `Tài khoản của bạn hiện không đủ điều kiện tải ứng dụng này (VIP đã hết hạn hoặc không đúng gói).<br><br>
            <strong>Yêu cầu gói:</strong> ${requiredPackages}<br><br>
            Vui lòng nâng cấp gói cao hơn để tiếp tục.`,
            [
                {
                    text: 'Hủy',
                    type: 'secondary',
                    icon: 'fas fa-times',
                    onClick: () => {}
                },
                {
                    text: 'Nâng cấp ngay',
                    type: 'warning',
                    icon: 'fas fa-crown',
                    onClick: () => {
                        window.location.href = 'payment.html';
                    }
                }
            ]
        );
    }

    contactSupport() {
        window.open('https://t.me/m/inBUSKQ1N2E1', '_blank');
    }

    toggleDebug() {
        if (!this.debugInfo) return;

        const toggle = document.querySelector('.debug-toggle');

        if (this.debugInfo.style.display === 'none' || this.debugInfo.style.display === '') {
            this.debugInfo.style.display = 'block';

            if (toggle) {
                toggle.innerHTML = '<i class="fas fa-bug"></i> Ẩn thông tin debug';
            }

            this.updateDebugInfo();
        } else {
            this.debugInfo.style.display = 'none';

            if (toggle) {
                toggle.innerHTML = '<i class="fas fa-bug"></i> Hiển thị thông tin debug';
            }
        }
    }

    updateDebugInfo() {
        if (!this.debugContent || !this.currentAppData) return;

        const userStatus = this.getUserStatus();

        this.debugContent.innerHTML = `
            <h4>Thông tin debug:</h4>
            <p><strong>App ID:</strong> ${this.appId}</p>
            <p><strong>Tên từ URL:</strong> ${this.appNameFromUrl || 'Không có'}</p>
            <p><strong>Retry count:</strong> ${this.retryCount}/${this.MAX_RETRIES}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>VIP Permissions:</strong> ${this.currentAppData.vipPermissions || 'all'}</p>
            <p><strong>Key Link:</strong> ${this.currentAppData.keylink ? 'Có' : 'Không'}</p>
            <p><strong>User Status:</strong> ${userStatus.status} (${userStatus.displayPackage})</p>
            <p><strong>Is Premium:</strong> ${userStatus.isPremium ? 'Có' : 'Không'}</p>
            <p><strong>Current URL:</strong> ${window.location.href}</p>
            <button class="retry-btn" onclick="appDetail.forceReload()" style="margin-top: 10px;">
                <i class="fas fa-sync-alt"></i>
                Tải lại dữ liệu
            </button>
        `;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    window.appDetail = new AppDetailManager();
});

window.addEventListener('load', function () {
    if (window.appDetail) {
        window.appDetail.clearCache();
    }
});