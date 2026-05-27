// Firebase Configuration cho Realtime Database
const firebaseConfig = {
    apiKey: "AIzaSyC9VMDowjZ05A-ZqycaFYI5CtRcjazdZm4",
    authDomain: "ioscert-appstore.firebaseapp.com",
    databaseURL: "https://ioscert-appstore-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ioscert-appstore",
    storageBucket: "ioscert-appstore.firebasestorage.app",
    messagingSenderId: "798453453536",
    appId: "1:798453453536:web:965eeebcbf3b043ea1b685",
    measurementId: "G-EP3FHT2B4B"
};

// Initialize Firebase với Realtime Database
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('Firebase Realtime Database initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Hàm lấy IP của người dùng (sử dụng service miễn phí)
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error getting IP:', error);
        return 'unknown';
    }
}

// Hàm track page view với Realtime Database
async function trackPageView() {
    if (!database) {
        console.log('Firebase Database not loaded');
        return;
    }
    
    try {
        // Lấy IP của người dùng
        const userIP = await getUserIP();
        
        const visitData = {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: {
                width: screen.width,
                height: screen.height
            },
            url: window.location.href,
            referrer: document.referrer || 'direct',
            ip: userIP
        };

        console.log('Tracking visit with data:', visitData);

        // Tạo key mới cho lượt truy cập
        const visitKey = 'visit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const visitRef = database.ref('analytics/visits/' + visitKey);
        
        // Lưu thông tin lượt truy cập
        await visitRef.set(visitData);
        console.log('Visit data saved with key:', visitKey);
        
        // Cập nhật tổng lượt truy cập
        const totalVisitsRef = database.ref('analytics/totalVisits');
        const totalVisitsSnapshot = await totalVisitsRef.once('value');
        const currentTotal = totalVisitsSnapshot.val() || 0;
        await totalVisitsRef.set(currentTotal + 1);
        console.log('Total visits updated:', currentTotal + 1);
        
        // Cập nhật lượt truy cập hôm nay
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const todayVisitsRef = database.ref('analytics/dailyVisits/' + today);
        const todayVisitsSnapshot = await todayVisitsRef.once('value');
        const currentToday = todayVisitsSnapshot.val() || 0;
        await todayVisitsRef.set(currentToday + 1);
        console.log('Today visits updated:', currentToday + 1);
        
        // Cập nhật lượt truy cập tháng này
        const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
        const monthlyVisitsRef = database.ref('analytics/monthlyVisits/' + currentMonth);
        const monthlyVisitsSnapshot = await monthlyVisitsRef.once('value');
        const currentMonthly = monthlyVisitsSnapshot.val() || 0;
        await monthlyVisitsRef.set(currentMonthly + 1);
        console.log('Monthly visits updated:', currentMonthly + 1);
        
        console.log('Visit recorded successfully!');
        
    } catch (error) {
        console.error('Error recording visit: ', error);
    }
}

// Hàm track sự kiện tải app
function trackAppDownload(appName, appId) {
    if (!database) {
        console.log('Firebase Database not loaded');
        return;
    }
    
    try {
        const downloadData = {
            timestamp: Date.now(),
            appName: appName,
            appId: appId,
            url: window.location.href
        };
        
        const downloadKey = 'download_' + Date.now();
        const downloadRef = database.ref('analytics/downloads/' + downloadKey);
        downloadRef.set(downloadData);
        
        console.log('App download tracked:', appName);
    } catch (error) {
        console.error('Error tracking download:', error);
    }
}

// Hàm track sự kiện tìm kiếm
function trackSearch(searchTerm, resultsCount) {
    if (!database) {
        console.log('Firebase Database not loaded');
        return;
    }
    
    try {
        const searchData = {
            timestamp: Date.now(),
            searchTerm: searchTerm,
            resultsCount: resultsCount,
            url: window.location.href
        };
        
        const searchKey = 'search_' + Date.now();
        const searchRef = database.ref('analytics/searches/' + searchKey);
        searchRef.set(searchData);
        
        console.log('Search tracked:', searchTerm);
    } catch (error) {
        console.error('Error tracking search:', error);
    }
}

// Hàm track thời gian session
function trackSessionTime() {
    if (!database) {
        return;
    }
    
    const sessionStart = Date.now();
    
    window.addEventListener('beforeunload', function() {
        const sessionDuration = Date.now() - sessionStart;
        const sessionData = {
            timestamp: Date.now(),
            duration: sessionDuration,
            url: window.location.href
        };
        
        const sessionKey = 'session_' + sessionStart;
        const sessionRef = database.ref('analytics/sessions/' + sessionKey);
        sessionRef.set(sessionData);
        
        console.log('Session tracked:', Math.round(sessionDuration / 1000) + 's');
    });
}

// Hàm kiểm tra trạng thái Firebase
function checkFirebaseStatus() {
    if (!database) {
        console.error('Firebase Database is not initialized');
        return false;
    }
    
    // Test connection
    const testRef = database.ref('.info/connected');
    testRef.on('value', function(snap) {
        if (snap.val() === true) {
            console.log('Firebase Realtime Database connected');
        } else {
            console.log('Firebase Realtime Database disconnected');
        }
    });
    
    return true;
}

// Initialize tracking khi trang load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Firebase analytics...');
    
    // Kiểm tra trạng thái Firebase
    if (checkFirebaseStatus()) {
        // Track page view sau 1 giây
        setTimeout(() => {
            trackPageView();
        }, 1000);
        
        // Track session time
        trackSessionTime();
        
        // Thêm event listener cho các nút download
        document.addEventListener('click', function(e) {
            const downloadBtn = e.target.closest('.download-btn, .app-download-btn');
            if (downloadBtn) {
                const appCard = downloadBtn.closest('.app-card');
                if (appCard) {
                    const appName = appCard.querySelector('.app-name')?.textContent || 'Unknown App';
                    const appId = appCard.dataset.appId || 'unknown';
                    trackAppDownload(appName, appId);
                }
            }
        });
        
        // Thêm event listener cho search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                if (e.target.value.length > 0) { // Tracking bắt đầu từ ký tự đầu tiên
                    setTimeout(() => {
                        const results = document.querySelectorAll('.app-card').length;
                        trackSearch(e.target.value, results);
                    }, 500);
                }
            });
        }
        
        // Thêm event listener cho search modal
        const searchModalInput = document.getElementById('searchModalInput');
        if (searchModalInput) {
            searchModalInput.addEventListener('input', function(e) {
                if (e.target.value.length > 0) { // Tracking bắt đầu từ ký tự đầu tiên
                    setTimeout(() => {
                        const results = document.querySelectorAll('.app-card').length;
                        trackSearch(e.target.value, results);
                    }, 500);
                }
            });
        }
    } else {
        console.error('Failed to initialize Firebase analytics');
    }
});

// Export functions để sử dụng trong các file khác
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        trackPageView,
        trackAppDownload,
        trackSearch,
        trackSessionTime
    };
}