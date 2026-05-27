// Configuration variables - Centralized configuration for XSpace Store
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyL8-IBNW-Pqjm1IZehzKCiWEaY1bD75hjWWaPaXz5Y6fJIyZAz-Hvz9stCViN-sH5U/exec',
    CACHE_KEY: 'xspace_apps_cache',
    CACHE_TIMESTAMP_KEY: 'xspace_cache_timestamp',
    CACHE_DURATION: 30 * 60 * 1000, // 30 phút
    CATEGORY_LABELS: {
        'game': 'Trò chơi',
        'social': 'Mạng xã hội',
        'entertainment': 'Giải trí',
        'photo': 'Ảnh & Video',
        'clone': 'Nhân bản',
        'premium': 'Mở khoá Premium',
        'education': 'Giáo dục',
        'health': 'Sức khỏe',
        'utility': 'Tiện ích'
    },
    THEME_SETTINGS: {
        default: 'light',
        storageKey: 'theme'
    }
};

// Không export gì cả vì biến CONFIG được khai báo global