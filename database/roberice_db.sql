-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: roberice_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `roberice_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `roberice_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `roberice_db`;

--
-- Table structure for table `file_records`
--

DROP TABLE IF EXISTS `file_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file_records`
--

LOCK TABLES `file_records` WRITE;
/*!40000 ALTER TABLE `file_records` DISABLE KEYS */;
INSERT INTO `file_records` VALUES (1,'roberice_db_backup_20261012_090219.sql','roberice_db_backup_20261012_090219.sql','uploads/roberice_db_backup_20261012_090219.sql',14190,'application/sql','Database Backup','Automated SQL database full snapshot and schema backup.','Admin User','2026-10-12 15:02:19'),(2,'sales_export_20261012_090223.csv','sales_export_20261012_090223.csv','uploads/sales_export_20261012_090223.csv',1521,'text/csv','Sales Report','CSV export of all sales transactions and line items.','Admin User','2026-10-12 15:02:23');
/*!40000 ALTER TABLE `file_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES (1,1,14,35.00,0,0,0,'2026-09-01','BATCH-001',200.00,'2026-09-02 11:15:01'),(2,2,10,0.00,0,0,0,'2026-09-01','BATCH-001',200.00,'2026-09-02 01:21:46'),(3,3,10,0.00,0,0,0,'2026-09-01','BATCH-001',200.00,'2026-09-02 01:26:12'),(4,4,7,175.00,11,6,3,'2026-09-28','BATCH-SIN-2609',100.00,'2026-10-12 15:12:13'),(5,5,9,22.50,10,4,2,'2026-09-18','BATCH-DIN-2609',100.00,'2026-10-12 15:12:20'),(6,6,13,0.00,6,3,1,'2026-08-15','BATCH-JAS-2608',100.00,'2026-10-12 14:58:08'),(7,7,12,0.00,15,8,4,'2026-07-10','BATCH-ANG-2607',100.00,'2026-10-12 14:58:08'),(8,8,8,25.00,8,4,1,'2026-09-01','BATCH-MAL-2609',100.00,'2026-10-12 14:58:08'),(9,9,18,0.00,20,10,5,'2026-06-25','BATCH-IR64-2606',100.00,'2026-10-12 14:58:08'),(10,10,5,0.00,0,0,0,'2026-09-01','BATCH-001',150.00,'2026-09-02 20:39:23'),(11,11,5,0.00,0,0,0,'2026-09-01','BATCH-001',150.00,'2026-09-02 20:42:32'),(12,12,6,0.00,4,2,1,'2026-10-05','BATCH-DEM-2610',150.00,'2026-10-12 14:58:08');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_adjustment`
--

DROP TABLE IF EXISTS `inventory_adjustment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_adjustment` (
  `adjustment_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `adjustment_date` datetime DEFAULT current_timestamp(),
  `adjustment_type` enum('restock','spoilage','correction','open_sack','repack') NOT NULL,
  `sacks` int(11) DEFAULT 0,
  `kg` decimal(10,2) DEFAULT 0.00,
  `note` text DEFAULT NULL,
  `performed_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`adjustment_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `inventory_adjustment_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_adjustment`
--

LOCK TABLES `inventory_adjustment` WRITE;
/*!40000 ALTER TABLE `inventory_adjustment` DISABLE KEYS */;
INSERT INTO `inventory_adjustment` VALUES (1,1,'2026-09-02 01:41:32','restock',2,5.00,'low stock','Admin User'),(2,1,'2026-09-02 01:45:37','restock',5,25.00,'n/a','Admin User'),(3,6,'2026-09-02 02:10:04','restock',10,0.00,'n/a','Admin User'),(4,8,'2026-09-02 03:21:12','restock',5,25.00,'low stock','Admin User'),(5,4,'2026-09-02 08:50:21','restock',5,25.00,'low stock','Admin User'),(6,4,'2026-09-02 11:16:22','restock',5,50.00,'add stock','Admin User'),(7,4,'2026-09-02 11:16:22','restock',5,50.00,'add stock','Admin User'),(8,4,'2026-09-02 19:29:31','restock',5,50.00,'','Admin User'),(9,7,'2026-09-02 19:36:25','spoilage',10,50.00,'damage product','Admin User'),(10,12,'2026-09-02 20:47:54','restock',3,0.00,'','Admin User'),(11,12,'2026-09-02 20:49:17','spoilage',1,0.00,'damage product','Admin User');
/*!40000 ALTER TABLE `inventory_adjustment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product`
--

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
INSERT INTO `product` VALUES (1,'Premium Rice','Aromatic','Imported','Aromatic Jasmine','Premium quality Dinorado rice',2450.00,55.00,270.00,530.00,1050.00,50.00,'Inactive'),(2,'Dona Maria','Aromatic','Imported','Jasponica Premium','',2757.00,110.00,540.00,1070.00,2100.00,25.00,'Inactive'),(3,'Dona Maria','Aromatic','Imported','Jasponica Premium','',2757.00,110.00,540.00,1070.00,2100.00,25.00,'Inactive'),(4,'Sinandomeng Special','Premium White','Local','Sinandomeng','',2100.00,48.00,240.00,475.00,940.00,50.00,'Active'),(5,'Dinorado Fancy Rice','Aromatic','Local','Dinorado','',2450.00,55.00,275.00,545.00,1080.00,25.00,'Active'),(6,'Jasmine Premium','Fragrant Import','Imported','Jasmine Premium','',2800.00,62.00,310.00,615.00,1220.00,25.00,'Active'),(7,'Angelika Rice','Regular Milled','Local','Angelika','',1950.00,44.00,220.00,435.00,860.00,25.00,'Active'),(8,'Malagkit Glutinous','Specialty Rice','Local','Glutinous / Malagkit','',3100.00,70.00,350.00,690.00,1370.00,25.00,'Active'),(9,'IR-64 Well_Milled','Standard Local','Local','Well-Milled (IR-64)','',1850.00,42.00,210.00,415.00,820.00,25.00,'Active'),(10,'Demo Rice','Regular Milled','Local','Regular Milled','',2000.00,45.00,225.00,445.00,880.00,50.00,'Active'),(11,'Demo Rice 2','Regular Milled','Local','Regular Milled','',2000.00,45.00,225.00,445.00,880.00,50.00,'Active'),(12,'Demo Rice 3','Regular Milled','Local','Regular Milled','',2100.00,45.00,225.00,445.00,880.00,50.00,'Active');
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_transaction`
--

DROP TABLE IF EXISTS `sales_transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_transaction`
--

LOCK TABLES `sales_transaction` WRITE;
/*!40000 ALTER TABLE `sales_transaction` DISABLE KEYS */;
INSERT INTO `sales_transaction` VALUES (1,1,'2026-09-02 01:58:57',2450.00,3000.00,550.00,'Cash','Completed'),(2,1,'2026-09-02 01:59:22',2450.00,3000.00,550.00,'Cash','Completed'),(3,1,'2026-09-02 02:14:42',4900.00,5000.00,100.00,'Cash','Completed'),(4,1,'2026-09-02 02:16:44',2100.00,3000.00,900.00,'Cash','Completed'),(5,1,'2026-09-02 02:22:06',3100.00,3500.00,400.00,'Cash','Completed'),(6,1,'2026-09-02 03:14:39',25200.00,26000.00,800.00,'Cash','Completed'),(7,1,'2026-09-02 08:57:41',14700.00,15000.00,300.00,'Cash','Completed'),(8,1,'2026-09-02 11:15:01',2450.00,3000.00,550.00,'Cash','Completed'),(9,2,'2026-09-02 11:19:06',2100.00,2200.00,100.00,'Cash','Completed'),(10,1,'2026-09-02 19:23:08',14700.00,14700.00,0.00,'Cash','Completed'),(11,1,'2026-09-02 20:50:53',2100.00,2500.00,400.00,'Cash','Completed'),(12,1,'2026-10-12 15:12:13',240.00,500.00,260.00,'Cash','Completed'),(13,1,'2026-10-12 15:12:20',137.50,200.00,62.50,'Cash','Completed');
/*!40000 ALTER TABLE `sales_transaction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_item`
--

DROP TABLE IF EXISTS `transaction_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  CONSTRAINT `fk_item_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `sales_transaction` (`transaction_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_item`
--

LOCK TABLES `transaction_item` WRITE;
/*!40000 ALTER TABLE `transaction_item` DISABLE KEYS */;
INSERT INTO `transaction_item` VALUES (1,1,1,'sack',1.00,2450.00,2450.00),(2,2,1,'sack',1.00,2450.00,2450.00),(3,3,5,'sack',2.00,2450.00,4900.00),(4,4,4,'sack',1.00,2100.00,2100.00),(5,5,8,'sack',1.00,3100.00,3100.00),(6,6,4,'sack',12.00,2100.00,25200.00),(7,7,4,'sack',7.00,2100.00,14700.00),(8,8,1,'sack',1.00,2450.00,2450.00),(9,9,4,'sack',1.00,2100.00,2100.00),(10,10,4,'sack',7.00,2100.00,14700.00),(11,11,12,'sack',1.00,2100.00,2100.00),(12,12,4,'5kg',1.00,240.00,240.00),(13,13,5,'tinatakal',2.50,55.00,137.50);
/*!40000 ALTER TABLE `transaction_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2y$10$H1Gvo388mvZGq3XOSsepCeX2xMSwf0kR5rKJJJqcSJ3fGu5whyPO6','Admin User','Admin','Active','[\"dashboard\",\"pos\",\"view-inventory\",\"inventory\",\"products\",\"transactions\",\"sales-report\",\"file-manager\",\"audit\",\"users\"]'),(2,'cashier1','$2y$10$RuTRrM9eyIIIw0hqlF50wuHl2aHq3iQGC7SvprF/zJlCo78DRBkYi','Maria Santos','Cashier','Active','[\"pos\",\"view-inventory\",\"transactions\",\"sales-report\"]'),(3,'cashier2','$2y$10$QbscdAndZI4wzJgp3qtrwepvww.I058rK4BWq3NJ0pS5lworkEkjK','Juan Dela Cruz','Cashier','Active','[\"pos\",\"view-inventory\",\"transactions\",\"sales-report\"]');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-12 15:12:25
