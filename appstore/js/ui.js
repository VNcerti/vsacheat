// ===== UI FUNCTIONS =====

function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function startExpiryTimer(vueInstance) {
    vueInstance.expirySeconds = 900;
    vueInstance.updateExpiryDisplay();
    
    if (vueInstance.expiryTimer) {
        clearInterval(vueInstance.expiryTimer);
    }
    
    vueInstance.expiryTimer = setInterval(() => {
        vueInstance.expirySeconds--;
        vueInstance.updateExpiryDisplay();
        
        if (vueInstance.expirySeconds <= 0) {
            clearInterval(vueInstance.expiryTimer);
            vueInstance.expiryTimer = null;
            vueInstance.expiryTime = '00:00';
        }
    }, 1000);
}

function updateExpiryDisplay(vueInstance) {
    const mins = Math.floor(vueInstance.expirySeconds / 60);
    const secs = vueInstance.expirySeconds % 60;
    vueInstance.expiryTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}