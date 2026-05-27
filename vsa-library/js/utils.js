// Utility functions
class AppUtils {
    // Kiểm tra cache có hợp lệ không
    static isCacheValid() {
        const timestamp = localStorage.getItem(CONFIG.CACHE_TIMESTAMP_KEY);
        if (!timestamp) return false;
        
        const now = Date.now();
        const cacheTime = parseInt(timestamp);
        return (now - cacheTime) < CONFIG.CACHE_DURATION;
    }

    // Lấy dữ liệu từ cache
    static getFromCache() {
        try {
            const cached = localStorage.getItem(CONFIG.CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            console.error('Lỗi khi đọc cache:', e);
            return null;
        }
    }

    // Lưu dữ liệu vào cache
    static saveToCache(data) {
        try {
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {
            console.error('Lỗi khi lưu cache:', e);
        }
    }

    // Hiển thị skeleton loading
    static showSkeletonLoading(container, count = 6) {
        let skeletonHTML = '';
        for (let i = 0; i < count; i++) {
            skeletonHTML += `
                <div class="app-card skeleton-app-card">
                    <div class="skeleton skeleton-logo"></div>
                    <div class="app-content skeleton-content">
                        <div class="app-header">
                            <div class="app-info">
                                <div class="skeleton skeleton-title"></div>
                                <div class="app-tags skeleton-tags">
                                    <div class="skeleton skeleton-tag"></div>
                                    <div class="skeleton skeleton-tag"></div>
                                </div>
                                <div class="app-meta">
                                    <div class="skeleton skeleton-meta"></div>
                                </div>
                            </div>
                            <div class="app-actions">
                                <div class="skeleton download-btn" style="width: 70px; height: 28px; border-radius: 8px;"></div>
                            </div>
                        </div>
                        <div class="skeleton skeleton-description"></div>
                        <div class="skeleton skeleton-description short"></div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = skeletonHTML;
    }

    // Hiển thị loading
    static showLoading(container) {
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Đang tải ứng dụng...</p>
            </div>
        `;
    }

    // Hiển thị không có kết quả
    static showNoResults(container, message = 'Không tìm thấy ứng dụng nào.') {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>${message}</p>
            </div>
        `;
    }

    // Format date to DD/MM/YYYY
    static formatDate(dateString) {
        if (!dateString) return 'Chưa cập nhật';
        
        try {
            if (dateString.includes('T')) {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('vi-VN');
                }
            }
            if (dateString.includes('/')) {
                return dateString;
            }
            return dateString;
        } catch (e) {
            return dateString;
        }
    }

    // Parse date từ string
    static parseDate(dateString) {
        if (!dateString || dateString === '') return null;
        
        try {
            // Thử parse ISO format (YYYY-MM-DDTHH:MM:SS)
            if (dateString.includes('T')) {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            // Thử parse dd/mm/yyyy format
            if (dateString.includes('/')) {
                const parts = dateString.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    const fullYear = year < 100 ? year + 2000 : year;
                    const date = new Date(fullYear, month, day);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }
            
            // Thử parse các định dạng khác
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date;
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing date:', dateString, error);
            return null;
        }
    }

    // Tạo HTML cho tags
    static createTagsHTML(categories) {
        let categoriesArray = [];
        if (typeof categories === 'string') {
            categoriesArray = categories.split(',');
        } else if (Array.isArray(categories)) {
            categoriesArray = categories;
        }
        
        return categoriesArray.map(cat => 
            `<span class="app-tag">${CONFIG.CATEGORY_LABELS[cat] || cat}</span>`
        ).join('');
    }

    // Tạo mô tả ngắn chỉ hiển thị 2 dòng đầu
    static createShortDescriptionHTML(description) {
        if (!description) {
            return '<div class="app-description-check">Mô tả ứng dụng...</div>';
        }

        const descriptionLines = description.split('\n').filter(line => line.trim());
        const shortDescriptionLines = descriptionLines.slice(0, 2);
        
        let descriptionHTML = '<div class="app-description-check">';
        shortDescriptionLines.forEach(line => {
            if (line.trim()) {
                descriptionHTML += `
                    <div class="description-item">
                        <div class="check-icon-container">
                            <i class="fas fa-check"></i>
                        </div>
                        <span class="description-text">${line.trim()}</span>
                    </div>
                `;
            }
        });
        
        descriptionHTML += '</div>';
        return descriptionHTML;
    }

    // Tạo mô tả đầy đủ (cho trang chi tiết)
    static createFullDescriptionHTML(description) {
        if (!description) {
            return '<div class="app-description-check">Ứng dụng chưa có mô tả chi tiết.</div>';
        }

        const descriptionLines = description.split('\n').filter(line => line.trim());
        
        let descriptionHTML = '<div class="app-description-check">';
        descriptionLines.forEach(line => {
            if (line.trim()) {
                descriptionHTML += `
                    <div class="description-item">
                        <div class="check-icon-container">
                            <i class="fas fa-check"></i>
                        </div>
                        <span class="description-text">${line.trim()}</span>
                    </div>
                `;
            }
        });
        descriptionHTML += '</div>';
        return descriptionHTML;
    }

    // ===== HÀM XÁC THỰC VIP QUAN TRỌNG =====
    
    /**
     * Xác định trạng thái chính xác của người dùng dựa trên dữ liệu
     * @param {Object|null} userData - Dữ liệu user từ localStorage hoặc server
     * @returns {Object} - { 
     *   isPremium: boolean,      // TRUE nếu CÒN HẠN VIP
     *   status: string,          // 'free', 'active', 'expired', 'invalid', 'guest'
     *   displayPackage: string,  // Tên gói hiển thị (VD: "Trial (Đã hết hạn)")
     *   expiryDate: Date|null,   // Ngày hết hạn
     *   originalPackage: string  // Gốc: 'free','trial','basic','plus','premium'
     * }
     */
    static getUserStatus(userData) {
        if (!userData) {
            return { 
                isPremium: false, 
                status: 'guest', 
                displayPackage: 'Khách', 
                expiryDate: null,
                originalPackage: 'free'
            };
        }

        const packageType = userData.packageType || 'free';
        const vipExpiryStr = userData.vipExpiry;
        let expiryDate = null;
        let isPremium = false;
        let status = 'free';
        let displayPackage = 'Miễn phí';

        const packageNames = {
            'free': 'Miễn phí',
            'trial': 'Trial',
            'basic': 'Basic',
            'plus': 'Plus',
            'premium': 'Premium'
        };
        
        // Nếu không phải free, kiểm tra ngày hết hạn
        if (packageType !== 'free' && vipExpiryStr) {
            expiryDate = this.parseDate(vipExpiryStr);
            
            if (expiryDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                expiryDate.setHours(0, 0, 0, 0);

                if (expiryDate >= today) {
                    isPremium = true;
                    status = 'active';
                    displayPackage = packageNames[packageType] || packageType;
                } else {
                    isPremium = false;
                    status = 'expired';
                    displayPackage = `${packageNames[packageType] || packageType} (Đã hết hạn)`;
                }
            } else {
                // Không parse được ngày, coi như không có hiệu lực
                isPremium = false;
                status = 'invalid';
                displayPackage = `${packageNames[packageType] || packageType} (Lỗi)`;
            }
        } else {
            // packageType là 'free' hoặc không có vipExpiry
            isPremium = false;
            status = 'free';
            displayPackage = 'Miễn phí';
        }

        return {
            isPremium: isPremium,
            status: status,
            displayPackage: displayPackage,
            expiryDate: expiryDate,
            originalPackage: packageType
        };
    }

    /**
     * Kiểm tra user có được phép tải VIP app hay không
     * @param {Object} userData - Dữ liệu user
     * @param {string} appVipPermissions - Chuỗi permissions của app (VD: "trial,basic" hoặc "all")
     * @returns {boolean} - true nếu được phép
     */
    static canUserDownloadVIP(userData, appVipPermissions) {
        const userStatus = this.getUserStatus(userData);
        
        // Nếu user không phải premium (còn hạn) -> không được tải
        if (!userStatus.isPremium) {
            return false;
        }

        // Nếu app cho phép tất cả các gói
        if (!appVipPermissions || appVipPermissions === 'all') {
            return true;
        }

        // Kiểm tra package của user có nằm trong danh sách được phép không
        const allowedPackages = appVipPermissions.split(',').map(p => p.trim());
        return allowedPackages.includes(userStatus.originalPackage);
    }

    /**
     * Lấy danh sách tên gói được phép từ chuỗi permissions
     * @param {string} appVipPermissions - Chuỗi permissions
     * @returns {string[]} - Mảng tên gói
     */
    static getVipPermissionsReadable(appVipPermissions) {
        const packageNames = {
            'trial': 'Trial',
            'basic': 'Basic',
            'plus': 'Plus',
            'premium': 'Premium',
            'all': 'Tất cả các gói'
        };

        if (!appVipPermissions || appVipPermissions === 'all') {
            return ['Tất cả các gói'];
        }
        
        const packages = appVipPermissions.split(',').map(p => p.trim());
        return packages.map(p => packageNames[p] || p);
    }
}