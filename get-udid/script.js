// Generate UUID for the profile
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get current domain for redirect
function getCurrentDomain() {
    return window.location.origin + window.location.pathname;
}

// Download configuration profile for iOS - FIXED VERSION
function downloadProfile() {
    const redirectURL = getCurrentDomain() + '?udid={UDID}&PRODUCT={PRODUCT}&VERSION={VERSION}';
    const now = new Date();
    const uuid = generateUUID();
    
    // Fixed PayloadVersion - Must be integer, not string
    const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>URL</key>
            <string>${redirectURL}</string>
            <key>DeviceAttributes</key>
            <array>
                <string>UDID</string>
                <string>PRODUCT</string>
                <string>VERSION</string>
            </array>
        </dict>
    </array>
    <key>PayloadOrganization</key>
    <string>UDID.io</string>
    <key>PayloadDisplayName</key>
    <string>Get UDID Profile</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
    <key>PayloadUUID</key>
    <string>${uuid}</string>
    <key>PayloadIdentifier</key>
    <string>com.udidio.profile.${uuid}</string>
    <key>PayloadDescription</key>
    <string>Install this profile to get your iOS device UDID instantly and securely.</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadScope</key>
    <string>System</string>
</dict>
</plist>`;
    
    // Create blob and download
    const blob = new Blob([mobileconfig], { type: 'application/x-apple-aspen-config' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'udid_profile.mobileconfig';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Show toast notification
    showToast('Profile downloaded! Check your Downloads folder');
}

// Parse URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Display UDID if returned from profile
window.onload = function() {
    const udid = getUrlParameter('udid');
    const product = getUrlParameter('PRODUCT');
    const version = getUrlParameter('VERSION');
    
    if (udid) {
        displayUDID(udid, product, version);
    }
    
    // Initialize FAQ interactions
    initFAQ();
}

// Display UDID in the UI
function displayUDID(udid, product, version) {
    const instructionsSection = document.getElementById('instructions-section');
    const resultSection = document.getElementById('result-section');
    const udidValue = document.getElementById('udid-value');
    const deviceModel = document.getElementById('device-model');
    const iosVersion = document.getElementById('ios-version');
    
    // Hide instructions, show result
    instructionsSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    
    // Display device information
    udidValue.textContent = udid;
    deviceModel.textContent = product || 'Unknown Device';
    iosVersion.textContent = version || 'Unknown Version';
    
    // Clean URL (remove parameters)
    if (history.pushState) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({path: newUrl}, '', newUrl);
    }
    
    // Show success animation
    animateSuccess();
}

// Copy UDID to clipboard
function copyUDID() {
    const udidValue = document.getElementById('udid-value').textContent;
    
    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(udidValue).then(() => {
            showToast('UDID copied to clipboard!');
        }).catch(() => {
            fallbackCopy(udidValue);
        });
    } else {
        fallbackCopy(udidValue);
    }
}

// Fallback copy method
function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast('UDID copied to clipboard!');
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Reset page to get another UDID
function resetPage() {
    const instructionsSection = document.getElementById('instructions-section');
    const resultSection = document.getElementById('result-section');
    
    instructionsSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    
    // Scroll to top smoothly
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Animate success
function animateSuccess() {
    const successIcon = document.querySelector('.success-icon i');
    successIcon.style.animation = 'none';
    successIcon.offsetHeight; // Trigger reflow
    successIcon.style.animation = 'scaleIn 0.5s ease';
}

// Initialize FAQ interactions
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });
}

// Detect if user is on iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Show warning if not on iOS
function checkDevice() {
    if (!isIOS()) {
        const warning = document.createElement('div');
        warning.className = 'device-warning';
        warning.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>This service is designed for iOS devices only. You're using a non-iOS device.</span>
        `;
        document.querySelector('.main-card').prepend(warning);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkDevice();
});

// Handle any errors
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ', msg);
    showToast('An error occurred. Please try again.');
    return false;
};
