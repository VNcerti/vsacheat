// app.js - Version for WKWebView with Auto Refresh
class AppManager {
    constructor() {
        this.currentCategory = 'all';
        this.currentView = 'home';
        this.allApps = [];
        this.searchTerm = '';
        this.featuredApps = [];

        // AUTO REFRESH SYSTEM
        this.autoRefreshInterval = null;
        this.isRefreshing = false;
        this.refreshCount = 0;

        this.initializeElements();
        this.bindEvents();
        this.init();
    }

    initializeElements() {
        this.appsGrid = document.getElementById('appsGrid');
        this.gamesGrid = document.getElementById('gamesGrid');
        this.gamesSection = document.getElementById('gamesSection');
        this.sectionTitle = document.getElementById('sectionTitle');
        this.categoryCards = document.querySelectorAll('.category-card');
        this.searchModal = document.getElementById('searchModal');
        this.searchModalInput = document.getElementById('searchModalInput');
        this.closeSearch = document.getElementById('closeSearch');
        this.searchResults = document.getElementById('searchResults');
        this.featuredCarousel = document.getElementById('featuredCarousel');
        this.featuredLoading = document.getElementById('featuredLoading');
        this.autoRefreshNotification = document.getElementById('autoRefreshNotification');
    }

    bindEvents() {
        this.searchModalInput?.addEventListener('input', (e) => {
            this.searchApps(e.target.value.trim());
        });

        this.categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.currentCategory = category;

                this.categoryCards.forEach(c => {
                    c.classList.toggle('active', c.dataset.category === category);
                });

                if (this.currentView === 'games') {
                    this.currentView = 'home';
                    document.body.classList.remove('games-view');
                }

                this.renderApps();
            });
        });

        this.searchModal?.addEventListener('click', (e) => {
            if (e.target === this.searchModal) this.closeSearchModal();
        });

        this.closeSearch?.addEventListener('click', () => this.closeSearchModal());

        this.bindFeaturedCarouselEvents();

        window.addEventListener('beforeunload', () => {
            this.stopAutoRefresh();
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('📱 Page visible, resuming auto refresh');
                this.startAutoRefresh();
            } else {
                console.log('📱 Page hidden, pausing auto refresh');
            }
        });
    }

    bindFeaturedCarouselEvents() {
        const prevArrow = document.querySelector('.nav-arrow.prev');
        const nextArrow = document.querySelector('.nav-arrow.next');
        const dots = document.querySelectorAll('.carousel-dot');

        prevArrow?.addEventListener('click', () => this.scrollFeaturedCarousel(-332));
        nextArrow?.addEventListener('click', () => this.scrollFeaturedCarousel(332));

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                this.scrollFeaturedCarouselToIndex(parseInt(dot.dataset.index));
            });
        });
    }

    // ==================== AUTO REFRESH FUNCTIONS ====================

    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        console.log('🔄 Auto refresh started (every 5 seconds)');

        this.performAutoRefresh();

        this.autoRefreshInterval = setInterval(() => {
            this.performAutoRefresh();
        }, 5000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('🛑 Auto refresh stopped');
        }
    }

    async performAutoRefresh() {
        if (this.isRefreshing) {
            console.log('⏳ Auto refresh already in progress, skipping...');
            return;
        }

        this.isRefreshing = true;
        this.refreshCount++;

        try {
            console.log(`🔄 Auto refresh #${this.refreshCount} checking for updates...`);

            const timestamp = Date.now();
            const url = `${CONFIG.GOOGLE_SCRIPT_URL}?action=getApps&t=${timestamp}&nocache=true`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            if (result.success && result.data) {
                const newApps = result.data.map(app => {
                    if (!app.categories) app.categories = 'other';
                    return app;
                });

                const hasChanges = this.checkForChanges(newApps);

                if (hasChanges) {
                    console.log('✅ New data detected! Updating...');

                    this.allApps = newApps;
                    AppUtils.saveToCache(this.allApps);

                    this.renderApps();
                    this.loadFeaturedApps();

                    this.showRefreshNotification('Đã cập nhật dữ liệu mới');
                } else {
                    console.log('📊 No changes detected');
                }
            } else {
                throw new Error('Invalid data from server');
            }

        } catch (error) {
            console.error('❌ Auto refresh error:', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    checkForChanges(newApps) {
        const oldApps = this.allApps;

        if (!oldApps || oldApps.length === 0) {
            return true;
        }

        if (newApps.length !== oldApps.length) {
            console.log(`📊 App count changed: ${oldApps.length} → ${newApps.length}`);
            return true;
        }

        const newSorted = this.sortAppsByNewestDate(newApps);
        const oldSorted = this.sortAppsByNewestDate(oldApps);

        const newFirstKey = `${newSorted[0]?.id || ''}_${newSorted[0]?.updatedate || ''}`;
        const oldFirstKey = `${oldSorted[0]?.id || ''}_${oldSorted[0]?.updatedate || ''}`;

        if (newFirstKey !== oldFirstKey) {
            console.log(`📊 Latest app changed: ${oldFirstKey} → ${newFirstKey}`);
            return true;
        }

        const cacheTimestamp = localStorage.getItem(CONFIG.CACHE_TIMESTAMP_KEY);

        if (cacheTimestamp) {
            const cacheTime = parseInt(cacheTimestamp);
            const now = Date.now();
            const cacheAge = now - cacheTime;

            if (cacheAge > 60000) {
                console.log(`📊 Cache is old: ${Math.round(cacheAge / 1000)} seconds`);
                return true;
            }
        }

        return false;
    }

    showRefreshNotification(message) {
        if (this.autoRefreshNotification) {
            this.autoRefreshNotification.innerHTML = `<i class="fas fa-sync-alt"></i> ${message}`;
            this.autoRefreshNotification.classList.add('show');

            setTimeout(() => {
                this.autoRefreshNotification.classList.remove('show');
            }, 3000);
        }
    }

    // ==================== MAIN FUNCTIONS ====================

    init() {
        this.loadAppsFromSheets();
        this.startAutoRefresh();
    }

    async loadAppsFromSheets() {
        try {
            AppUtils.showSkeletonLoading(this.appsGrid);

            if (AppUtils.isCacheValid()) {
                const cachedApps = AppUtils.getFromCache();

                if (cachedApps?.length > 0) {
                    console.log('✅ Loading from cache...');
                    this.allApps = cachedApps;
                    this.renderApps();
                    this.loadFeaturedApps();
                    this.fetchFreshData();
                    return;
                }
            }

            await this.fetchFreshData();

        } catch (error) {
            console.error('Error loading apps:', error);

            const cachedApps = AppUtils.getFromCache();

            if (cachedApps?.length > 0) {
                this.allApps = cachedApps;
                this.renderApps();
                this.loadFeaturedApps();
            } else {
                if (this.appsGrid) {
                    this.appsGrid.innerHTML = '<div class="loading"><p>Lỗi khi tải ứng dụng. Vui lòng thử lại sau.</p></div>';
                }
            }
        }
    }

    async fetchFreshData() {
        try {
            console.log('🔄 Fetching fresh data from server...');

            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getApps&t=${Date.now()}`);
            const result = await response.json();

            if (result.success) {
                this.allApps = result.data.map(app => {
                    if (!app.categories) app.categories = 'other';
                    return app;
                });

                AppUtils.saveToCache(this.allApps);
                this.renderApps();
                this.loadFeaturedApps();

                console.log('✅ Fresh data loaded, total:', this.allApps.length);
                console.log('🎮 Games:', this.allApps.filter(a => a.categories?.includes('game')).length);
            }

        } catch (error) {
            console.error('Fetch error:', error);
        }
    }

    openSearchModal() {
        this.searchModal.style.display = 'block';
        setTimeout(() => this.searchModalInput?.focus(), 100);
    }

    closeSearchModal() {
        this.searchModal.style.display = 'none';

        if (this.searchModalInput) this.searchModalInput.value = '';
        if (this.searchResults) this.searchResults.innerHTML = '';

        document.body.classList.remove('search-mode');
    }

    // ==================== SORT / DATE FUNCTIONS ====================

    getAppDateTimestamp(app) {
        const rawDate =
            app.updatedate ||
            app.updateDate ||
            app.createdDate ||
            app.date ||
            '';

        if (!rawDate) return 0;

        const value = String(rawDate).trim();

        // Dạng: 26/3/2026 hoặc 26-03-2026
        const vnMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (vnMatch) {
            const day = parseInt(vnMatch[1], 10);
            const month = parseInt(vnMatch[2], 10) - 1;
            const year = parseInt(vnMatch[3], 10);

            return new Date(year, month, day).getTime();
        }

        // Dạng: 2026-03-26 hoặc date chuẩn JS
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    sortAppsByNewestDate(apps) {
        return [...apps].sort((a, b) => {
            const dateB = this.getAppDateTimestamp(b);
            const dateA = this.getAppDateTimestamp(a);

            if (dateB !== dateA) return dateB - dateA;

            const idB = parseInt(b.id) || 0;
            const idA = parseInt(a.id) || 0;

            return idB - idA;
        });
    }

    // Giữ lại hàm cũ để không lỗi nếu code khác còn gọi,
    // nhưng bên trong đã đổi sang sort theo ngày mới nhất.
    sortAppsById(apps) {
        return this.sortAppsByNewestDate(apps);
    }

    // ==================== SEARCH / RENDER FUNCTIONS ====================

    searchApps(searchTerm) {
        if (!this.searchResults) return;

        if (!searchTerm.trim()) {
            this.searchResults.innerHTML = '<div class="no-results"><p>Nhập từ khóa để tìm kiếm</p></div>';
            return;
        }

        let filteredApps = this.allApps.filter(app =>
            app.name &&
            app.name.toLowerCase().startsWith(searchTerm.toLowerCase())
        );

        // FIX CHÍNH: kết quả tìm kiếm sắp xếp theo ngày upload/cập nhật mới nhất
        filteredApps = this.sortAppsByNewestDate(filteredApps);

        if (filteredApps.length === 0) {
            this.searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Không tìm thấy ứng dụng nào bắt đầu bằng "${searchTerm}"</p>
                </div>
            `;
        } else {
            this.displayApps(filteredApps, this.searchResults);
        }
    }

    renderApps() {
        let filteredApps = this.filterApps();

        // App mới nhất lên đầu theo updatedate
        filteredApps = this.sortAppsByNewestDate(filteredApps);

        this.updateSectionTitle();
        this.displayApps(filteredApps, this.appsGrid);

        // Game mới nhất lên đầu theo updatedate
        let games = this.allApps.filter(app => app.categories?.includes('game'));
        games = this.sortAppsByNewestDate(games);

        console.log('🎮 Games rendered, count:', games.length);

        if (games.length > 0) {
            console.log('🎮 Latest game:', games[0]?.updatedate, '| Name:', games[0]?.name);
        }

        this.displayApps(games, this.gamesGrid);
    }

    filterApps() {
        let filteredApps = this.allApps;

        if (this.currentView === 'games') {
            filteredApps = this.allApps.filter(app => app.categories?.includes('game'));
        } else if (this.currentView === 'home' && this.currentCategory !== 'all') {
            filteredApps = this.allApps.filter(app => app.categories?.includes(this.currentCategory));
        }

        if (this.searchTerm) {
            filteredApps = filteredApps.filter(app =>
                app.name.toLowerCase().startsWith(this.searchTerm.toLowerCase())
            );
        }

        return filteredApps;
    }

    updateSectionTitle() {
        let title = 'Ứng dụng mới';

        if (this.searchTerm) {
            title = `Kết quả tìm kiếm: "${this.searchTerm}"`;
        } else if (this.currentView === 'games') {
            title = 'Trò chơi';
        } else if (this.currentCategory !== 'all') {
            const labels = {
                'game': 'Trò chơi',
                'social': 'Mạng xã hội',
                'entertainment': 'Giải trí',
                'photo': 'Ảnh & Video',
                'clone': 'Nhân bản',
                'premium': 'Premium',
                'education': 'Giáo dục',
                'health': 'Sức khỏe',
                'utility': 'Tiện ích'
            };

            title = labels[this.currentCategory] || this.currentCategory;
        }

        if (this.sectionTitle) this.sectionTitle.textContent = title;
    }

    switchToGamesView() {
        console.log('🎮 Switch to games view');

        this.currentView = 'games';
        this.currentCategory = 'all';
        this.searchTerm = '';

        this.categoryCards.forEach(c => {
            c.classList.toggle('active', c.dataset.category === 'all');
        });

        this.renderApps();
    }

    switchToHomeView() {
        console.log('🏠 Switch to home view');

        this.currentView = 'home';
        this.currentCategory = 'all';
        this.searchTerm = '';

        this.categoryCards.forEach(c => {
            c.classList.toggle('active', c.dataset.category === 'all');
        });

        this.renderApps();
    }

    displayApps(apps, container) {
        if (!container) return;

        container.innerHTML = '';

        if (apps.length === 0) {
            let msg = 'Không có ứng dụng nào.';
            if (this.currentView === 'games') msg = 'Chưa có trò chơi nào.';

            AppUtils.showNoResults(container, msg);
            return;
        }

        apps.forEach(app => {
            container.appendChild(this.createAppCard(app));
        });
    }

    createAppCard(app) {
        const card = document.createElement('div');
        card.className = 'app-card';

        let version = (app.version || '1.0.0').replace(/^'/, '');
        const descHTML = this.createDescHTML(app.description);
        const date = AppUtils.formatDate(app.updatedate);

        card.innerHTML = `
            <img src="${app.image}" class="app-logo" loading="lazy"
                 onclick="window.open('app-detail.html?id=${app.id}', '_self')"
                 onerror="this.src='https://via.placeholder.com/70/2563eb/FFFFFF?text=App'">
            <div class="app-content">
                <div class="app-header">
                    <div class="app-info">
                        <div class="app-name" onclick="window.open('app-detail.html?id=${app.id}', '_self')">${this.escapeHtml(app.name)}</div>
                        <div class="app-version-meta">
                            <div class="app-meta-item">
                                <i class="fas fa-code-branch"></i>
                                <span>Version : ${version}</span>
                            </div>
                        </div>
                        <div class="app-meta">
                            <div class="app-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${date}</span>
                            </div>
                        </div>
                    </div>
                    <div class="app-actions">
                        <button class="index-download-btn" onclick="window.open('app-detail.html?id=${app.id}', '_self')">NHẬN</button>
                    </div>
                </div>
                ${descHTML}
            </div>
        `;

        return card;
    }

    createDescHTML(desc) {
        if (!desc) return '<div class="app-description-check"></div>';

        const lines = desc.split('\n').filter(l => l.trim());

        if (!lines.length) return '<div class="app-description-check"></div>';

        let html = '<div class="app-description-check">';

        lines.slice(0, 2).forEach(line => {
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

    // ==================== FEATURED APPS ====================

    loadFeaturedApps() {
        if (!this.allApps.length) return;

        // Clear để tránh bị nhân đôi card khi auto refresh
        if (this.featuredCarousel) {
            this.featuredCarousel.innerHTML = '';
        }

        // Lấy 20 app mới nhất theo ngày updatedate
        const sortedApps = this.sortAppsByNewestDate(this.allApps);
        const newest = sortedApps.slice(0, 20);

        this.featuredApps = this.getRandomApps(newest, 5);

        this.displayFeaturedApps();
        this.initFeaturedCarousel();
    }

    getRandomApps(arr, count) {
        return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
    }

    getBadge(i) {
        const types = ['premium', 'hot', 'new', 'trending', 'vip'];
        const labels = ['PREMIUM', 'HOT', 'NEW', 'TRENDING', 'VIP'];

        return {
            type: types[i % 5],
            label: labels[i % 5]
        };
    }

    createFeaturedCard(app, idx) {
        const card = document.createElement('div');
        card.className = 'featured-card';

        const badge = this.getBadge(idx);
        const desc = app.description?.split('\n')[0] || 'Mô tả ứng dụng...';
        const rating = [4.0, 4.3, 4.5, 4.7, 4.9, 5.0][Math.floor(Math.random() * 6)];

        card.innerHTML = `
            <img src="https://vsacheat.com/img/logo/vsacheat-background.gif" class="featured-background">
            <div class="featured-overlay"></div>
            <div class="featured-badge badge-${badge.type}">${badge.label}</div>
            <div class="featured-content">
                <div class="featured-logo-container">
                    <img src="${app.image}" class="featured-logo" onerror="this.src='https://via.placeholder.com/46/2563eb/FFFFFF?text=App'">
                </div>
                <div class="featured-text-content">
                    <div class="featured-name">${this.escapeHtml(app.name)}</div>
                    <div class="featured-description">${this.escapeHtml(desc.substring(0, 60))}</div>
                    <div class="featured-rating">
                        <i class="fas fa-star"></i>
                        <span>${rating}</span>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.open(`app-detail.html?id=${app.id}`, '_self');
        });

        return card;
    }

    displayFeaturedApps() {
        if (!this.featuredApps.length) return;

        if (this.featuredLoading) {
            this.featuredLoading.style.display = 'none';
        }

        if (this.featuredCarousel) {
            this.featuredApps.forEach((app, i) => {
                this.featuredCarousel.appendChild(this.createFeaturedCard(app, i));
            });
        }
    }

    initFeaturedCarousel() {
        const container = this.featuredCarousel;

        if (!container || !this.featuredApps.length) return;

        const updateArrows = () => {
            const sl = container.scrollLeft;
            const max = container.scrollWidth - container.clientWidth;

            const prev = document.querySelector('.nav-arrow.prev');
            const next = document.querySelector('.nav-arrow.next');

            if (prev) prev.style.display = sl > 0 ? 'flex' : 'none';
            if (next) next.style.display = sl < max - 10 ? 'flex' : 'none';
        };

        const updateDots = () => {
            const idx = Math.round(container.scrollLeft / 332);

            document.querySelectorAll('.carousel-dot').forEach((d, i) => {
                d.classList.toggle('active', i === idx);
            });
        };

        container.addEventListener('scroll', () => {
            updateArrows();
            updateDots();
        });

        updateArrows();

        if (!this.featuredAutoSlideInterval) {
            this.featuredAutoSlideInterval = setInterval(() => {
                const active = document.querySelector('.carousel-dot.active');
                const next = active?.nextElementSibling || document.querySelector('.carousel-dot');

                if (next) next.click();
            }, 5000);
        }
    }

    scrollFeaturedCarousel(amount) {
        this.featuredCarousel?.scrollBy({
            left: amount,
            behavior: 'smooth'
        });
    }

    scrollFeaturedCarouselToIndex(idx) {
        this.featuredCarousel?.scrollTo({
            left: idx * 332,
            behavior: 'smooth'
        });
    }
}

// Khởi tạo ứng dụng khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    window.appManager = new AppManager();
});