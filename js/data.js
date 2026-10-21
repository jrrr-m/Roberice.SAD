/**
 * Roberice POS & Inventory System - Initial Sample Data & Storage Layer
 */

const DEFAULT_USERS = [
  { id: 'usr_1', username: 'admin', password: 'admin123', name: 'Admin User', role: 'admin', status: 'active', createdAt: '2026-01-01' },
  { id: 'usr_2', username: 'cashier1', password: 'cashier123', name: 'Maria Santos', role: 'cashier', status: 'active', createdAt: '2026-01-10' },
  { id: 'usr_3', username: 'cashier2', password: 'cashier123', name: 'Juan Dela Cruz', role: 'cashier', status: 'active', createdAt: '2026-01-15' }
];

const DEFAULT_PRODUCTS = [
  {
    id: 'prod_1',
    name: 'Sinandomeng Special',
    category: 'Premium White',
    priceSack: 2100.00,
    priceKg: 48.00,
    kgPerSack: 50,
    stockSacks: 15,
    stockKg: 20,
    thresholdKg: 250,
    status: 'active'
  },
  {
    id: 'prod_2',
    name: 'Dinorado Fancy Rice',
    category: 'Aromatic',
    priceSack: 2450.00,
    priceKg: 55.00,
    kgPerSack: 50,
    stockSacks: 12,
    stockKg: 15,
    thresholdKg: 200,
    status: 'active'
  },
  {
    id: 'prod_3',
    name: 'Jasmine Premium',
    category: 'Fragrant Import',
    priceSack: 2800.00,
    priceKg: 62.00,
    kgPerSack: 50,
    stockSacks: 3,
    stockKg: 10,
    thresholdKg: 250, // Low stock: (3*50)+10 = 160kg < 250kg
    status: 'active'
  },
  {
    id: 'prod_4',
    name: 'Angelika Rice',
    category: 'Regular Milled',
    priceSack: 1950.00,
    priceKg: 44.00,
    kgPerSack: 50,
    stockSacks: 22,
    stockKg: 35,
    thresholdKg: 200,
    status: 'active'
  },
  {
    id: 'prod_5',
    name: 'Malagkit Glutinous',
    category: 'Specialty Rice',
    priceSack: 3100.00,
    priceKg: 70.00,
    kgPerSack: 50,
    stockSacks: 4,
    stockKg: 12,
    thresholdKg: 200, // Low stock: (4*50)+12 = 212kg ~ threshold
    status: 'active'
  },
  {
    id: 'prod_6',
    name: 'IR-64 Well-Milled',
    category: 'Standard Local',
    priceSack: 1850.00,
    priceKg: 42.00,
    kgPerSack: 50,
    stockSacks: 18,
    stockKg: 40,
    thresholdKg: 200,
    status: 'active'
  }
];

const DEFAULT_TRANSACTIONS = [
  {
    id: 'TXN-1001',
    timestamp: '2026-08-26 10:15:00',
    cashierId: 'usr_2',
    cashierName: 'Maria Santos',
    items: [
      { productId: 'prod_1', productName: 'Sinandomeng Special', unit: 'sack', qty: 2, unitPrice: 2100.00, subtotal: 4200.00 },
      { productId: 'prod_1', productName: 'Sinandomeng Special', unit: 'kg', qty: 5, unitPrice: 48.00, subtotal: 240.00 }
    ],
    totalAmount: 4440.00,
    paymentReceived: 5000.00,
    changeAmount: 560.00,
    paymentMethod: 'Cash'
  },
  {
    id: 'TXN-1002',
    timestamp: '2026-08-27 14:30:00',
    cashierId: 'usr_2',
    cashierName: 'Maria Santos',
    items: [
      { productId: 'prod_2', productName: 'Dinorado Fancy Rice', unit: 'sack', qty: 1, unitPrice: 2450.00, subtotal: 2450.00 }
    ],
    totalAmount: 2450.00,
    paymentReceived: 2500.00,
    changeAmount: 50.00,
    paymentMethod: 'Cash'
  },
  {
    id: 'TXN-1003',
    timestamp: '2026-08-28 11:20:00',
    cashierId: 'usr_3',
    cashierName: 'Juan Dela Cruz',
    items: [
      { productId: 'prod_4', productName: 'Angelika Rice', unit: 'sack', qty: 3, unitPrice: 1950.00, subtotal: 5850.00 },
      { productId: 'prod_6', productName: 'IR-64 Well-Milled', unit: 'kg', qty: 10, unitPrice: 42.00, subtotal: 420.00 }
    ],
    totalAmount: 6270.00,
    paymentReceived: 6300.00,
    changeAmount: 30.00,
    paymentMethod: 'GCash'
  },
  {
    id: 'TXN-1004',
    timestamp: '2026-08-29 16:45:00',
    cashierId: 'usr_2',
    cashierName: 'Maria Santos',
    items: [
      { productId: 'prod_3', productName: 'Jasmine Premium', unit: 'sack', qty: 2, unitPrice: 2800.00, subtotal: 5600.00 }
    ],
    totalAmount: 5600.00,
    paymentReceived: 6000.00,
    changeAmount: 400.00,
    paymentMethod: 'Cash'
  },
  {
    id: 'TXN-1005',
    timestamp: '2026-08-30 09:10:00',
    cashierId: 'usr_3',
    cashierName: 'Juan Dela Cruz',
    items: [
      { productId: 'prod_5', productName: 'Malagkit Glutinous', unit: 'kg', qty: 8, unitPrice: 70.00, subtotal: 560.00 },
      { productId: 'prod_1', productName: 'Sinandomeng Special', unit: 'sack', qty: 1, unitPrice: 2100.00, subtotal: 2100.00 }
    ],
    totalAmount: 2660.00,
    paymentReceived: 3000.00,
    changeAmount: 340.00,
    paymentMethod: 'Cash'
  },
  {
    id: 'TXN-1006',
    timestamp: '2026-09-01 11:05:00',
    cashierId: 'usr_2',
    cashierName: 'Maria Santos',
    items: [
      { productId: 'prod_1', productName: 'Sinandomeng Special', unit: 'sack', qty: 2, unitPrice: 2100.00, subtotal: 4200.00 },
      { productId: 'prod_4', productName: 'Angelika Rice', unit: 'kg', qty: 15, unitPrice: 44.00, subtotal: 660.00 }
    ],
    totalAmount: 4860.00,
    paymentReceived: 5000.00,
    changeAmount: 140.00,
    paymentMethod: 'Cash'
  }
];

const DEFAULT_AUDIT_LOGS = [
  { id: 'log_1', timestamp: '2026-08-25 09:00:00', user: 'Admin User', action: 'System Init', description: 'System initialized with default settings and sample inventory.' },
  { id: 'log_2', timestamp: '2026-08-26 10:15:00', user: 'Maria Santos', action: 'Sale Completed', description: 'Completed sale TXN-1001 for ₱4,440.00.' },
  { id: 'log_3', timestamp: '2026-08-28 08:30:00', user: 'Admin User', action: 'Inventory Restock', description: 'Restocked 10 sacks of Sinandomeng Special.' },
  { id: 'log_4', timestamp: '2026-08-30 09:10:00', user: 'Juan Dela Cruz', action: 'Sale Completed', description: 'Completed sale TXN-1005 for ₱2,660.00.' },
  { id: 'log_5', timestamp: '2026-09-01 11:05:00', user: 'Maria Santos', action: 'Sale Completed', description: 'Completed sale TXN-1006 for ₱4,860.00.' }
];

const DEFAULT_ADJUSTMENTS = [
  { id: 'adj_1', timestamp: '2026-08-28 08:30:00', productId: 'prod_1', productName: 'Sinandomeng Special', type: 'restock', sacks: 10, kg: 0, note: 'New shipment from Nueva Ecija supplier', user: 'Admin User' }
];

// Clean legacy prototype storage keys so application only relies on authoritative MySQL database
function initDataStore() {
  const legacyKeys = [
    'roberice_users',
    'roberice_products',
    'roberice_transactions',
    'roberice_audit_logs',
    'roberice_adjustments'
  ];
  legacyKeys.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  });
}

// Call on data script load
initDataStore();

// Safe Getter & Setter Functions (Memory fallback for auxiliary UI states)
function getData(key) {
  try {
    return JSON.parse(localStorage.getItem(`roberice_${key}`)) || [];
  } catch (e) {
    return [];
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(`roberice_${key}`, JSON.stringify(data));
  } catch (e) {}
}
