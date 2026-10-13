-- Roberice Database Snapshot before 1-Year Population
-- Generated: 2026-10-13 07:56:54

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'Cashier',
  `account_status` enum('Active','Inactive') DEFAULT 'Active',
  `permissions` text DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` VALUES
('1', 'admin', '$2y$10$H1Gvo388mvZGq3XOSsepCeX2xMSwf0kR5rKJJJqcSJ3fGu5whyPO6', 'Admin User', 'Admin', 'Active', '[\"dashboard\",\"pos\",\"view-inventory\",\"inventory\",\"products\",\"transactions\",\"sales-report\",\"file-manager\",\"audit\",\"users\"]'),
('2', 'cashier1', '$2y$10$RuTRrM9eyIIIw0hqlF50wuHl2aHq3iQGC7SvprF/zJlCo78DRBkYi', 'Maria Santos', 'Cashier', 'Active', '[\"pos\",\"view-inventory\",\"transactions\",\"sales-report\"]'),
('3', 'cashier2', '$2y$10$QbscdAndZI4wzJgp3qtrwepvww.I058rK4BWq3NJ0pS5lworkEkjK', 'Juan Dela Cruz', 'Cashier', 'Active', '[\"pos\",\"view-inventory\",\"transactions\",\"sales-report\"]');

DROP TABLE IF EXISTS `product`;
CREATE TABLE `product` (
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `product` VALUES
('1', 'Premium Rice', 'Aromatic', 'Imported', 'Aromatic Jasmine', 'Premium quality Dinorado rice', '2450.00', '1225.00', '55.00', '270.00', '530.00', '1050.00', '50.00', 'Inactive'),
('2', 'Dona Maria', 'Aromatic', 'Imported', 'Jasponica Premium', '', '2757.00', '1378.50', '110.00', '540.00', '1070.00', '2100.00', '50.00', 'Inactive'),
('3', 'Dona Maria', 'Aromatic', 'Imported', 'Jasponica Premium', '', '2757.00', '1378.50', '110.00', '540.00', '1070.00', '2100.00', '50.00', 'Inactive'),
('4', 'Sinandomeng Special', 'Premium White', 'Local', 'Sinandomeng', '', '2100.00', '1050.00', '48.00', '240.00', '475.00', '940.00', '50.00', 'Active'),
('5', 'Dinorado Fancy Rice', 'Aromatic', 'Local', 'Dinorado', '', '2450.00', '1225.00', '55.00', '275.00', '545.00', '1080.00', '50.00', 'Active'),
('6', 'Jasmine Premium', 'Fragrant Import', 'Imported', 'Jasmine Premium', '', '2800.00', '1400.00', '62.00', '310.00', '615.00', '1220.00', '50.00', 'Active'),
('7', 'Angelika Rice', 'Regular Milled', 'Local', 'Angelika', '', '1950.00', '975.00', '44.00', '220.00', '435.00', '860.00', '50.00', 'Active'),
('8', 'Malagkit Glutinous', 'Specialty Rice', 'Local', 'Glutinous / Malagkit', '', '3100.00', '1550.00', '70.00', '350.00', '690.00', '1370.00', '50.00', 'Active'),
('9', 'IR-64 Well_Milled', 'Standard Local', 'Local', 'Well-Milled (IR-64)', '', '1850.00', '925.00', '42.00', '210.00', '415.00', '820.00', '50.00', 'Active'),
('10', 'Demo Rice', 'Regular Milled', 'Local', 'Regular Milled', '', '2000.00', '1000.00', '45.00', '225.00', '445.00', '880.00', '50.00', 'Active'),
('11', 'Demo Rice 2', 'Regular Milled', 'Local', 'Regular Milled', '', '2000.00', '1000.00', '45.00', '225.00', '445.00', '880.00', '50.00', 'Active'),
('12', 'Demo Rice 3', 'Regular Milled', 'Local', 'Regular Milled', '', '2100.00', '1050.00', '45.00', '225.00', '445.00', '880.00', '50.00', 'Active');

DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `inventory` VALUES
('1', '1', '14', '0', '35.00', '0', '0', '0', '2026-09-01', 'BATCH-001', '200.00', '2026-09-02 11:15:01'),
('2', '2', '10', '0', '0.00', '0', '0', '0', '2026-09-01', 'BATCH-001', '200.00', '2026-09-02 01:21:46'),
('3', '3', '10', '0', '0.00', '0', '0', '0', '2026-09-01', 'BATCH-001', '200.00', '2026-09-02 01:26:12'),
('4', '4', '6', '5', '190.00', '11', '6', '2', '2026-09-28', 'BATCH-SIN-2609', '100.00', '2026-10-12 17:27:04'),
('5', '5', '9', '5', '22.50', '10', '4', '2', '2026-09-18', 'BATCH-DIN-2609', '100.00', '2026-10-12 16:23:24'),
('6', '6', '12', '5', '15.00', '6', '3', '0', '2026-08-15', 'BATCH-JAS-2608', '100.00', '2026-10-12 17:26:46'),
('7', '7', '12', '5', '0.00', '15', '8', '4', '2026-07-10', 'BATCH-ANG-2607', '100.00', '2026-10-12 16:23:24'),
('8', '8', '8', '5', '25.00', '8', '4', '1', '2026-09-01', 'BATCH-MAL-2609', '100.00', '2026-10-12 16:23:24'),
('9', '9', '18', '5', '0.00', '20', '10', '5', '2026-06-25', 'BATCH-IR64-2606', '100.00', '2026-10-12 16:23:24'),
('10', '10', '15', '0', '0.00', '5', '5', '0', '2026-10-12', 'BATCH-2610-12', '150.00', '2026-10-12 17:52:28'),
('11', '11', '0', '0', '0.00', '0', '0', '0', '2026-09-01', 'BATCH-001', '150.00', '2026-10-13 10:48:21'),
('12', '12', '6', '5', '15.00', '4', '2', '0', '2026-10-05', 'BATCH-DEM-2610', '150.00', '2026-10-12 16:23:24');

DROP TABLE IF EXISTS `inventory_batch`;
CREATE TABLE `inventory_batch` (
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `inventory_batch` VALUES
('1', '4', 'BATCH-SIN-2609', '2026-09-28', '4', '3', '2', '4', '7', '120.00', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('2', '4', 'BATCH-SIN-2608', '2026-08-20', '3', '2', '0', '2', '4', '70.00', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('3', '4', 'BATCH-SIN-2605', '2026-05-15', '0', '0', '0', '0', '0', '0.00', 'Depleted', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('4', '5', 'BATCH-DIN-2609', '2026-09-18', '6', '3', '2', '3', '6', '22.50', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('5', '5', 'BATCH-DIN-2607', '2026-07-25', '3', '2', '0', '1', '4', '0.00', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('6', '6', 'BATCH-JAS-2608', '2026-08-15', '13', '5', '0', '3', '6', '15.00', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('7', '7', 'BATCH-ANG-2607', '2026-07-10', '12', '5', '4', '8', '15', '0.00', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('8', '8', 'BATCH-MAL-2609', '2026-09-01', '8', '5', '1', '4', '8', '25.00', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('9', '9', 'BATCH-IR64-2606', '2026-06-25', '18', '5', '5', '10', '20', '0.00', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('10', '10', 'BATCH-001', '2026-09-01', '0', '0', '0', '0', '0', '0.00', 'Depleted', '2026-10-12 17:09:14', '2026-10-12 17:51:15'),
('11', '11', 'BATCH-001', '2026-09-01', '0', '0', '0', '0', '0', '0.00', 'Depleted', '2026-10-12 17:09:14', '2026-10-13 10:48:21'),
('12', '12', 'BATCH-DEM-2610', '2026-10-05', '6', '5', '0', '2', '4', '15.00', 'Active', '2026-10-12 17:09:14', '2026-10-12 17:09:14'),
('13', '10', 'BATCH-2610-12', '2026-10-12', '15', '0', '0', '5', '5', '0.00', 'Active', '2026-10-12 17:57:34', '2026-10-12 17:57:34');

DROP TABLE IF EXISTS `inventory_adjustment`;
CREATE TABLE `inventory_adjustment` (
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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `inventory_adjustment` VALUES
('1', '1', NULL, '2026-09-02 01:41:32', 'restock', '2', '5.00', 'low stock', 'Admin User'),
('2', '1', NULL, '2026-09-02 01:45:37', 'restock', '5', '25.00', 'n/a', 'Admin User'),
('3', '6', NULL, '2026-09-02 02:10:04', 'restock', '10', '0.00', 'n/a', 'Admin User'),
('4', '8', NULL, '2026-09-02 03:21:12', 'restock', '5', '25.00', 'low stock', 'Admin User'),
('5', '4', NULL, '2026-09-02 08:50:21', 'restock', '5', '25.00', 'low stock', 'Admin User'),
('6', '4', NULL, '2026-09-02 11:16:22', 'restock', '5', '50.00', 'add stock', 'Admin User'),
('7', '4', NULL, '2026-09-02 11:16:22', 'restock', '5', '50.00', 'add stock', 'Admin User'),
('8', '4', NULL, '2026-09-02 19:29:31', 'restock', '5', '50.00', '', 'Admin User'),
('9', '7', NULL, '2026-09-02 19:36:25', 'spoilage', '10', '50.00', 'damage product', 'Admin User'),
('10', '12', NULL, '2026-09-02 20:47:54', 'restock', '3', '0.00', '', 'Admin User'),
('11', '12', NULL, '2026-09-02 20:49:17', 'spoilage', '1', '0.00', 'damage product', 'Admin User'),
('12', '4', NULL, '2026-10-12 15:59:21', 'open_sack', '1', '20.00', 'Testing 20kg sack opening', 'Admin'),
('13', '12', NULL, '2026-10-12 15:59:52', 'open_sack', '1', '20.00', 'Opened 1x 20kg sack for 5 kg sale (15 kg stored in loose inventory)', 'Admin User'),
('14', '6', NULL, '2026-10-12 16:02:03', 'open_sack', '1', '20.00', 'Opened 20kg sack for retail selling', 'Cashier Maria'),
('15', '4', 'BATCH-SIN-2605', '2026-08-19 14:30:00', 'batch_depleted', '0', '0.00', 'Batch BATCH-SIN-2605 depleted (0 kg remaining) — all sacks sold and archived.', 'System Auto-Audit'),
('16', '10', 'BATCH-001', '2026-10-12 17:51:15', 'batch_depleted', '0', '0.00', 'Batch BATCH-001 for Demo Rice ran out (0 kg remaining) — batch completed & archived.', 'Admin User'),
('17', '10', 'BATCH-2610-12', '2026-10-12 17:52:28', 'restock', '15', '0.00', 'Restocked batch BATCH-2610-12 (2026-10-12) [Packs: 25kg=0, 20kg=0, 10kg=5, 5kg=5]', 'Admin User'),
('18', '11', 'BATCH-001', '2026-10-13 10:48:21', 'batch_depleted', '0', '0.00', 'Batch BATCH-001 for Demo Rice 2 ran out (0 kg remaining) — batch completed & archived.', 'Maria Santos');

DROP TABLE IF EXISTS `sales_transaction`;
CREATE TABLE `sales_transaction` (
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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `sales_transaction` VALUES
('1', '1', '2026-09-02 01:58:57', '2450.00', '3000.00', '550.00', 'Cash', 'Completed'),
('2', '1', '2026-09-02 01:59:22', '2450.00', '3000.00', '550.00', 'Cash', 'Completed'),
('3', '1', '2026-09-02 02:14:42', '4900.00', '5000.00', '100.00', 'Cash', 'Completed'),
('4', '1', '2026-09-02 02:16:44', '2100.00', '3000.00', '900.00', 'Cash', 'Completed'),
('5', '1', '2026-09-02 02:22:06', '3100.00', '3500.00', '400.00', 'Cash', 'Completed'),
('6', '1', '2026-09-02 03:14:39', '25200.00', '26000.00', '800.00', 'Cash', 'Completed'),
('7', '1', '2026-09-02 08:57:41', '14700.00', '15000.00', '300.00', 'Cash', 'Completed'),
('8', '1', '2026-09-02 11:15:01', '2450.00', '3000.00', '550.00', 'Cash', 'Completed'),
('9', '2', '2026-09-02 11:19:06', '2100.00', '2200.00', '100.00', 'Cash', 'Completed'),
('10', '1', '2026-09-02 19:23:08', '14700.00', '14700.00', '0.00', 'Cash', 'Completed'),
('11', '1', '2026-09-02 20:50:53', '2100.00', '2500.00', '400.00', 'Cash', 'Completed'),
('12', '1', '2026-10-12 15:12:13', '240.00', '500.00', '260.00', 'Cash', 'Completed'),
('13', '1', '2026-10-12 15:12:20', '137.50', '200.00', '62.50', 'Cash', 'Completed'),
('14', '1', '2026-10-12 15:59:21', '188.00', '200.00', '12.00', 'Cash', 'Completed'),
('15', '1', '2026-10-12 15:59:52', '225.00', '500.00', '275.00', 'Cash', 'Completed'),
('16', '2', '2026-10-12 16:02:03', '310.00', '500.00', '190.00', 'Cash', 'Completed'),
('17', '1', '2026-10-12 17:26:46', '2800.00', '3000.00', '200.00', 'Cash', 'Completed'),
('18', '1', '2026-10-12 17:27:04', '2100.00', '2500.00', '400.00', 'Cash', 'Completed'),
('19', '1', '2026-10-12 17:51:15', '2000.00', '2000.00', '0.00', 'Cash', 'Completed'),
('20', '2', '2026-10-13 10:48:21', '10000.00', '10000.00', '0.00', 'Cash', 'Completed');

DROP TABLE IF EXISTS `transaction_item`;
CREATE TABLE `transaction_item` (
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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `transaction_item` VALUES
('1', '1', '1', 'sack', '1.00', '2450.00', '2450.00'),
('2', '2', '1', 'sack', '1.00', '2450.00', '2450.00'),
('3', '3', '5', 'sack', '2.00', '2450.00', '4900.00'),
('4', '4', '4', 'sack', '1.00', '2100.00', '2100.00'),
('5', '5', '8', 'sack', '1.00', '3100.00', '3100.00'),
('6', '6', '4', 'sack', '12.00', '2100.00', '25200.00'),
('7', '7', '4', 'sack', '7.00', '2100.00', '14700.00'),
('8', '8', '1', 'sack', '1.00', '2450.00', '2450.00'),
('9', '9', '4', 'sack', '1.00', '2100.00', '2100.00'),
('10', '10', '4', 'sack', '7.00', '2100.00', '14700.00'),
('11', '11', '12', 'sack', '1.00', '2100.00', '2100.00'),
('12', '12', '4', '5kg', '1.00', '240.00', '240.00'),
('13', '13', '5', 'tinatakal', '2.50', '55.00', '137.50'),
('14', '14', '4', 'tinatakal', '4.00', '47.00', '188.00'),
('15', '15', '12', '5kg', '1.00', '225.00', '225.00'),
('16', '16', '6', '5kg', '1.00', '310.00', '310.00'),
('17', '17', '6', 'sack', '1.00', '2800.00', '2800.00'),
('18', '18', '4', 'sack', '1.00', '2100.00', '2100.00'),
('19', '19', '10', 'sack', '1.00', '2000.00', '2000.00'),
('20', '20', '11', 'sack', '5.00', '2000.00', '10000.00');

DROP TABLE IF EXISTS `file_records`;
CREATE TABLE `file_records` (
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

SET FOREIGN_KEY_CHECKS = 1;
