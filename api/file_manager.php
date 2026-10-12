<?php
header("Content-Type: application/json");
require_once "db.php";

$action = $_GET["action"] ?? $_POST["action"] ?? "list";
$uploadsDir = __DIR__ . "/../uploads";

if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0777, true);
}

try {
    if ($action === "list") {
        $category = trim($_GET["category"] ?? "all");
        $search = trim($_GET["search"] ?? "");

        $sql = "SELECT file_id, file_name, original_name, file_path, file_size, file_type, category, description, uploaded_by, uploaded_at FROM file_records";
        $where = [];
        $params = [];

        if ($category !== "" && $category !== "all") {
            $where[] = "category = ?";
            $params[] = $category;
        }

        if ($search !== "") {
            $where[] = "(original_name LIKE ? OR description LIKE ? OR category LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $sql .= " ORDER BY uploaded_at DESC, file_id DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate total files and total storage
        $totalSizeStmt = $conn->query("SELECT COUNT(*) AS total_count, COALESCE(SUM(file_size), 0) AS total_size FROM file_records");
        $stats = $totalSizeStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "stats" => [
                "totalFiles" => (int)$stats["total_count"],
                "totalSize" => (int)$stats["total_size"]
            ],
            "files" => $files
        ]);
        exit;
    }

    if ($action === "upload") {
        if (!isset($_FILES["file"]) || $_FILES["file"]["error"] !== UPLOAD_ERR_OK) {
            echo json_encode(["success" => false, "message" => "No file uploaded or upload error occurred."]);
            exit;
        }

        $file = $_FILES["file"];
        $origName = basename($file["name"]);
        $fileSize = (int)$file["size"];
        $fileType = $file["type"] ?: "application/octet-stream";
        $category = trim($_POST["category"] ?? "Document");
        $description = trim($_POST["description"] ?? "");
        $uploader = trim($_POST["uploader"] ?? "Admin User");

        // Generate safe unique stored filename
        $ext = pathinfo($origName, PATHINFO_EXTENSION);
        $cleanBase = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
        $storedName = $cleanBase . "_" . date("Ymd_His") . ($ext ? "." . $ext : "");
        $destPath = $uploadsDir . "/" . $storedName;
        $relPath = "uploads/" . $storedName;

        if (!move_uploaded_file($file["tmp_name"], $destPath)) {
            echo json_encode(["success" => false, "message" => "Failed to save uploaded file."]);
            exit;
        }

        $stmt = $conn->prepare("
            INSERT INTO file_records
            (file_name, original_name, file_path, file_size, file_type, category, description, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $storedName,
            $origName,
            $relPath,
            $fileSize,
            $fileType,
            $category,
            $description,
            $uploader
        ]);

        echo json_encode([
            "success" => true,
            "message" => "File uploaded successfully.",
            "fileId" => $conn->lastInsertId()
        ]);
        exit;
    }

    if ($action === "backup_db") {
        $backupName = "roberice_db_backup_" . date("Ymd_His") . ".sql";
        $destPath = $uploadsDir . "/" . $backupName;
        $relPath = "uploads/" . $backupName;

        // Run mysqldump
        $mysqldumpPath = "C:\\xampp\\mysql\\bin\\mysqldump.exe";
        if (file_exists($mysqldumpPath)) {
            $cmd = "\"$mysqldumpPath\" -u root --default-character-set=utf8mb4 roberice_db > \"$destPath\"";
            exec($cmd, $output, $returnVar);
        }

        // If exec didn't write or failed, create portable SQL backup via PHP PDO
        if (!file_exists($destPath) || filesize($destPath) === 0) {
            $tables = ["users", "product", "inventory", "inventory_adjustment", "sales_transaction", "transaction_item", "file_records"];
            $dumpContent = "-- Roberice Database Auto-Backup\n-- Generated on " . date("Y-m-d H:i:s") . "\n\n";

            foreach ($tables as $t) {
                $createStmt = $conn->query("SHOW CREATE TABLE `$t`")->fetch(PDO::FETCH_NUM);
                $dumpContent .= "DROP TABLE IF EXISTS `$t`;\n" . $createStmt[1] . ";\n\n";

                $rows = $conn->query("SELECT * FROM `$t`")->fetchAll(PDO::FETCH_ASSOC);
                if (!empty($rows)) {
                    foreach ($rows as $row) {
                        $keys = array_keys($row);
                        $vals = array_map(function($v) use ($conn) {
                            return is_null($v) ? "NULL" : $conn->quote($v);
                        }, array_values($row));
                        $dumpContent .= "INSERT INTO `$t` (`" . implode("`, `", $keys) . "`) VALUES (" . implode(", ", $vals) . ");\n";
                    }
                    $dumpContent .= "\n";
                }
            }
            file_put_contents($destPath, $dumpContent);
        }

        $fileSize = filesize($destPath);
        $uploader = trim($_POST["uploader"] ?? "Admin User");

        $stmt = $conn->prepare("
            INSERT INTO file_records
            (file_name, original_name, file_path, file_size, file_type, category, description, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, 'application/sql', 'Database Backup', 'Automated SQL database full snapshot and schema backup.', ?, NOW())
        ");
        $stmt->execute([
            $backupName,
            $backupName,
            $relPath,
            $fileSize,
            $uploader
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Database backup created successfully.",
            "file" => $backupName,
            "size" => $fileSize
        ]);
        exit;
    }

    if ($action === "export_sales") {
        $reportType = trim($_POST["report_type"] ?? "");
        $dailyDate = trim($_POST["daily_date"] ?? $_POST["date"] ?? "");
        $week = trim($_POST["week"] ?? "");
        $quarter = trim($_POST["quarter"] ?? "");
        $year = trim($_POST["year"] ?? "");
        $month = trim($_POST["month"] ?? "");
        $startDate = trim($_POST["start_date"] ?? "");
        $endDate = trim($_POST["end_date"] ?? "");
        $cashierId = trim($_POST["cashier_id"] ?? "all");
        $paymentMethod = trim($_POST["payment_method"] ?? "all");
        $origin = trim($_POST["origin"] ?? "all");

        $where = ["t.transaction_status = 'Completed'"];
        $params = [];
        $typeLabel = "Report";

        if ($reportType === "daily" || (!empty($dailyDate) && empty($reportType))) {
            $targetDate = !empty($dailyDate) ? $dailyDate : date("Y-m-d");
            $where[] = "DATE(t.transaction_date) = ?";
            $params[] = $targetDate;
            $typeLabel = "Daily_" . $targetDate;
        } elseif ($reportType === "weekly" || (!empty($week) && empty($reportType))) {
            if (!empty($week) && preg_match('/^(\d{4})-W(\d{1,2})$/', $week, $m)) {
                $wYear = (int)$m[1];
                $wNum = (int)$m[2];
                $dto = new DateTime();
                $dto->setISODate($wYear, $wNum, 1);
                $wStart = $dto->format('Y-m-d');
                $dto->modify('+6 days');
                $wEnd = $dto->format('Y-m-d');
                $typeLabel = "Weekly_W{$wNum}_{$wYear}";
            } elseif (!empty($startDate) && !empty($endDate)) {
                $wStart = $startDate;
                $wEnd = $endDate;
                $typeLabel = "Weekly_" . $startDate . "_" . $endDate;
            } else {
                $dto = new DateTime();
                $wStart = (clone $dto)->modify('this week monday')->format('Y-m-d');
                $wEnd = (clone $dto)->modify('this week sunday')->format('Y-m-d');
                $typeLabel = "Weekly_" . $dto->format('Y_W');
            }
            $where[] = "DATE(t.transaction_date) BETWEEN ? AND ?";
            $params[] = $wStart;
            $params[] = $wEnd;
        } elseif ($reportType === "monthly" || (!empty($month) && empty($reportType))) {
            $targetMonth = !empty($month) ? $month : date("Y-m");
            $where[] = "DATE_FORMAT(t.transaction_date, '%Y-%m') = ?";
            $params[] = $targetMonth;
            $typeLabel = "Monthly_" . $targetMonth;
        } elseif ($reportType === "quarterly" || (!empty($quarter) && empty($reportType))) {
            $q = (int)($quarter ?: 1);
            if ($q < 1 || $q > 4) $q = 1;
            $y = (int)($year ?: date("Y"));
            $quarterMap = [
                1 => ["start" => "01-01", "end" => "03-31"],
                2 => ["start" => "04-01", "end" => "06-30"],
                3 => ["start" => "07-01", "end" => "09-30"],
                4 => ["start" => "10-01", "end" => "12-31"],
            ];
            $where[] = "DATE(t.transaction_date) BETWEEN ? AND ?";
            $params[] = "{$y}-{$quarterMap[$q]['start']}";
            $params[] = "{$y}-{$quarterMap[$q]['end']}";
            $typeLabel = "Quarterly_Q{$q}_{$y}";
        } elseif ($reportType === "yearly" || (!empty($year) && empty($reportType) && empty($month) && empty($quarter))) {
            $y = (int)($year ?: date("Y"));
            $where[] = "YEAR(t.transaction_date) = ?";
            $params[] = $y;
            $typeLabel = "Yearly_" . $y;
        } elseif (!empty($startDate) && !empty($endDate)) {
            $where[] = "DATE(t.transaction_date) BETWEEN ? AND ?";
            $params[] = $startDate;
            $params[] = $endDate;
            $typeLabel = "Custom_" . $startDate . "_" . $endDate;
        }

        if ($cashierId !== "" && $cashierId !== "all") {
            $where[] = "t.user_id = ?";
            $params[] = $cashierId;
        }

        if ($paymentMethod !== "" && $paymentMethod !== "all") {
            $where[] = "t.payment_method = ?";
            $params[] = $paymentMethod;
        }

        if ($origin !== "" && $origin !== "all") {
            $where[] = "p.origin = ?";
            $params[] = $origin;
        }

        $whereSql = implode(" AND ", $where);
        $exportName = "sales_export_" . $typeLabel . "_" . date("Ymd_His") . ".csv";
        $destPath = $uploadsDir . "/" . $exportName;
        $relPath = "uploads/" . $exportName;

        $fp = fopen($destPath, "w");
        fputcsv($fp, [
            "Transaction ID",
            "Date",
            "Cashier",
            "Product Name",
            "Rice Type",
            "Origin",
            "Unit / Packaging",
            "Quantity",
            "Unit Price",
            "Subtotal",
            "Payment Method",
            "Total Amount"
        ]);

        $sql = "
            SELECT
                t.transaction_id,
                t.transaction_date,
                u.full_name AS cashier_name,
                p.product_name,
                p.rice_type,
                p.origin,
                ti.unit,
                ti.quantity,
                ti.unit_price,
                ti.subtotal,
                t.payment_method,
                t.total_amount
            FROM sales_transaction t
            JOIN users u ON t.user_id = u.user_id
            JOIN transaction_item ti ON t.transaction_id = ti.transaction_id
            JOIN product p ON ti.product_id = p.product_id
            WHERE $whereSql
            ORDER BY t.transaction_date DESC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            fputcsv($fp, [
                "TXN-" . str_pad($r["transaction_id"], 4, "0", STR_PAD_LEFT),
                $r["transaction_date"],
                $r["cashier_name"],
                $r["product_name"],
                $r["rice_type"],
                $r["origin"],
                $r["unit"],
                $r["quantity"],
                $r["unit_price"],
                $r["subtotal"],
                $r["payment_method"],
                $r["total_amount"]
            ]);
        }
        fclose($fp);

        $fileSize = filesize($destPath);
        $uploader = trim($_POST["uploader"] ?? "Admin User");

        $stmt = $conn->prepare("
            INSERT INTO file_records
            (file_name, original_name, file_path, file_size, file_type, category, description, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, 'text/csv', 'Sales Report', 'CSV export of all sales transactions and line items.', ?, NOW())
        ");
        $stmt->execute([
            $exportName,
            $exportName,
            $relPath,
            $fileSize,
            $uploader
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Sales CSV report generated successfully.",
            "file" => $exportName,
            "size" => $fileSize
        ]);
        exit;
    }

    if ($action === "delete") {
        $data = json_decode(file_get_contents("php://input"), true);
        $fileId = (int)($data["fileId"] ?? $_POST["fileId"] ?? 0);

        $stmt = $conn->prepare("SELECT file_path FROM file_records WHERE file_id = ?");
        $stmt->execute([$fileId]);
        $rec = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($rec) {
            $absPath = __DIR__ . "/../" . $rec["file_path"];
            if (file_exists($absPath)) {
                @unlink($absPath);
            }
            $delStmt = $conn->prepare("DELETE FROM file_records WHERE file_id = ?");
            $delStmt->execute([$fileId]);

            echo json_encode(["success" => true, "message" => "File removed successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "File record not found."]);
        }
        exit;
    }

    echo json_encode(["success" => false, "message" => "Invalid action."]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
