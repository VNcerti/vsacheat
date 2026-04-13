// Main application logic
class AppManager {
    constructor() {
        this.currentCategory = 'all';
        this.currentView = 'home';
        this.allApps = [];
        this.searchTerm = '';
        this.featuredApps = [];
        
        // AUTO REFRESH SYSTEM
        this.autoRefreshInterval = null;
        this.lastRefreshTime = null;
        this.autoRotateTimer = null;
        this.cleanupAutoRotate = null;
        
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
        this.navItems = document.querySelectorAll('.nav-pill-item[data-view]');
        this.searchModal = document.getElementById('searchModal');
        this.searchModalInput = document.getElementById('searchModalInput');
        this.closeSearch = document.getElementById('closeSearch');
        this.searchResults = document.getElementById('searchResults');
        this.featuredCarousel = document.getElementById('featuredCarousel');
        this.featuredLoading = document.getElementById('featuredLoading');
    }

    bindEvents() {
        // Search modal events
        this.searchModalInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            this.searchApps(searchTerm);
        });

        // Category events
        this.categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.currentCategory = category;
                
                this.categoryCards.forEach(c => {
                    c.classList.toggle('active', c.dataset.category === category);
                });
                
                // Reset view về home khi chọn category
                this.currentView = 'home';
                this.updateActiveNavItem('home');
                this.renderApps();
            });
        });

        // Modal events
        this.searchModal.addEventListener('click', (e) => {
            if (e.target === this.searchModal) {
                this.closeSearchModal();
            }
        });

        this.closeSearch.addEventListener('click', () => {
            this.closeSearchModal();
        });

        // Featured carousel events
        this.bindFeaturedCarouselEvents();
        
        // Auto refresh khi rời trang
        window.addEventListener('beforeunload', () => {
            this.stopAutoRefresh();
            if (this.cleanupAutoRotate) {
                this.cleanupAutoRotate();
            }
        });
    }

    bindFeaturedCarouselEvents() {
        const prevArrow = document.querySelector('.nav-arrow.prev');
        const nextArrow = document.querySelector('.nav-arrow.next');
        const dots = document.querySelectorAll('.carousel-dot');

        if (prevArrow) {
            prevArrow.addEventListener('click', () => {
                this.scrollFeaturedCarousel(-332);
            });
        }

        if (nextArrow) {
            nextArrow.addEventListener('click', () => {
                this.scrollFeaturedCarousel(332);
            });
        }

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index);
                this.scrollFeaturedCarouselToIndex(index);
            });
        });
    }

    // ==================== AUTO REFRESH FUNCTIONS ====================
    
    startAutoRefresh(userEmail) {
        if (!userEmail) return;
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        this.performAutoRefresh(userEmail);
        
        this.autoRefreshInterval = setInterval(() => {
            this.performAutoRefresh(userEmail);
        }, 5000);
        
        console.log('🔄 Auto refresh started for index page');
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('🛑 Auto refresh stopped for index page');
        }
    }
    
    async performAutoRefresh(userEmail) {
        try {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=autoRefreshUser&email=${encodeURIComponent(userEmail)}`);
            const result = await response.json();
            
            if (result.success && result.autoRefreshed) {
                const userData = result.data;
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                this.lastRefreshTime = new Date().toLocaleTimeString('vi-VN');
                console.log('✅ Index page auto refreshed at:', this.lastRefreshTime);
                
                this.checkAndUpdateVIPAccess(userData);
            }
        } catch (error) {
            console.error('❌ Auto refresh error:', error);
        }
    }
    
    checkAndUpdateVIPAccess(userData) {
        const oldUserStr = localStorage.getItem('currentUser_old') || '{}';
        const oldUser = JSON.parse(oldUserStr);
        
        if (oldUser.packageType !== userData.packageType) {
            console.log('🔍 User package changed from', oldUser.packageType, 'to', userData.packageType);
            
            if (userData.packageType === 'free' && oldUser.packageType !== 'free') {
                this.fetchFreshData();
            }
        }
        
        localStorage.setItem('currentUser_old', JSON.stringify(userData));
    }
    
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }

    init() {
        this.loadAppsFromSheets();
        
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.email) {
            this.startAutoRefresh(currentUser.email);
        }
    }

    async loadAppsFromSheets() {
        try {
            AppUtils.showSkeletonLoading(this.appsGrid);
            
            if (AppUtils.isCacheValid()) {
                const cachedApps = AppUtils.getFromCache();
                if (cachedApps && cachedApps.length > 0) {
                    console.log('✅ Đang tải từ cache...');
                    this.allApps = cachedApps;
                    this.renderApps();
                    this.loadFeaturedApps();
                    this.fetchFreshData();
                    return;
                }
            }
            
            await this.fetchFreshData();
            
        } catch (error) {
            console.error('Lỗi khi tải ứng dụng:', error);
            const cachedApps = AppUtils.getFromCache();
            if (cachedApps && cachedApps.length > 0) {
                this.allApps = cachedApps;
                this.renderApps();
                this.loadFeaturedApps();
            } else {
                this.appsGrid.innerHTML = '<div class="loading"><p>Lỗi khi tải ứng dụng. Vui lòng thử lại sau.</p></div>';
            }
        }
    }

    async fetchFreshData() {
        try {
            console.log('🔄 Đang tải dữ liệu mới từ server...');
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getApps&t=${Date.now()}`);
            const result = await response.json();
            
            if (result.success) {
                this.allApps = result.data.map(app => {
                    if (!app.categories) {
                        app.categories = 'other';
                    }
                    
                    if (app.categories.includes('photo')) {
                        app.categories = app.categories.replace('photo', 'photo');
                    }
                    
                    return app;
                });
                
                AppUtils.saveToCache(this.allApps);
                this.renderApps();
                this.loadFeaturedApps();
                console.log('✅ Dữ liệu mới đã được tải và cache');
                console.log('📊 Cấu trúc dữ liệu app đầu tiên:', this.allApps[0]);
            } else {
                throw new Error('Không thể tải dữ liệu');
            }
        } catch (error) {
            console.error('Lỗi khi fetch dữ liệu mới:', error);
        }
    }

    openSearchModal() {
        this.searchModal.style.display = 'block';
        setTimeout(() => {
            this.searchModalInput.focus();
        }, 100);
    }

    closeSearchModal() {
        this.searchModal.style.display = 'none';
        this.searchModalInput.value = '';
        this.searchResults.innerHTML = '';
    }

    searchApps(searchTerm) {
        if (!searchTerm.trim()) {
            this.searchResults.innerHTML = '<div class="no-results"><p>Nhập từ khóa để tìm kiếm</p></div>';
            return;
        }

        // TÌM KIẾM CHÍNH XÁC TỪ ĐẦU TÊN ỨNG DỤNG
        const filteredApps = this.allApps.filter(app => {
            const appName = app.name.toLowerCase();
            const searchTermLower = searchTerm.toLowerCase();
            
            // Chỉ tìm kiếm ứng dụng có tên BẮT ĐẦU bằng từ khóa tìm kiếm
            return appName.startsWith(searchTermLower);
        });

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
        this.updateSectionTitle();
        this.displayApps(filteredApps, this.appsGrid);
        
        // Chỉ hiển thị games section khi ở home và category all và không có search
        if (this.currentView === 'home' && this.currentCategory === 'all' && !this.searchTerm) {
            this.gamesSection.style.display = 'block';
            const games = this.allApps.filter(app => 
                app.categories && app.categories.includes('game')
            );
            this.displayApps(games, this.gamesGrid);
        } else {
            this.gamesSection.style.display = 'none';
            this.gamesGrid.innerHTML = '';
        }
    }

    filterApps() {
        let filteredApps = this.allApps;
        
        switch(this.currentView) {
            case 'today':
                const today = new Date().toLocaleDateString('vi-VN');
                filteredApps = this.allApps.filter(app => {
                    if (!app.updatedate) return false;
                    const appDate = new Date(app.updatedate).toLocaleDateString('vi-VN');
                    return appDate === today;
                });
                break;
            case 'games':
                filteredApps = this.allApps.filter(app => 
                    app.categories && app.categories.includes('game')
                );
                break;
            case 'home':
            default:
                if (this.currentCategory !== 'all') {
                    filteredApps = this.allApps.filter(app => 
                        app.categories && app.categories.includes(this.currentCategory)
                    );
                }
                break;
        }
        
        // TÌM KIẾM CHÍNH XÁC TỪ ĐẦU TÊN ỨNG DỤNG
        if (this.searchTerm) {
            filteredApps = filteredApps.filter(app => {
                const appName = app.name.toLowerCase();
                const searchTermLower = this.searchTerm.toLowerCase();
                
                // Chỉ tìm kiếm ứng dụng có tên BẮT ĐẦU bằng từ khóa tìm kiếm
                return appName.startsWith(searchTermLower);
            });
        }
        
        filteredApps.sort((a, b) => {
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            return idB - idA;
        });
        
        return filteredApps;
    }

    updateSectionTitle() {
        let title = 'Ứng dụng mới';
        
        if (this.searchTerm) {
            title = `Kết quả tìm kiếm: "${this.searchTerm}"`;
        } else if (this.currentView === 'today') {
            title = 'Ứng dụng hôm nay';
        } else if (this.currentView === 'games') {
            title = 'Trò chơi';
        } else if (this.currentCategory !== 'all') {
            const categoryLabels = {
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
            title = categoryLabels[this.currentCategory] || this.currentCategory;
        }
        
        this.sectionTitle.textContent = title;
    }

    displayApps(apps, container) {
        container.innerHTML = '';
        
        if (apps.length === 0) {
            let message = 'Không có ứng dụng nào.';
            
            if (this.searchTerm) {
                message = `Không tìm thấy ứng dụng nào bắt đầu bằng "${this.searchTerm}"`;
            } else if (this.currentView === 'today') {
                const today = new Date().toLocaleDateString('vi-VN');
                message = `Không có ứng dụng nào được đăng vào ${today}`;
            }
            
            AppUtils.showNoResults(container, message);
            return;
        }
        
        apps.forEach(app => {
            const appCard = this.createAppCard(app);
            container.appendChild(appCard);
        });
    }

    createAppCard(app) {
        const appCard = document.createElement('div');
        appCard.className = 'app-card';
        
        const formattedDate = AppUtils.formatDate(app.updatedate);
        const descriptionHTML = this.createShortDescriptionHTML(app.description);
        
        // Xử lý phiên bản - loại bỏ dấu nháy đơn nếu có
        let version = app.version || '1.0.0';
        if (version && version.startsWith("'")) {
            version = version.substring(1);
        }
        
        // Add click event to entire card
        appCard.addEventListener('click', (e) => {
            // Prevent navigation if the click is on the download button
            if (e.target.closest('.index-download-btn')) {
                return;
            }
            window.location.href = `app-detail.html?id=${app.id}`;
        });
        
        appCard.innerHTML = `
            <img src="${app.image}" alt="${app.name}" class="app-logo" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/70/2563eb/FFFFFF?text=App'">
            <div class="app-content">
                <div class="app-header">
                    <div class="app-info">
                        <div class="app-name">${this.escapeHtml(app.name)}</div>
                        <div class="app-version-meta">
                            <div class="app-meta-item">
                                <i class="fas fa-code-branch"></i>
                                <span>Version : ${version}</span>
                            </div>
                        </div>
                        <div class="app-meta">
                            <div class="app-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${formattedDate}</span>
                            </div>
                        </div>
                    </div>
                    <div class="app-actions">
                        <button class="index-download-btn">
                            NHẬN
                        </button>
                    </div>
                </div>
                ${descriptionHTML}
            </div>
        `;
        
        // Add click event to download button
        const downloadBtn = appCard.querySelector('.index-download-btn');
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `app-detail.html?id=${app.id}`;
        });
        
        return appCard;
    }

    createShortDescriptionHTML(description) {
        if (!description) {
            return '<div class="app-description-check"></div>';
        }
        
        // Split description by new lines and filter out empty lines
        const lines = description.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length === 0) {
            return '<div class="app-description-check"></div>';
        }
        
        // Take first 2 lines
        const displayLines = lines.slice(0, 2);
        
        let html = '<div class="app-description-check">';
        
        displayLines.forEach((line, index) => {
            // Clean up the line - remove any extra spaces
            let cleanLine = line.trim();
            
            html += `
                <div class="description-item">
                    <div class="check-icon-container">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="description-text" title="${this.escapeHtml(cleanLine)}">${this.escapeHtml(cleanLine)}</div>
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== FEATURED APPS LOGIC =====

    loadFeaturedApps() {
        if (this.allApps.length === 0) return;
        
        // Get 20 newest apps (sort by id descending)
        const newestApps = [...this.allApps]
            .sort((a, b) => {
                const idA = parseInt(a.id) || 0;
                const idB = parseInt(b.id) || 0;
                return idB - idA;
            })
            .slice(0, 20);
        
        // Get 5 random apps from the 20 newest
        this.featuredApps = this.getRandomApps(newestApps, 5);
        
        this.displayFeaturedApps();
        this.initFeaturedCarousel();
    }

    getRandomApps(apps, count) {
        const shuffled = [...apps].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    getBadgeType(index) {
        const badgeTypes = ['premium', 'hot', 'new', 'trending', 'vip'];
        const badgeLabels = ['PREMIUM', 'HOT', 'NEW', 'TRENDING', 'VIP'];
        return {
            type: badgeTypes[index % badgeTypes.length],
            label: badgeLabels[index % badgeLabels.length]
        };
    }

    getRandomRating() {
        const ratings = [4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0];
        return ratings[Math.floor(Math.random() * ratings.length)];
    }

    createFeaturedCard(app, index) {
        const card = document.createElement('div');
        card.className = 'featured-card';
        
        const badge = this.getBadgeType(index);
        
        const firstLineDescription = app.description ? 
            app.description.split('\n')[0] || app.description : 
            'Mô tả ứng dụng...';
        
        const rating = this.getRandomRating();
        
        card.innerHTML = `
            <img src="https://i.imgur.com/PwYQMpr.gif" alt="Background" class="featured-background">
            <div class="featured-overlay"></div>
            <div class="featured-badge badge-${badge.type}">
                ${badge.label}
            </div>
            <div class="featured-content">
                <div class="featured-logo-container">
                    <img src="${app.image || 'https://via.placeholder.com/46/2563eb/FFFFFF?text=App'}" 
                         alt="${app.name}" 
                         class="featured-logo"
                         onerror="this.src='https://via.placeholder.com/46/2563eb/FFFFFF?text=App'">
                </div>
                <div class="featured-text-content">
                    <div class="featured-name">${this.escapeHtml(app.name)}</div>
                    <div class="featured-description">${this.escapeHtml(firstLineDescription.substring(0, 60))}</div>
                    <div class="featured-rating">
                        <i class="fas fa-star"></i>
                        <span>${rating}</span>
                    </div>
                </div>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            window.open(`app-detail.html?id=${app.id}`, '_self');
        });
        
        return card;
    }

    displayFeaturedApps() {
        if (this.featuredApps.length === 0) return;
        
        this.featuredLoading.style.display = 'none';
        
        this.featuredApps.forEach((app, index) => {
            const card = this.createFeaturedCard(app, index);
            this.featuredCarousel.appendChild(card);
        });
    }

    initFeaturedCarousel() {
        const container = this.featuredCarousel;
        const dots = document.querySelectorAll('.carousel-dot');
        const prevArrow = document.querySelector('.nav-arrow.prev');
        const nextArrow = document.querySelector('.nav-arrow.next');
        
        if (!container || this.featuredApps.length === 0) return;
        
        let scrollTimeout;
        let isScrolling = false;
        
        // Hàm cập nhật arrows và dots
        const updateUI = () => {
            const scrollLeft = container.scrollLeft;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const cardWidth = 320 + 12;
            const currentIndex = Math.min(Math.round(scrollLeft / cardWidth), dots.length - 1);
            
            // Cập nhật arrows
            if (prevArrow) {
                prevArrow.style.display = scrollLeft > 5 ? 'flex' : 'none';
            }
            if (nextArrow) {
                nextArrow.style.display = scrollLeft < maxScroll - 10 ? 'flex' : 'none';
            }
            
            // Cập nhật dots
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentIndex);
            });
        };
        
        // Scroll với animation mượt
        const smoothScrollTo = (target, duration = 300) => {
            const start = container.scrollLeft;
            const change = target - start;
            const startTime = performance.now();
            
            const animateScroll = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function: easeOutCubic
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                
                container.scrollLeft = start + change * easeProgress;
                
                if (progress < 1) {
                    requestAnimationFrame(animateScroll);
                } else {
                    updateUI();
                    isScrolling = false;
                }
            };
            
            isScrolling = true;
            requestAnimationFrame(animateScroll);
        };
        
        // Scroll đến index
        const scrollToIndex = (index) => {
            if (index < 0 || index >= dots.length || isScrolling) return;
            
            const cardWidth = 320 + 12;
            const target = index * cardWidth;
            
            // Dừng auto-rotate tạm thời
            if (this.autoRotateTimer) {
                clearInterval(this.autoRotateTimer);
                this.autoRotateTimer = null;
            }
            
            smoothScrollTo(target);
            
            // Bật lại auto-rotate sau 5 giây
            setTimeout(() => {
                if (!this.autoRotateTimer) {
                    this.startAutoRotate();
                }
            }, 5000);
        };
        
        // Event listener cho scroll
        container.addEventListener('scroll', () => {
            if (!isScrolling) {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    updateUI();
                }, 50);
            }
        });
        
        // Event listener cho arrows
        if (prevArrow) {
            prevArrow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const currentIndex = Math.round(container.scrollLeft / (320 + 12));
                scrollToIndex(currentIndex - 1);
            });
        }
        
        if (nextArrow) {
            nextArrow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const currentIndex = Math.round(container.scrollLeft / (320 + 12));
                scrollToIndex(currentIndex + 1);
            });
        }
        
        // Event listener cho dots
        dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollToIndex(index);
            });
        });
        
        // Touch events để tạm dừng auto-rotate khi người dùng tương tác
        container.addEventListener('touchstart', () => {
            if (this.autoRotateTimer) {
                clearInterval(this.autoRotateTimer);
                this.autoRotateTimer = null;
            }
        });
        
        container.addEventListener('touchend', () => {
            setTimeout(() => {
                if (!this.autoRotateTimer) {
                    this.startAutoRotate();
                }
            }, 5000);
        });
        
        // Cập nhật UI lần đầu
        setTimeout(updateUI, 100);
        
        // Bắt đầu auto-rotate
        this.startAutoRotate();
    }

    scrollFeaturedCarousel(amount) {
        const container = this.featuredCarousel;
        if (container) {
            container.scrollBy({
                left: amount,
                behavior: 'smooth'
            });
        }
    }

    scrollFeaturedCarouselToIndex(index) {
        const container = this.featuredCarousel;
        if (container) {
            const cardWidth = 320 + 12;
            container.scrollTo({
                left: index * cardWidth,
                behavior: 'smooth'
            });
        }
    }

    startAutoRotate() {
        // Clear timer cũ nếu có
        if (this.autoRotateTimer) {
            clearInterval(this.autoRotateTimer);
            this.autoRotateTimer = null;
        }
        
        const container = this.featuredCarousel;
        const dots = document.querySelectorAll('.carousel-dot');
        
        if (!container || dots.length === 0) return;
        
        let currentIndex = 0;
        let lastInteraction = Date.now();
        
        // Hàm lấy index hiện tại
        const getCurrentIndex = () => {
            const scrollLeft = container.scrollLeft;
            const cardWidth = 320 + 12;
            return Math.round(scrollLeft / cardWidth);
        };
        
        // Auto rotate mỗi 5 giây
        this.autoRotateTimer = setInterval(() => {
            // Kiểm tra thời gian tương tác cuối
            const timeSinceLastInteraction = Date.now() - lastInteraction;
            
            // Nếu người dùng vừa tương tác trong vòng 3 giây, bỏ qua
            if (timeSinceLastInteraction < 3000) {
                return;
            }
            
            // Nếu container đang được scroll, bỏ qua
            if (container.scrolling) {
                return;
            }
            
            currentIndex = getCurrentIndex();
            let nextIndex = (currentIndex + 1) % dots.length;
            
            const cardWidth = 320 + 12;
            const target = nextIndex * cardWidth;
            
            // Scroll mượt
            container.scrollTo({
                left: target,
                behavior: 'smooth'
            });
            
            // Cập nhật dots
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === nextIndex);
            });
        }, 5000);
        
        // Cập nhật lastInteraction khi có tương tác
        const updateLastInteraction = () => {
            lastInteraction = Date.now();
        };
        
        container.addEventListener('scroll', updateLastInteraction);
        container.addEventListener('touchstart', updateLastInteraction);
        container.addEventListener('touchend', updateLastInteraction);
        container.addEventListener('mousedown', updateLastInteraction);
        
        // Cleanup function
        const cleanup = () => {
            if (this.autoRotateTimer) {
                clearInterval(this.autoRotateTimer);
                this.autoRotateTimer = null;
            }
        };
        
        // Lưu cleanup để sử dụng sau
        this.cleanupAutoRotate = cleanup;
    }

    // ===== NAVIGATION METHODS =====
    
    updateActiveNavItem(view) {
        const navItems = document.querySelectorAll('.nav-pill-item');
        navItems.forEach(item => {
            const itemView = item.dataset.view;
            if (itemView === view) {
                item.classList.add('active');
                item.setAttribute('aria-current', 'page');
            } else {
                item.classList.remove('active');
                item.removeAttribute('aria-current');
            }
        });
    }
    
    switchToGamesView() {
        this.currentView = 'games';
        this.currentCategory = 'all';
        this.renderApps();
    }
    
    switchToHomeView() {
        this.currentView = 'home';
        this.renderApps();
    }
}

// Khởi tạo ứng dụng khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    window.appManager = new AppManager();
});
