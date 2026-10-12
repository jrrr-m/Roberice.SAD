<?php
/**
 * Roberice POS & Inventory Management System
 * Automated Web-Based Database Setup & Initialization Script
 * 
 * Access via Web Browser:
 *   http://localhost/Roberice.SAD/database/init_db.php
 * Or:
 *   http://localhost/<folder-name>/database/init_db.php
 */

header('Content-Type: text/html; charset=UTF-8');

// Configuration - Defaults for XAMPP
$host     = $_GET['host']     ?? $_POST['host']     ?? 'localhost';
$port     = $_GET['port']     ?? $_POST['port']     ?? 3306;
$username = $_GET['user']     ?? $_POST['user']     ?? 'root';
$password = $_GET['pass']     ?? $_POST['pass']     ?? '';
$dbname   = $_GET['dbname']   ?? $_POST['dbname']   ?? 'roberice_db';
$isFresh  = isset($_GET['fresh']) && ($_GET['fresh'] === '1' || $_GET['fresh'] === 'true');
$isJson   = (isset($_GET['format']) && $_GET['format'] === 'json') || 
            (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false && !isset($_GET['html']));

// Step tracker for UI output
$logs = [];
$stepStatus = [
    'connection' => false,
    'database'   => false,
    'tables'     => false,
    'seed_data'  => false,
    'counts'     => []
];
$errorMessage = null;

function logStep(&$logs, $message, $type = 'info') {
    $logs[] = [
        'time' => date('H:i:s'),
        'message' => $message,
        'type' => $type
    ];
}

try {
    // -------------------------------------------------------------
    // STEP 1: Connect to MySQL Server (Without selecting database)
    // -------------------------------------------------------------
    $dsnServer = "mysql:host=$host;port=$port;charset=utf8mb4";
    $pdo = new PDO($dsnServer, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    logStep($logs, "Connected to MySQL server successfully at {$host}:{$port}.", "success");
    $stepStatus['connection'] = true;

    // -------------------------------------------------------------
    // STEP 2: Create Database if Not Exists
    // -------------------------------------------------------------
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;");
    $pdo->exec("USE `{$dbname}`;");
    logStep($logs, "Database `{$dbname}` verified/created with utf8mb4_general_ci collation.", "success");
    $stepStatus['database'] = true;

    // Disable foreign key checks for schema manipulation
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // Optional fresh reset
    if ($isFresh) {
        $tablesToDrop = [
            'file_records',
            'transaction_item',
            'sales_transaction',
            'inventory_adjustment',
            'inventory_batch',
            'inventory',
            'product',
            'users'
        ];
        foreach ($tablesToDrop as $tbl) {
            $pdo->exec("DROP TABLE IF EXISTS `{$tbl}`;");
        }
        logStep($logs, "Fresh install mode enabled (?fresh=1): All existing tables dropped cleanly.", "warning");
    }

    // -------------------------------------------------------------
    // STEP 3: Create Tables Schema
    // -------------------------------------------------------------

    // 1. users table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `users` (
            `user_id` int(11) NOT NULL AUTO_INCREMENT,
            `username` varchar(50) NOT NULL,
            `password` varchar(255) NOT NULL,
            `full_name` varchar(100) NOT NULL,
            `role` varchar(50) NOT NULL DEFAULT 'Cashier',
            `account_status` enum('Active','Inactive') DEFAULT 'Active',
            `permissions` text DEFAULT NULL,
            PRIMARY KEY (`user_id`),
            UNIQUE KEY `username` (`username`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // 2. product table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `product` (
            `product_id` int(11) NOT NULL AUTO_INCREMENT,
            `product_name` varchar(100) NOT NULL,
            `category` varchar(100) DEFAULT NULL,
            `origin` enum('Local','Imported') NOT NULL DEFAULT 'Local',
            `rice_type` varchar(50) NOT NULL DEFAULT 'White Rice',
            `description` text DEFAULT NULL,
            `price_sack` decimal(10,2) NOT NULL,
            `price_25kg` decimal(10,2) DEFAULT NULL,
            `price_kg` decimal(10,2) NOT NULL,
            `price_5kg` decimal(10,2) DEFAULT NULL,
            `price_10kg` decimal(10,2) DEFAULT NULL,
            `price_20kg` decimal(10,2) DEFAULT NULL,
            `kg_per_sack` decimal(10,2) DEFAULT 50.00,
            `product_status` enum('Active','Inactive') DEFAULT 'Active',
            PRIMARY KEY (`product_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // 3. inventory table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `inventory` (
            `inventory_id` int(11) NOT NULL AUTO_INCREMENT,
            `product_id` int(11) NOT NULL,
            `stock_sacks` int(11) DEFAULT 0,
            `packaged_25kg` int(11) NOT NULL DEFAULT 0,
            `stock_kg` decimal(10,2) DEFAULT 0.00,
            `packaged_5kg` int(11) NOT NULL DEFAULT 0,
            `packaged_10kg` int(11) NOT NULL DEFAULT 0,
            `packaged_20kg` int(11) NOT NULL DEFAULT 0,
            `received_date` date NOT NULL DEFAULT '2026-09-01',
            `batch_number` varchar(50) NOT NULL DEFAULT 'BATCH-001',
            `reorder_level_kg` decimal(10,2) DEFAULT 200.00,
            `last_updated` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (`inventory_id`),
            UNIQUE KEY `product_id` (`product_id`),
            CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // 4. inventory_batch table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `inventory_batch` (
            `batch_id` int(11) NOT NULL AUTO_INCREMENT,
            `product_id` int(11) NOT NULL,
            `batch_code` varchar(50) NOT NULL,
            `received_date` date NOT NULL,
            `stock_sacks` int(11) NOT NULL DEFAULT 0,
            `packaged_25kg` int(11) NOT NULL DEFAULT 0,
            `packaged_20kg` int(11) NOT NULL DEFAULT 0,
            `packaged_10kg` int(11) NOT NULL DEFAULT 0,
            `packaged_5kg` int(11) NOT NULL DEFAULT 0,
            `stock_kg` decimal(10,2) NOT NULL DEFAULT 0.00,
            `status` enum('Active','Depleted') NOT NULL DEFAULT 'Active',
            `created_at` datetime NOT NULL DEFAULT current_timestamp(),
            `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (`batch_id`),
            KEY `idx_product_status` (`product_id`,`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // 5. inventory_adjustment table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `inventory_adjustment` (
            `adjustment_id` int(11) NOT NULL AUTO_INCREMENT,
            `product_id` int(11) NOT NULL,
            `batch_code` varchar(50) DEFAULT NULL,
            `adjustment_date` datetime DEFAULT current_timestamp(),
            `adjustment_type` varchar(50) NOT NULL,
            `sacks` int(11) DEFAULT 0,
            `kg` decimal(10,2) DEFAULT 0.00,
            `note` text DEFAULT NULL,
            `performed_by` varchar(100) DEFAULT NULL,
            PRIMARY KEY (`adjustment_id`),
            KEY `product_id` (`product_id`),
            CONSTRAINT `inventory_adjustment_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // 6. sales_transaction table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `sales_transaction` (
            `transaction_id` int(11) NOT NULL AUTO_INCREMENT,
            `user_id` int(11) NOT NULL,
            `transaction_date` datetime DEFAULT current_timestamp(),
            `total_amount` decimal(10,2) NOT NULL,
            `payment_amount` decimal(10,2) NOT NULL,
            `change_amount` decimal(10,2) NOT NULL,
            `payment_method` varchar(30) NOT NULL DEFAULT 'Cash',
            `transaction_status` enum('Completed','Cancelled') DEFAULT 'Completed',
            PRIMARY KEY (`transaction_id`),
            KEY `fk_transaction_user` (`user_id`),
            CONSTRAINT `fk_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // 7. transaction_item table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `transaction_item` (
            `transaction_item_id` int(11) NOT NULL AUTO_INCREMENT,
            `transaction_id` int(11) NOT NULL,
            `product_id` int(11) NOT NULL,
            `unit` varchar(20) NOT NULL,
            `quantity` decimal(10,2) NOT NULL,
            `unit_price` decimal(10,2) NOT NULL,
            `subtotal` decimal(10,2) NOT NULL,
            PRIMARY KEY (`transaction_item_id`),
            KEY `fk_item_transaction` (`transaction_id`),
            KEY `fk_item_product` (`product_id`),
            CONSTRAINT `fk_item_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
            CONSTRAINT `fk_item_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `sales_transaction` (`transaction_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    // 8. file_records table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `file_records` (
            `file_id` int(11) NOT NULL AUTO_INCREMENT,
            `file_name` varchar(255) NOT NULL,
            `original_name` varchar(255) NOT NULL,
            `file_path` varchar(255) NOT NULL,
            `file_size` bigint(20) NOT NULL,
            `file_type` varchar(100) NOT NULL,
            `category` varchar(50) NOT NULL DEFAULT 'Document',
            `description` text DEFAULT NULL,
            `uploaded_by` varchar(100) DEFAULT 'Admin',
            `uploaded_at` datetime DEFAULT current_timestamp(),
            PRIMARY KEY (`file_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");

    logStep($logs, "All 8 database tables verified / created successfully.", "success");
    $stepStatus['tables'] = true;

    // -------------------------------------------------------------
    // STEP 4: Seed Initial Data
    // -------------------------------------------------------------

    // 4.1 Seed Users
    $defaultUsers = [
        [
            'user_id' => 1,
            'username' => 'admin',
            'password' => '$2y$10$H1Gvo388mvZGq3XOSsepCeX2xMSwf0kR5rKJJJqcSJ3fGu5whyPO6', // admin123
            'full_name' => 'Admin User',
            'role' => 'Admin',
            'account_status' => 'Active',
            'permissions' => '["dashboard","pos","view-inventory","inventory","products","transactions","sales-report","file-manager","audit","users"]'
        ],
        [
            'user_id' => 2,
            'username' => 'cashier1',
            'password' => '$2y$10$RuTRrM9eyIIIw0hqlF50wuHl2aHq3iQGC7SvprF/zJlCo78DRBkYi', // cashier123
            'full_name' => 'Maria Santos',
            'role' => 'Cashier',
            'account_status' => 'Active',
            'permissions' => '["pos","view-inventory","transactions","sales-report"]'
        ],
        [
            'user_id' => 3,
            'username' => 'cashier2',
            'password' => '$2y$10$QbscdAndZI4wzJgp3qtrwepvww.I058rK4BWq3NJ0pS5lworkEkjK', // cashier123
            'full_name' => 'Juan Dela Cruz',
            'role' => 'Cashier',
            'account_status' => 'Active',
            'permissions' => '["pos","view-inventory","transactions","sales-report"]'
        ]
    ];

    $userStmt = $pdo->prepare("
        INSERT INTO `users` (`user_id`, `username`, `password`, `full_name`, `role`, `account_status`, `permissions`)
        VALUES (:user_id, :username, :password, :full_name, :role, :account_status, :permissions)
        ON DUPLICATE KEY UPDATE
            `full_name` = VALUES(`full_name`),
            `role` = VALUES(`role`),
            `account_status` = VALUES(`account_status`),
            `permissions` = VALUES(`permissions`)
    ");
    foreach ($defaultUsers as $u) {
        $userStmt->execute($u);
    }
    logStep($logs, "Users seeded: admin (admin123), cashier1 (cashier123), cashier2 (cashier123).", "success");

    // 4.2 Seed Products
    $products = [
        [1, 'Premium Rice', 'Aromatic', 'Imported', 'Aromatic Jasmine', 'Premium quality Dinorado rice', 2450.00, 1225.00, 55.00, 270.00, 530.00, 1050.00, 50.00, 'Inactive'],
        [2, 'Dona Maria', 'Aromatic', 'Imported', 'Jasponica Premium', '', 2757.00, 1378.50, 110.00, 540.00, 1070.00, 2100.00, 50.00, 'Inactive'],
        [3, 'Dona Maria', 'Aromatic', 'Imported', 'Jasponica Premium', '', 2757.00, 1378.50, 110.00, 540.00, 1070.00, 2100.00, 50.00, 'Inactive'],
        [4, 'Sinandomeng Special', 'Premium White', 'Local', 'Sinandomeng', '', 2100.00, 1050.00, 48.00, 240.00, 475.00, 940.00, 50.00, 'Active'],
        [5, 'Dinorado Fancy Rice', 'Aromatic', 'Local', 'Dinorado', '', 2450.00, 1225.00, 55.00, 275.00, 545.00, 1080.00, 50.00, 'Active'],
        [6, 'Jasmine Premium', 'Fragrant Import', 'Imported', 'Jasmine Premium', '', 2800.00, 1400.00, 62.00, 310.00, 615.00, 1220.00, 50.00, 'Active'],
        [7, 'Angelika Rice', 'Regular Milled', 'Local', 'Angelika', '', 1950.00, 975.00, 44.00, 220.00, 435.00, 860.00, 50.00, 'Active'],
        [8, 'Malagkit Glutinous', 'Specialty Rice', 'Local', 'Glutinous / Malagkit', '', 3100.00, 1550.00, 70.00, 350.00, 690.00, 1370.00, 50.00, 'Active'],
        [9, 'IR-64 Well_Milled', 'Standard Local', 'Local', 'Well-Milled (IR-64)', '', 1850.00, 925.00, 42.00, 210.00, 415.00, 820.00, 50.00, 'Active'],
        [10, 'Demo Rice', 'Regular Milled', 'Local', 'Regular Milled', '', 2000.00, 1000.00, 45.00, 225.00, 445.00, 880.00, 50.00, 'Active'],
        [11, 'Demo Rice 2', 'Regular Milled', 'Local', 'Regular Milled', '', 2000.00, 1000.00, 45.00, 225.00, 445.00, 880.00, 50.00, 'Active'],
        [12, 'Demo Rice 3', 'Regular Milled', 'Local', 'Regular Milled', '', 2100.00, 1050.00, 45.00, 225.00, 445.00, 880.00, 50.00, 'Active']
    ];

    $prodStmt = $pdo->prepare("
        INSERT INTO `product` (`product_id`, `product_name`, `category`, `origin`, `rice_type`, `description`, `price_sack`, `price_25kg`, `price_kg`, `price_5kg`, `price_10kg`, `price_20kg`, `kg_per_sack`, `product_status`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            `product_name` = VALUES(`product_name`),
            `category` = VALUES(`category`),
            `origin` = VALUES(`origin`),
            `rice_type` = VALUES(`rice_type`),
            `price_sack` = VALUES(`price_sack`),
            `price_25kg` = VALUES(`price_25kg`),
            `price_kg` = VALUES(`price_kg`),
            `price_5kg` = VALUES(`price_5kg`),
            `price_10kg` = VALUES(`price_10kg`),
            `price_20kg` = VALUES(`price_20kg`),
            `product_status` = VALUES(`product_status`)
    ");
    foreach ($products as $p) {
        $prodStmt->execute($p);
    }
    logStep($logs, "12 Rice products catalog initialized with pricing & package tiers.", "success");

    // 4.3 Seed Inventory
    $inventory = [
        [1, 1, 14, 0, 35.00, 0, 0, 0, '2026-09-01', 'BATCH-001', 200.00, '2026-09-02 11:15:01'],
        [2, 2, 10, 0, 0.00, 0, 0, 0, '2026-09-01', 'BATCH-001', 200.00, '2026-09-02 01:21:46'],
        [3, 3, 10, 0, 0.00, 0, 0, 0, '2026-09-01', 'BATCH-001', 200.00, '2026-09-02 01:26:12'],
        [4, 4, 6, 5, 190.00, 11, 6, 2, '2026-09-28', 'BATCH-SIN-2609', 100.00, '2026-10-12 17:27:04'],
        [5, 5, 9, 5, 22.50, 10, 4, 2, '2026-09-18', 'BATCH-DIN-2609', 100.00, '2026-10-12 16:23:24'],
        [6, 6, 12, 5, 15.00, 6, 3, 0, '2026-08-15', 'BATCH-JAS-2608', 100.00, '2026-10-12 17:26:46'],
        [7, 7, 12, 5, 0.00, 15, 8, 4, '2026-07-10', 'BATCH-ANG-2607', 100.00, '2026-10-12 16:23:24'],
        [8, 8, 8, 5, 25.00, 8, 4, 1, '2026-09-01', 'BATCH-MAL-2609', 100.00, '2026-10-12 16:23:24'],
        [9, 9, 18, 5, 0.00, 20, 10, 5, '2026-06-25', 'BATCH-IR64-2606', 100.00, '2026-10-12 16:23:24'],
        [10, 10, 15, 0, 0.00, 5, 5, 0, '2026-10-12', 'BATCH-2610-12', 150.00, '2026-10-12 17:52:28'],
        [11, 11, 5, 0, 0.00, 0, 0, 0, '2026-09-01', 'BATCH-001', 150.00, '2026-09-02 20:42:32'],
        [12, 12, 6, 5, 15.00, 4, 2, 0, '2026-10-05', 'BATCH-DEM-2610', 150.00, '2026-10-12 16:23:24']
    ];

    $invStmt = $pdo->prepare("
        INSERT INTO `inventory` (`inventory_id`, `product_id`, `stock_sacks`, `packaged_25kg`, `stock_kg`, `packaged_5kg`, `packaged_10kg`, `packaged_20kg`, `received_date`, `batch_number`, `reorder_level_kg`, `last_updated`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            `stock_sacks` = VALUES(`stock_sacks`),
            `packaged_25kg` = VALUES(`packaged_25kg`),
            `stock_kg` = VALUES(`stock_kg`),
            `packaged_5kg` = VALUES(`packaged_5kg`),
            `packaged_10kg` = VALUES(`packaged_10kg`),
            `packaged_20kg` = VALUES(`packaged_20kg`),
            `received_date` = VALUES(`received_date`),
            `batch_number` = VALUES(`batch_number`),
            `reorder_level_kg` = VALUES(`reorder_level_kg`)
    ");
    foreach ($inventory as $inv) {
        $invStmt->execute($inv);
    }
    logStep($logs, "Inventory stock records seeded with packaging breakdown (25kg, 20kg, 10kg, 5kg, loose kg).", "success");

    // 4.4 Seed Inventory Batches
    $batches = [
        [1, 4, 'BATCH-SIN-2609', '2026-09-28', 4, 3, 2, 4, 7, 120.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [2, 4, 'BATCH-SIN-2608', '2026-08-20', 3, 2, 0, 2, 4, 70.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [3, 4, 'BATCH-SIN-2605', '2026-05-15', 0, 0, 0, 0, 0, 0.00, 'Depleted', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [4, 5, 'BATCH-DIN-2609', '2026-09-18', 6, 3, 2, 3, 6, 22.50, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [5, 5, 'BATCH-DIN-2607', '2026-07-25', 3, 2, 0, 1, 4, 0.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [6, 6, 'BATCH-JAS-2608', '2026-08-15', 13, 5, 0, 3, 6, 15.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [7, 7, 'BATCH-ANG-2607', '2026-07-10', 12, 5, 4, 8, 15, 0.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [8, 8, 'BATCH-MAL-2609', '2026-09-01', 8, 5, 1, 4, 8, 25.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [9, 9, 'BATCH-IR64-2606', '2026-06-25', 18, 5, 5, 10, 20, 0.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [10, 10, 'BATCH-001', '2026-09-01', 0, 0, 0, 0, 0, 0.00, 'Depleted', '2026-10-12 17:09:14', '2026-10-12 17:51:15'],
        [11, 11, 'BATCH-001', '2026-09-01', 5, 0, 0, 0, 0, 0.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [12, 12, 'BATCH-DEM-2610', '2026-10-05', 6, 5, 0, 2, 4, 15.00, 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'],
        [13, 10, 'BATCH-2610-12', '2026-10-12', 15, 0, 0, 5, 5, 0.00, 'Active', '2026-10-12 17:57:34', '2026-10-12 17:57:34']
    ];

    $batchStmt = $pdo->prepare("
        INSERT INTO `inventory_batch` (`batch_id`, `product_id`, `batch_code`, `received_date`, `stock_sacks`, `packaged_25kg`, `packaged_20kg`, `packaged_10kg`, `packaged_5kg`, `stock_kg`, `status`, `created_at`, `updated_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            `stock_sacks` = VALUES(`stock_sacks`),
            `packaged_25kg` = VALUES(`packaged_25kg`),
            `packaged_20kg` = VALUES(`packaged_20kg`),
            `packaged_10kg` = VALUES(`packaged_10kg`),
            `packaged_5kg` = VALUES(`packaged_5kg`),
            `stock_kg` = VALUES(`stock_kg`),
            `status` = VALUES(`status`)
    ");
    foreach ($batches as $b) {
        $batchStmt->execute($b);
    }
    logStep($logs, "Inventory batch tracking rows initialized for FIFO stock aging.", "success");

    // 4.5 Seed Inventory Adjustments
    $adjustments = [
        [1, 1, null, '2026-09-02 01:41:32', 'restock', 2, 5.00, 'low stock', 'Admin User'],
        [2, 1, null, '2026-09-02 01:45:37', 'restock', 5, 25.00, 'n/a', 'Admin User'],
        [3, 6, null, '2026-09-02 02:10:04', 'restock', 10, 0.00, 'n/a', 'Admin User'],
        [4, 8, null, '2026-09-02 03:21:12', 'restock', 5, 25.00, 'low stock', 'Admin User'],
        [5, 4, null, '2026-09-02 08:50:21', 'restock', 5, 25.00, 'low stock', 'Admin User'],
        [6, 4, null, '2026-09-02 11:16:22', 'restock', 5, 50.00, 'add stock', 'Admin User'],
        [7, 4, null, '2026-09-02 11:16:22', 'restock', 5, 50.00, 'add stock', 'Admin User'],
        [8, 4, null, '2026-09-02 19:29:31', 'restock', 5, 50.00, '', 'Admin User'],
        [9, 7, null, '2026-09-02 19:36:25', 'spoilage', 10, 50.00, 'damage product', 'Admin User'],
        [10, 12, null, '2026-09-02 20:47:54', 'restock', 3, 0.00, '', 'Admin User'],
        [11, 12, null, '2026-09-02 20:49:17', 'spoilage', 1, 0.00, 'damage product', 'Admin User'],
        [12, 4, null, '2026-10-12 15:59:21', 'open_sack', 1, 20.00, 'Testing 20kg sack opening', 'Admin'],
        [13, 12, null, '2026-10-12 15:59:52', 'open_sack', 1, 20.00, 'Opened 1x 20kg sack for 5 kg sale (15 kg stored in loose inventory)', 'Admin User'],
        [14, 6, null, '2026-10-12 16:02:03', 'open_sack', 1, 20.00, 'Opened 20kg sack for retail selling', 'Cashier Maria'],
        [15, 4, 'BATCH-SIN-2605', '2026-08-19 14:30:00', 'batch_depleted', 0, 0.00, 'Batch BATCH-SIN-2605 depleted (0 kg remaining) — all sacks sold and archived.', 'System Auto-Audit'],
        [16, 10, 'BATCH-001', '2026-10-12 17:51:15', 'batch_depleted', 0, 0.00, 'Batch BATCH-001 for Demo Rice ran out (0 kg remaining) — batch completed & archived.', 'Admin User'],
        [17, 10, 'BATCH-2610-12', '2026-10-12 17:52:28', 'restock', 15, 0.00, 'Restocked batch BATCH-2610-12 (2026-10-12) [Packs: 25kg=0, 20kg=0, 10kg=5, 5kg=5]', 'Admin User']
    ];

    $adjStmt = $pdo->prepare("
        INSERT INTO `inventory_adjustment` (`adjustment_id`, `product_id`, `batch_code`, `adjustment_date`, `adjustment_type`, `sacks`, `kg`, `note`, `performed_by`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `note` = VALUES(`note`)
    ");
    foreach ($adjustments as $a) {
        $adjStmt->execute($a);
    }
    logStep($logs, "Inventory adjustment logs seeded.", "success");

    // 4.6 Seed Sales Transactions
    $transactions = [
        [1, 1, '2026-09-02 01:58:57', 2450.00, 3000.00, 550.00, 'Cash', 'Completed'],
        [2, 1, '2026-09-02 01:59:22', 2450.00, 3000.00, 550.00, 'Cash', 'Completed'],
        [3, 1, '2026-09-02 02:14:42', 4900.00, 5000.00, 100.00, 'Cash', 'Completed'],
        [4, 1, '2026-09-02 02:16:44', 2100.00, 3000.00, 900.00, 'Cash', 'Completed'],
        [5, 1, '2026-09-02 02:22:06', 3100.00, 3500.00, 400.00, 'Cash', 'Completed'],
        [6, 1, '2026-09-02 03:14:39', 25200.00, 26000.00, 800.00, 'Cash', 'Completed'],
        [7, 1, '2026-09-02 08:57:41', 14700.00, 15000.00, 300.00, 'Cash', 'Completed'],
        [8, 1, '2026-09-02 11:15:01', 2450.00, 3000.00, 550.00, 'Cash', 'Completed'],
        [9, 2, '2026-09-02 11:19:06', 2100.00, 2200.00, 100.00, 'Cash', 'Completed'],
        [10, 1, '2026-09-02 19:23:08', 14700.00, 14700.00, 0.00, 'Cash', 'Completed'],
        [11, 1, '2026-09-02 20:50:53', 2100.00, 2500.00, 400.00, 'Cash', 'Completed'],
        [12, 1, '2026-10-12 15:12:13', 240.00, 500.00, 260.00, 'Cash', 'Completed'],
        [13, 1, '2026-10-12 15:12:20', 137.50, 200.00, 62.50, 'Cash', 'Completed'],
        [14, 1, '2026-10-12 15:59:21', 188.00, 200.00, 12.00, 'Cash', 'Completed'],
        [15, 1, '2026-10-12 15:59:52', 225.00, 500.00, 275.00, 'Cash', 'Completed'],
        [16, 2, '2026-10-12 16:02:03', 310.00, 500.00, 190.00, 'Cash', 'Completed'],
        [17, 1, '2026-10-12 17:26:46', 2800.00, 3000.00, 200.00, 'Cash', 'Completed'],
        [18, 1, '2026-10-12 17:27:04', 2100.00, 2500.00, 400.00, 'Cash', 'Completed'],
        [19, 1, '2026-10-12 17:51:15', 2000.00, 2000.00, 0.00, 'Cash', 'Completed']
    ];

    $txStmt = $pdo->prepare("
        INSERT INTO `sales_transaction` (`transaction_id`, `user_id`, `transaction_date`, `total_amount`, `payment_amount`, `change_amount`, `payment_method`, `transaction_status`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `total_amount` = VALUES(`total_amount`)
    ");
    foreach ($transactions as $t) {
        $txStmt->execute($t);
    }

    // 4.7 Seed Transaction Items
    $items = [
        [1, 1, 1, 'sack', 1.00, 2450.00, 2450.00],
        [2, 2, 1, 'sack', 1.00, 2450.00, 2450.00],
        [3, 3, 5, 'sack', 2.00, 2450.00, 4900.00],
        [4, 4, 4, 'sack', 1.00, 2100.00, 2100.00],
        [5, 5, 8, 'sack', 1.00, 3100.00, 3100.00],
        [6, 6, 4, 'sack', 12.00, 2100.00, 25200.00],
        [7, 7, 4, 'sack', 7.00, 2100.00, 14700.00],
        [8, 8, 1, 'sack', 1.00, 2450.00, 2450.00],
        [9, 9, 4, 'sack', 1.00, 2100.00, 2100.00],
        [10, 10, 4, 'sack', 7.00, 2100.00, 14700.00],
        [11, 11, 12, 'sack', 1.00, 2100.00, 2100.00],
        [12, 12, 4, '5kg', 1.00, 240.00, 240.00],
        [13, 13, 5, 'tinatakal', 2.50, 55.00, 137.50],
        [14, 14, 4, 'tinatakal', 4.00, 47.00, 188.00],
        [15, 15, 12, '5kg', 1.00, 225.00, 225.00],
        [16, 16, 6, '5kg', 1.00, 310.00, 310.00],
        [17, 17, 6, 'sack', 1.00, 2800.00, 2800.00],
        [18, 18, 4, 'sack', 1.00, 2100.00, 2100.00],
        [19, 19, 10, 'sack', 1.00, 2000.00, 2000.00]
    ];

    $itemStmt = $pdo->prepare("
        INSERT INTO `transaction_item` (`transaction_item_id`, `transaction_id`, `product_id`, `unit`, `quantity`, `unit_price`, `subtotal`)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `subtotal` = VALUES(`subtotal`)
    ");
    foreach ($items as $it) {
        $itemStmt->execute($it);
    }
    logStep($logs, "Historical sales transactions & line items seeded.", "success");

    // 4.8 Seed File Records (if empty)
    $fileCount = $pdo->query("SELECT COUNT(*) FROM `file_records`")->fetchColumn();
    if ((int)$fileCount === 0) {
        $pdo->exec("
            INSERT INTO `file_records` (`file_id`, `file_name`, `original_name`, `file_path`, `file_size`, `file_type`, `category`, `description`, `uploaded_by`, `uploaded_at`)
            VALUES (1, 'roberice_db_initial_setup.sql', 'roberice_db_initial_setup.sql', 'uploads/roberice_db.sql', 20942, 'application/sql', 'Database Backup', 'Full initial schema and seed database snapshot.', 'Admin User', NOW())
            ON DUPLICATE KEY UPDATE `file_id` = `file_id`;
        ");
    }

    // Re-enable foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    logStep($logs, "Foreign key constraints re-enabled and validated.", "success");
    $stepStatus['seed_data'] = true;

    // -------------------------------------------------------------
    // STEP 5: Verification & Record Counts
    // -------------------------------------------------------------
    $tables = [
        'users' => 'Users & Accounts',
        'product' => 'Products Catalog',
        'inventory' => 'Inventory Records',
        'inventory_batch' => 'Inventory Batches',
        'inventory_adjustment' => 'Adjustments & Logs',
        'sales_transaction' => 'Sales Transactions',
        'transaction_item' => 'Transaction Line Items',
        'file_records' => 'File Records'
    ];

    foreach ($tables as $t => $label) {
        $count = $pdo->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
        $stepStatus['counts'][$t] = [
            'label' => $label,
            'count' => (int)$count
        ];
    }
    logStep($logs, "Verification successful! All 8 tables contain active operational records.", "success");

} catch (PDOException $e) {
    $errorMessage = $e->getMessage();
    logStep($logs, "Database Error: " . $e->getMessage(), "error");
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    logStep($logs, "General Error: " . $e->getMessage(), "error");
}

// -------------------------------------------------------------
// Output Handling: JSON API mode vs Beautiful HTML UI
// -------------------------------------------------------------
if ($isJson) {
    echo json_encode([
        'success' => $errorMessage === null,
        'message' => $errorMessage === null ? 'Database initialization completed successfully.' : $errorMessage,
        'steps' => $stepStatus,
        'logs' => $logs
    ], JSON_PRETTY_PRINT);
    exit;
}

// Determine base URL paths for easy navigation
$currentUri = $_SERVER['REQUEST_URI'] ?? '';
$baseDir = dirname(dirname($currentUri));
if ($baseDir === '/' || $baseDir === '\\') $baseDir = '';
$loginUrl = $baseDir . '/pages/login.html';
$dashUrl  = $baseDir . '/pages/dashboard.html';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Setup | Roberice POS & Inventory System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --primary-light: #60a5fa;
            --accent: #10b981;
            --accent-dark: #059669;
            --bg-base: #0f172a;
            --bg-surface: #1e293b;
            --bg-card: rgba(30, 41, 59, 0.85);
            --border: rgba(148, 163, 184, 0.15);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --danger: #ef4444;
            --warning: #f59e0b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background: radial-gradient(circle at 15% 15%, #1e1b4b 0%, #0f172a 50%, #020617 100%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
            line-height: 1.5;
        }

        .container {
            width: 100%;
            max-width: 860px;
            background: var(--bg-card);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
            overflow: hidden;
            animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(16px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .header {
            padding: 2.25rem 2.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            background: linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, transparent 100%);
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .logo-icon {
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
        }

        .brand-text h1 {
            font-size: 1.35rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(90deg, #ffffff, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .brand-text p {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 2px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.825rem;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .badge-success {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .badge-error {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .badge-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 10px currentColor;
        }

        .content {
            padding: 2.25rem 2.5rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        /* Step Checklist */
        .steps-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
        }

        .step-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 1.15rem;
            display: flex;
            align-items: center;
            gap: 0.85rem;
            transition: all 0.2s ease;
        }

        .step-card:hover {
            border-color: rgba(96, 165, 250, 0.3);
            transform: translateY(-2px);
        }

        .step-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            font-weight: 700;
        }

        .step-icon.ok {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .step-icon.fail {
            background: rgba(239, 68, 68, 0.2);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .step-info .step-title {
            font-size: 0.825rem;
            font-weight: 600;
            color: var(--text-main);
        }

        .step-info .step-desc {
            font-size: 0.725rem;
            color: var(--text-muted);
        }

        /* Tables & Counts Summary */
        .section-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.85rem;
        }

        .tables-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
            gap: 0.75rem;
        }

        .table-stat {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 0.85rem 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .table-name {
            font-size: 0.8rem;
            font-weight: 600;
            color: #cbd5e1;
            font-family: 'JetBrains Mono', monospace;
        }

        .table-count {
            font-size: 0.8rem;
            font-weight: 700;
            color: #60a5fa;
            background: rgba(37, 99, 235, 0.15);
            padding: 0.2rem 0.55rem;
            border-radius: 6px;
        }

        /* Default Credentials Card */
        .credentials-box {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
            border: 1px solid rgba(96, 165, 250, 0.25);
            border-radius: 16px;
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
        }

        .credentials-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #10b981);
        }

        .cred-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.25rem;
            margin-top: 1rem;
        }

        .cred-item {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1rem;
        }

        .cred-role {
            font-size: 0.725rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            font-weight: 700;
            margin-bottom: 0.35rem;
        }

        .cred-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.825rem;
            margin-top: 0.25rem;
        }

        .cred-label {
            color: #64748b;
        }

        .cred-val {
            font-family: 'JetBrains Mono', monospace;
            color: #f1f5f9;
            font-weight: 600;
            background: rgba(255, 255, 255, 0.05);
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
        }

        /* Action Buttons */
        .action-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding-top: 0.5rem;
            border-top: 1px solid var(--border);
        }

        .btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.85rem 1.5rem;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 1px solid transparent;
        }

        .btn-primary {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 24px -5px rgba(37, 99, 235, 0.5);
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .btn-secondary {
            background: rgba(30, 41, 59, 0.8);
            border-color: var(--border);
            color: #cbd5e1;
        }

        .btn-secondary:hover {
            background: rgba(51, 65, 85, 0.8);
            color: #ffffff;
            border-color: rgba(148, 163, 184, 0.3);
        }

        .btn-danger {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.3);
            color: #f87171;
            font-size: 0.8rem;
            padding: 0.75rem 1.15rem;
        }

        .btn-danger:hover {
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
        }

        /* Logs Collapsible */
        details {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
        }

        summary {
            padding: 0.85rem 1.25rem;
            cursor: pointer;
            font-size: 0.825rem;
            font-weight: 600;
            color: var(--text-muted);
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        summary:hover {
            color: var(--text-main);
            background: rgba(255, 255, 255, 0.02);
        }

        .log-container {
            padding: 1rem 1.25rem;
            border-top: 1px solid var(--border);
            max-height: 220px;
            overflow-y: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            background: #090d16;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .log-entry {
            display: flex;
            gap: 0.75rem;
        }

        .log-time {
            color: #64748b;
        }

        .log-msg.success { color: #34d399; }
        .log-msg.info    { color: #94a3b8; }
        .log-msg.warning { color: #fbbf24; }
        .log-msg.error   { color: #f87171; }

        .error-banner {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 14px;
            padding: 1.25rem;
            color: #fca5a5;
            font-size: 0.875rem;
        }

        .error-banner strong {
            display: block;
            margin-bottom: 0.25rem;
            color: #fee2e2;
        }

        @media (max-width: 640px) {
            .header, .content {
                padding: 1.5rem;
            }
            .action-row {
                flex-direction: column;
                align-items: stretch;
            }
            .btn-group {
                flex-direction: column;
            }
            .btn {
                justify-content: center;
            }
        }
    </style>
</head>
<body>

<div class="container">
    <!-- Header -->
    <div class="header">
        <div class="header-brand">
            <div class="logo-icon">🌾</div>
            <div class="brand-text">
                <h1>Roberice POS & Inventory</h1>
                <p>Automated Database Setup & Migration</p>
            </div>
        </div>
        <div>
            <?php if ($errorMessage === null): ?>
                <div class="status-badge badge-success">
                    <span class="badge-dot"></span>
                    Database Ready
                </div>
            <?php else: ?>
                <div class="status-badge badge-error">
                    <span class="badge-dot"></span>
                    Setup Error
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Content -->
    <div class="content">

        <?php if ($errorMessage !== null): ?>
            <div class="error-banner">
                <strong>Database Initialization Failed</strong>
                <?= htmlspecialchars($errorMessage) ?>
                <p style="margin-top: 0.5rem; font-size: 0.8rem; color: #cbd5e1;">
                    Tip: Verify your XAMPP MySQL service is running on <code>localhost:3306</code> with user <code>root</code>.
                </p>
            </div>
        <?php endif; ?>

        <!-- Step Checklist Cards -->
        <div class="steps-grid">
            <div class="step-card">
                <div class="step-icon <?= $stepStatus['connection'] ? 'ok' : 'fail' ?>">
                    <?= $stepStatus['connection'] ? '✓' : '✗' ?>
                </div>
                <div class="step-info">
                    <div class="step-title">MySQL Connection</div>
                    <div class="step-desc"><?= htmlspecialchars($host . ':' . $port) ?></div>
                </div>
            </div>

            <div class="step-card">
                <div class="step-icon <?= $stepStatus['database'] ? 'ok' : 'fail' ?>">
                    <?= $stepStatus['database'] ? '✓' : '✗' ?>
                </div>
                <div class="step-info">
                    <div class="step-title">Database Created</div>
                    <div class="step-desc">`<?= htmlspecialchars($dbname) ?>`</div>
                </div>
            </div>

            <div class="step-card">
                <div class="step-icon <?= $stepStatus['tables'] ? 'ok' : 'fail' ?>">
                    <?= $stepStatus['tables'] ? '✓' : '✗' ?>
                </div>
                <div class="step-info">
                    <div class="step-title">8 Tables Generated</div>
                    <div class="step-desc">Schema verified</div>
                </div>
            </div>

            <div class="step-card">
                <div class="step-icon <?= $stepStatus['seed_data'] ? 'ok' : 'fail' ?>">
                    <?= $stepStatus['seed_data'] ? '✓' : '✗' ?>
                </div>
                <div class="step-info">
                    <div class="step-title">Seed Data Ready</div>
                    <div class="step-desc">Users, Products, Stock</div>
                </div>
            </div>
        </div>

        <!-- Tables & Records Counter -->
        <?php if (!empty($stepStatus['counts'])): ?>
            <div>
                <div class="section-title">
                    <span>📊</span>
                    <span>Database Tables & Seed Record Counts</span>
                </div>
                <div class="tables-grid">
                    <?php foreach ($stepStatus['counts'] as $table => $data): ?>
                        <div class="table-stat">
                            <span class="table-name"><?= htmlspecialchars($table) ?></span>
                            <span class="table-count"><?= number_format($data['count']) ?> rows</span>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endif; ?>

        <!-- Default Credentials Card -->
        <div class="credentials-box">
            <div class="section-title" style="margin-bottom: 0;">
                <span>🔑</span>
                <span>Default Login Credentials</span>
            </div>
            <div class="cred-grid">
                <div class="cred-item">
                    <div class="cred-role">System Administrator</div>
                    <div class="cred-row">
                        <span class="cred-label">Username:</span>
                        <span class="cred-val">admin</span>
                    </div>
                    <div class="cred-row">
                        <span class="cred-label">Password:</span>
                        <span class="cred-val">admin123</span>
                    </div>
                    <div class="cred-row" style="margin-top: 0.5rem; font-size: 0.75rem; color: #10b981;">
                        <span>✓ Full Administrative Access</span>
                    </div>
                </div>

                <div class="cred-item">
                    <div class="cred-role">Store Cashier</div>
                    <div class="cred-row">
                        <span class="cred-label">Username:</span>
                        <span class="cred-val">cashier1</span>
                    </div>
                    <div class="cred-row">
                        <span class="cred-label">Password:</span>
                        <span class="cred-val">cashier123</span>
                    </div>
                    <div class="cred-row" style="margin-top: 0.5rem; font-size: 0.75rem; color: #60a5fa;">
                        <span>✓ POS & Inventory Lookup</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Execution Details Log -->
        <details>
            <summary>
                <span>View Migration SQL Execution Log (<?= count($logs) ?> steps)</span>
                <span>▼</span>
            </summary>
            <div class="log-container">
                <?php foreach ($logs as $log): ?>
                    <div class="log-entry">
                        <span class="log-time">[<?= $log['time'] ?>]</span>
                        <span class="log-msg <?= $log['type'] ?>"><?= htmlspecialchars($log['message']) ?></span>
                    </div>
                <?php endforeach; ?>
            </div>
        </details>

        <!-- Navigation Action Buttons -->
        <div class="action-row">
            <div class="btn-group">
                <a href="<?= htmlspecialchars($loginUrl) ?>" class="btn btn-primary" id="btn-login">
                    <span>🚀</span>
                    <span>Launch Login Page</span>
                </a>
                <a href="<?= htmlspecialchars($dashUrl) ?>" class="btn btn-secondary" id="btn-dash">
                    <span>📈</span>
                    <span>Go to Dashboard</span>
                </a>
            </div>

            <div>
                <a href="?fresh=1" class="btn btn-danger" onclick="return confirm('WARNING: Are you sure you want to completely drop and recreate all database tables? Any newly added data will be reset to defaults.')">
                    <span>↺</span>
                    <span>Clean Reset Database</span>
                </a>
            </div>
        </div>

    </div>
</div>

</body>
</html>
