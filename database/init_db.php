<?php
/**
 * Roberice POS & Inventory Management System
 * Automatic Database Setup & Router
 *
 * Typing http://localhost/Roberice.SAD/database/init_db.php in the browser
 * automatically ensures the database, tables, and production seed data exist,
 * and immediately loads the Roberice login page.
 */

// Connection parameters for XAMPP
$host = 'localhost';
$port = 3306;
$user = 'root';
$pass = '';
$dbname = 'roberice_db';

try {
    // 1. Connect to MySQL server
    $pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_MULTI_STATEMENTS => true
    ]);

    // 2. Create database if it does not exist and select it
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;");
    $pdo->exec("USE `{$dbname}`;");

    $isFresh = (isset($_GET['fresh']) && $_GET['fresh'] == '1' && (isset($_GET['confirm']) && $_GET['confirm'] === 'roberice_reset_confirmed')) || (php_sapi_name() === 'cli' && isset($argv[1]) && $argv[1] === '--fresh');

    // 3. Check if database tables already exist and have product data
    $hasTables = false;
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'product'")->fetchAll();
    if (count($tableCheck) > 0) {
        $pCount = (int)$pdo->query("SELECT COUNT(*) FROM `product`")->fetchColumn();
        if ($pCount > 0) {
            $hasTables = true;
        }
    }

    // 4. Initialize schema and dataset from roberice_db.sql if uninitialized or confirmed fresh reset requested
    if (!$hasTables || $isFresh) {
        $sqlFile = __DIR__ . '/roberice_db.sql';
        if (file_exists($sqlFile)) {
            $imported = false;
            $mysqlBin = 'C:\\xampp\\mysql\\bin\\mysql.exe';
            if (file_exists($mysqlBin) && function_exists('exec')) {
                $cmd = sprintf('"%s" -h%s -P%d -u%s %s < "%s"', 
                    $mysqlBin, 
                    $host, 
                    $port, 
                    $user, 
                    $dbname, 
                    $sqlFile
                );
                @exec($cmd, $out, $ret);
                if ($ret === 0) {
                    $imported = true;
                }
            }

            if (!$imported) {
                $sqlContent = file_get_contents($sqlFile);
                $pdo->exec($sqlContent);
            }
        }
    }

    // 5. Ensure account requests and email columns exist
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'email'")->fetchAll();
        if (empty($colCheck)) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `email` VARCHAR(150) NULL AFTER `full_name`;");
            $pdo->exec("UPDATE `users` SET `email` = 'admin@roberice.com' WHERE `username` = 'admin';");
            $pdo->exec("UPDATE `users` SET `email` = 'maria.santos@roberice.com' WHERE `username` = 'cashier1';");
            $pdo->exec("UPDATE `users` SET `email` = 'juan.delacruz@roberice.com' WHERE `username` = 'cashier2';");
            $pdo->exec("UPDATE `users` SET `email` = 'juan.inv@roberice.com' WHERE `username` = 'juan_inv';");
        }

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `account_requests` (
              `request_id` INT AUTO_INCREMENT PRIMARY KEY,
              `full_name` VARCHAR(100) NOT NULL,
              `username` VARCHAR(50) NOT NULL,
              `email` VARCHAR(150) NOT NULL,
              `password` VARCHAR(255) NOT NULL,
              `role` VARCHAR(50) NOT NULL DEFAULT 'Cashier',
              `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
              `rejection_reason` VARCHAR(255) DEFAULT NULL,
              `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `reviewed_at` DATETIME DEFAULT NULL,
              `reviewed_by` INT DEFAULT NULL,
              INDEX `idx_req_status` (`status`),
              INDEX `idx_req_username` (`username`),
              INDEX `idx_req_email` (`email`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `custom_roles` (
              `role_id` INT AUTO_INCREMENT PRIMARY KEY,
              `role_name` VARCHAR(50) NOT NULL UNIQUE,
              `default_permissions` TEXT DEFAULT NULL,
              `is_system` TINYINT(1) NOT NULL DEFAULT 0,
              `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        ");

        $crCols = $pdo->query("SHOW COLUMNS FROM `custom_roles` LIKE 'is_system'")->fetchAll();
        if (empty($crCols)) {
            $pdo->exec("ALTER TABLE `custom_roles` ADD COLUMN `is_system` TINYINT(1) NOT NULL DEFAULT 0 AFTER `default_permissions`;");
        }

        $standardRoles = [
            ['Admin', json_encode(["dashboard","pos","view-inventory","inventory","products","transactions","sales-report","file-manager","audit","users"])],
            ['Cashier', json_encode(["pos","view-inventory","transactions","sales-report"])],
            ['Inventory Clerk', json_encode(["view-inventory","inventory","products"])],
            ['Store Manager', json_encode(["dashboard","pos","view-inventory","products","transactions","sales-report","file-manager","audit"])]
        ];
        foreach ($standardRoles as $sr) {
            $rCheck = $pdo->prepare("SELECT role_id FROM `custom_roles` WHERE LOWER(role_name) = LOWER(?) LIMIT 1");
            $rCheck->execute([$sr[0]]);
            $foundR = $rCheck->fetch();
            if ($foundR) {
                $pdo->prepare("UPDATE `custom_roles` SET `is_system` = 1 WHERE `role_id` = ?")->execute([$foundR['role_id']]);
            } else {
                $pdo->prepare("INSERT INTO `custom_roles` (`role_name`, `default_permissions`, `is_system`, `created_at`) VALUES (?, ?, 1, NOW())")->execute([$sr[0], $sr[1]]);
            }
        }
    } catch (Exception $e) {
        // Schema already up to date
    }

    // CLI mode clean response
    if (php_sapi_name() === 'cli') {
        echo "[Roberice] Database initialization completed successfully.\n";
        echo "Database: {$dbname}\n";
        echo "Seed Data: roberice_db.sql (Data coverage: Oct 14, 2025 to Oct 21, 2026)\n";
        echo "Status: Ready for live system demonstration.\n";
        exit(0);
    }

    // Dynamic resolution of the login page path relative to project folder
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    $projectBase = dirname(dirname($requestUri));
    if ($projectBase === '/' || $projectBase === '\\') {
        $projectBase = '';
    }
    $loginUrl = $projectBase . '/pages/login.html';

    // Automatically load / redirect to login page immediately
    header("Location: {$loginUrl}");
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="0;url=<?= htmlspecialchars($loginUrl) ?>">
        <title>Database Ready - Roberice</title>
        <script>
            window.location.replace("<?= htmlspecialchars($loginUrl) ?>");
        </script>
    </head>
    <body style="font-family: system-ui, sans-serif; padding: 30px; text-align: center; color: #333;">
        <p>Database created successfully! Loading Roberice POS...</p>
        <p><a href="<?= htmlspecialchars($loginUrl) ?>">Click here if you are not redirected automatically</a></p>
    </body>
    </html>
    <?php
    exit;

} catch (PDOException $e) {
    if (php_sapi_name() === 'cli') {
        fwrite(STDERR, "[Roberice Error] Database Setup Error: " . $e->getMessage() . "\n");
        exit(1);
    }
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Database Setup Error</title>
        <style>
            body { font-family: system-ui, sans-serif; padding: 40px; background: #fff5f5; color: #7f1d1d; }
            .box { max-width: 600px; margin: 0 auto; background: white; padding: 25px; border-radius: 8px; border: 1px solid #fecaca; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            code { background: #fef2f2; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="box">
            <h3 style="margin-top:0;">Database Setup Error</h3>
            <p><strong>Error Details:</strong> <?= htmlspecialchars($e->getMessage()) ?></p>
            <p>Please make sure <strong>MySQL is running in XAMPP</strong> on port <code>3306</code>.</p>
        </div>
    </body>
    </html>
    <?php
    exit(1);
}
