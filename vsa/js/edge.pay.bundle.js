// Payment configuration for XSpace Store
// UPDATED WITH LITE PACKAGE (7 DAYS - 29,000đ)

const PAY_CONFIG = {
    VIETQR_BASE_URL: 'https://img.vietqr.io/image/mbbank-311435-compact2.png',
    BANK_INFO: {
        name: 'MB Bank',
        account: '311435',
        holder: 'VU TUNG LAM'
    },
    PLANS: {
        lite: { 
            name: 'Lite Package', 
            price: 29000, 
            displayPrice: '29.000đ',
            duration: '7 ngày',
            packageType: 'lite',
            durationDays: 7,
            packageName: 'Lite',
            description: 'Gói dùng thử 7 ngày với đầy đủ tính năng VIP'
        },
        trial: { 
            name: 'Trial Package', 
            price: 59000, 
            displayPrice: '59.000đ',
            duration: '1 tháng',
            packageType: 'trial',
            durationDays: 30,
            packageName: 'Trial',
            description: 'Gói VIP 30 ngày - Tiết kiệm hơn Lite'
        },
        basic: { 
            name: 'Basic Package', 
            price: 129000,
            displayPrice: '129.000đ',
            duration: '3 tháng',
            packageType: 'basic', 
            durationDays: 90,
            packageName: 'Basic',
            description: 'Gói VIP 3 tháng - Tiết kiệm 27% so với gói Trial'
        },
        plus: { 
            name: 'Plus Package', 
            price: 219000,
            displayPrice: '219.000đ',
            duration: '6 tháng',
            packageType: 'plus',
            durationDays: 180,
            packageName: 'Plus',
            description: 'Gói VIP 6 tháng - Tiết kiệm 38% so với gói Basic'
        },
        premium: { 
            name: 'Premium Package', 
            price: 249000,
            displayPrice: '249.000đ',
            duration: '1 năm',
            packageType: 'premium',
            durationDays: 365,
            packageName: 'Premium',
            description: 'Gói VIP 1 năm - Tiết kiệm 52% so với gói Plus'
        }
    }
};
