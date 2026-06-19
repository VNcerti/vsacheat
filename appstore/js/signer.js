// ===== SIGNER FUNCTIONS =====

function uploadWithXHR(fd, signUrl, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(e.loaded / e.total);
            }
        });
        
        xhr.onload = () => {
            if (xhr.status === 202 || xhr.status === 200) {
                try {
                    let responseData;
                    if (xhr.responseText.trim() === '') {
                        responseData = { task_id: 'temp_' + Date.now() };
                    } else {
                        responseData = JSON.parse(xhr.responseText);
                    }
                    
                    if (responseData.task_id) {
                        resolve({ jobId: responseData.task_id });
                    } else if (responseData.job_id) {
                        resolve({ jobId: responseData.job_id });
                    } else if (responseData.id) {
                        resolve({ jobId: responseData.id });
                    } else {
                        const match = xhr.responseText.trim().match(/[a-zA-Z0-9_-]+/);
                        if (match) {
                            resolve({ jobId: match[0] });
                        } else {
                            const jobId = 'job_' + Date.now();
                            resolve({ jobId: jobId });
                        }
                    }
                } catch (parseError) {
                    const match = xhr.responseText.trim().match(/[a-zA-Z0-9_-]+/);
                    if (match) {
                        resolve({ jobId: match[0] });
                    } else {
                        const jobId = 'job_' + Date.now();
                        resolve({ jobId: jobId });
                    }
                }
            } else {
                let errorMsg = `Server error: ${xhr.status}`;
                if (xhr.responseText) {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorMsg = errorData.error || errorData.message || errorMsg;
                    } catch {
                        errorMsg = xhr.responseText.substring(0, 200);
                    }
                }
                reject(new Error(errorMsg));
            }
        };
        
        xhr.onerror = () => {
            reject(new Error('Lỗi kết nối đến server. Vui lòng kiểm tra mạng và thử lại.'));
        };
        
        xhr.onabort = () => {
            reject(new Error('Upload bị hủy.'));
        };
        
        xhr.open('POST', signUrl);
        xhr.send(fd);
    });
}

async function pollStatus(jobId, statusUrl, downloadUrl, onProgress) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 120;
        
        const timer = setInterval(async () => {
            attempts++;
            try {
                const url = `${statusUrl}/${jobId}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        if (attempts >= maxAttempts) {
                            clearInterval(timer);
                            reject(new Error('Quá thời gian chờ!'));
                        }
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const responseText = await response.text();
                let d;
                try {
                    d = JSON.parse(responseText);
                } catch (parseError) {
                    d = { status: 'PROCESSING', msg: responseText || 'Đang xử lý...' };
                }
                
                if (onProgress && d.progress) {
                    onProgress(d.progress);
                }
                
                if (d.status === 'SUCCESS' || d.status === 'COMPLETED' || d.status === 'DONE') {
                    const base = `${downloadUrl}/${jobId}`;
                    clearInterval(timer);
                    resolve({ downloadUrl: base });
                    return;
                }
                
                if (d.status === 'FAILURE' || d.status === 'ERROR') {
                    clearInterval(timer);
                    reject(new Error(d.msg || 'Ký thất bại'));
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    clearInterval(timer);
                    reject(new Error('Quá thời gian chờ (10 phút)!'));
                }
            } catch (err) {
                console.error('Poll error:', err);
                if (attempts >= maxAttempts) {
                    clearInterval(timer);
                    reject(err);
                }
            }
        }, 3000);
    });
}