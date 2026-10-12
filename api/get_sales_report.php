<?php
header("Content-Type: application/json");
require_once "db.php";

$reportType = trim($_GET["report_type"] ?? "");
$dailyDate = trim($_GET["daily_date"] ?? $_GET["date"] ?? "");
$week = trim($_GET["week"] ?? "");
$quarter = trim($_GET["quarter"] ?? "");
$year = trim($_GET["year"] ?? "");
$month = trim($_GET["month"] ?? "");
$startDate = trim($_GET["start_date"] ?? "");
$endDate = trim($_GET["end_date"] ?? "");
$cashierId = trim($_GET["cashier_id"] ?? "all");
$paymentMethod = trim($_GET["payment_method"] ?? "all");
$origin = trim($_GET["origin"] ?? "all");
$riceType = trim($_GET["rice_type"] ?? "all");

// Date filtering logic
$dateConditions = [];
$dateParams = [];
$periodLabel = "All Recorded History";
$reportTitle = "OFFICIAL SALES SUMMARY STATEMENT";

if ($reportType === "daily" || (!empty($dailyDate) && empty($reportType))) {
    $targetDate = !empty($dailyDate) ? $dailyDate : date("Y-m-d");
    $dateConditions[] = "DATE(t.transaction_date) = ?";
    $dateParams[] = $targetDate;
    $time = strtotime($targetDate);
    $periodLabel = "Daily: " . date("l, F d, Y", $time);
    $reportTitle = "OFFICIAL DAILY SALES REPORT";
} elseif ($reportType === "weekly" || (!empty($week) && empty($reportType))) {
    if (!empty($week) && preg_match('/^(\d{4})-W(\d{1,2})$/', $week, $m)) {
        $wYear = (int)$m[1];
        $wNum = (int)$m[2];
        $dto = new DateTime();
        $dto->setISODate($wYear, $wNum, 1);
        $wStart = $dto->format('Y-m-d');
        $dto->modify('+6 days');
        $wEnd = $dto->format('Y-m-d');
        $periodLabel = "Weekly: " . date("M d, Y", strtotime($wStart)) . " to " . date("M d, Y", strtotime($wEnd)) . " (Week {$wNum}, {$wYear})";
    } elseif (!empty($startDate) && !empty($endDate)) {
        $wStart = $startDate;
        $wEnd = $endDate;
        $periodLabel = "Weekly: " . date("M d, Y", strtotime($wStart)) . " to " . date("M d, Y", strtotime($wEnd));
    } else {
        $dto = new DateTime();
        $wStart = (clone $dto)->modify('this week monday')->format('Y-m-d');
        $wEnd = (clone $dto)->modify('this week sunday')->format('Y-m-d');
        $wNum = (int)$dto->format('W');
        $wYear = (int)$dto->format('Y');
        $periodLabel = "Weekly: " . date("M d, Y", strtotime($wStart)) . " to " . date("M d, Y", strtotime($wEnd)) . " (Week {$wNum}, {$wYear})";
    }
    $dateConditions[] = "DATE(t.transaction_date) BETWEEN ? AND ?";
    $dateParams[] = $wStart;
    $dateParams[] = $wEnd;
    $reportTitle = "OFFICIAL WEEKLY SALES REPORT";
} elseif ($reportType === "monthly" || (!empty($month) && empty($reportType))) {
    $targetMonth = !empty($month) ? $month : date("Y-m");
    $dateConditions[] = "DATE_FORMAT(t.transaction_date, '%Y-%m') = ?";
    $dateParams[] = $targetMonth;
    $time = strtotime($targetMonth . "-01");
    $periodLabel = "Monthly: " . date("F Y", $time);
    $reportTitle = "OFFICIAL MONTHLY SALES REPORT";
} elseif ($reportType === "quarterly" || (!empty($quarter) && empty($reportType))) {
    $q = (int)($quarter ?: 1);
    if ($q < 1 || $q > 4) $q = 1;
    $y = (int)($year ?: date("Y"));

    $quarterMap = [
        1 => ["start" => "01-01", "end" => "03-31", "label" => "Q1 (Jan 1 – Mar 31)"],
        2 => ["start" => "04-01", "end" => "06-30", "label" => "Q2 (Apr 1 – Jun 30)"],
        3 => ["start" => "07-01", "end" => "09-30", "label" => "Q3 (Jul 1 – Sep 30)"],
        4 => ["start" => "10-01", "end" => "12-31", "label" => "Q4 (Oct 1 – Dec 31)"],
    ];

    $qStart = "{$y}-{$quarterMap[$q]['start']}";
    $qEnd = "{$y}-{$quarterMap[$q]['end']}";
    $dateConditions[] = "DATE(t.transaction_date) BETWEEN ? AND ?";
    $dateParams[] = $qStart;
    $dateParams[] = $qEnd;
    $periodLabel = "Quarterly: {$quarterMap[$q]['label']}, {$y}";
    $reportTitle = "OFFICIAL QUARTERLY SALES REPORT";
} elseif ($reportType === "yearly" || (!empty($year) && empty($reportType) && empty($month) && empty($quarter))) {
    $y = (int)($year ?: date("Y"));
    $dateConditions[] = "YEAR(t.transaction_date) = ?";
    $dateParams[] = $y;
    $periodLabel = "Yearly: Full Year {$y} (Jan 01 – Dec 31, {$y})";
    $reportTitle = "OFFICIAL YEARLY SALES REPORT";
} elseif (!empty($startDate) && !empty($endDate)) {
    $dateConditions[] = "DATE(t.transaction_date) BETWEEN ? AND ?";
    $dateParams[] = $startDate;
    $dateParams[] = $endDate;
    $periodLabel = "Custom: " . date("M d, Y", strtotime($startDate)) . " to " . date("M d, Y", strtotime($endDate));
    $reportTitle = "OFFICIAL CUSTOM SALES REPORT";
} elseif (!empty($startDate)) {
    $dateConditions[] = "DATE(t.transaction_date) >= ?";
    $dateParams[] = $startDate;
    $periodLabel = "From " . date("M d, Y", strtotime($startDate));
    $reportTitle = "OFFICIAL SALES REPORT";
} elseif (!empty($endDate)) {
    $dateConditions[] = "DATE(t.transaction_date) <= ?";
    $dateParams[] = $endDate;
    $periodLabel = "Up to " . date("M d, Y", strtotime($endDate));
    $reportTitle = "OFFICIAL SALES REPORT";
}

try {
    // Build SQL query for transactions
    $where = ["t.transaction_status = 'Completed'"];
    $params = [];

    foreach ($dateConditions as $dc) {
        $where[] = $dc;
    }
    foreach ($dateParams as $dp) {
        $params[] = $dp;
    }

    if ($cashierId !== "" && $cashierId !== "all") {
        $where[] = "t.user_id = ?";
        $params[] = $cashierId;
    }

    if ($paymentMethod !== "" && $paymentMethod !== "all") {
        $where[] = "t.payment_method = ?";
        $params[] = $paymentMethod;
    }

    $whereSql = implode(" AND ", $where);

    // Fetch transactions
    $txnSql = "
        SELECT
            t.transaction_id,
            t.transaction_date,
            t.total_amount,
            t.payment_amount,
            t.change_amount,
            t.payment_method,
            t.transaction_status,
            u.user_id,
            u.username,
            u.full_name AS cashier_name
        FROM sales_transaction t
        JOIN users u ON t.user_id = u.user_id
        WHERE $whereSql
        ORDER BY t.transaction_date DESC
    ";

    $stmt = $conn->prepare($txnSql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch items for each transaction and aggregate
    $totalRevenue = 0;
    $totalCash = 0;
    $totalNonCash = 0;
    $totalSacksSold = 0;
    $total25kgPacks = 0;
    $total20kgPacks = 0;
    $total10kgPacks = 0;
    $total5kgPacks = 0;
    $totalTinatakalKg = 0;
    $totalVolumeKg = 0;

    $varietyStats = [];
    $cashierStats = [];
    $paymentStats = [];
    $dailyStats = [];

    foreach ($transactions as &$txn) {
        $tId = (int)$txn["transaction_id"];
        $amt = (float)$txn["total_amount"];
        $totalRevenue += $amt;

        if ($txn["payment_method"] === "Cash") {
            $totalCash += $amt;
        } else {
            $totalNonCash += $amt;
        }

        // Daily trend grouping
        $dayKey = date("Y-m-d", strtotime($txn["transaction_date"]));
        if (!isset($dailyStats[$dayKey])) {
            $dailyStats[$dayKey] = ["date" => $dayKey, "sales" => 0, "count" => 0];
        }
        $dailyStats[$dayKey]["sales"] += $amt;
        $dailyStats[$dayKey]["count"] += 1;

        // Cashier breakdown
        $cName = $txn["cashier_name"];
        if (!isset($cashierStats[$cName])) {
            $cashierStats[$cName] = ["cashier" => $cName, "sales" => 0, "transactions" => 0];
        }
        $cashierStats[$cName]["sales"] += $amt;
        $cashierStats[$cName]["transactions"] += 1;

        // Payment breakdown
        $pMethod = $txn["payment_method"];
        if (!isset($paymentStats[$pMethod])) {
            $paymentStats[$pMethod] = ["method" => $pMethod, "sales" => 0, "transactions" => 0];
        }
        $paymentStats[$pMethod]["sales"] += $amt;
        $paymentStats[$pMethod]["transactions"] += 1;

        // Fetch transaction items
        $itemStmt = $conn->prepare("
            SELECT
                ti.transaction_item_id,
                ti.product_id,
                ti.unit,
                ti.quantity,
                ti.unit_price,
                ti.subtotal,
                p.product_name,
                p.category,
                p.origin,
                p.rice_type,
                p.kg_per_sack
            FROM transaction_item ti
            JOIN product p ON ti.product_id = p.product_id
            WHERE ti.transaction_id = ?
        ");
        $itemStmt->execute([$tId]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        $txn["items"] = $items;

        foreach ($items as $item) {
            $pId = (int)$item["product_id"];
            $pName = $item["product_name"];
            $unit = strtolower(trim($item["unit"]));
            $qty = (float)$item["quantity"];
            $subtotal = (float)$item["subtotal"];
            $kgPerSack = (float)($item["kg_per_sack"] ?: 50);

            if (!isset($varietyStats[$pId])) {
                $varietyStats[$pId] = [
                    "product_id" => $pId,
                    "name" => $pName,
                    "category" => $item["category"],
                    "origin" => $item["origin"],
                    "rice_type" => $item["rice_type"],
                    "sacks" => 0,
                    "packs_25kg" => 0,
                    "packs_20kg" => 0,
                    "packs_10kg" => 0,
                    "packs_5kg" => 0,
                    "tinatakal_kg" => 0,
                    "total_kg" => 0,
                    "revenue" => 0
                ];
            }

            $varietyStats[$pId]["revenue"] += $subtotal;

            if ($unit === "sack" || $unit === "50kg") {
                $totalSacksSold += $qty;
                $varietyStats[$pId]["sacks"] += $qty;
                $itemKg = $qty * 50.0;
            } elseif ($unit === "25kg" || $unit === "half_sack" || $unit === "half") {
                $total25kgPacks += $qty;
                $varietyStats[$pId]["packs_25kg"] += $qty;
                $itemKg = $qty * 25.0;
            } elseif ($unit === "20kg") {
                $total20kgPacks += $qty;
                $varietyStats[$pId]["packs_20kg"] += $qty;
                $itemKg = $qty * 20.0;
            } elseif ($unit === "10kg") {
                $total10kgPacks += $qty;
                $varietyStats[$pId]["packs_10kg"] += $qty;
                $itemKg = $qty * 10.0;
            } elseif ($unit === "5kg") {
                $total5kgPacks += $qty;
                $varietyStats[$pId]["packs_5kg"] += $qty;
                $itemKg = $qty * 5.0;
            } else {
                // tinatakal / kg
                $totalTinatakalKg += $qty;
                $varietyStats[$pId]["tinatakal_kg"] += $qty;
                $itemKg = $qty;
            }

            $varietyStats[$pId]["total_kg"] += $itemKg;
            $totalVolumeKg += $itemKg;
        }
    }

    // Filter varieties by origin and rice_type if requested
    $varietyList = array_values($varietyStats);
    if ($origin !== "all") {
        $varietyList = array_filter($varietyList, fn($v) => strtolower($v["origin"]) === strtolower($origin));
    }
    if ($riceType !== "all") {
        $varietyList = array_filter($varietyList, fn($v) => strtolower($v["rice_type"]) === strtolower($riceType));
    }

    // Sort varieties by revenue descending
    usort($varietyList, fn($a, $b) => $b["revenue"] <=> $a["revenue"]);

    // Calculate percentage share
    foreach ($varietyList as &$v) {
        $v["percentage"] = $totalRevenue > 0 ? round(($v["revenue"] / $totalRevenue) * 100, 1) : 0;
    }

    // Sort daily stats chronologically
    ksort($dailyStats);

    $txnCount = count($transactions);
    $avgTxn = $txnCount > 0 ? round($totalRevenue / $txnCount, 2) : 0;

    echo json_encode([
        "success" => true,
        "reportType" => $reportType,
        "reportTitle" => $reportTitle,
        "periodLabel" => $periodLabel,
        "summary" => [
            "totalRevenue" => $totalRevenue,
            "totalTransactions" => $txnCount,
            "averageTransaction" => $avgTxn,
            "totalCash" => $totalCash,
            "totalNonCash" => $totalNonCash,
            "totalSacksSold" => $totalSacksSold,
            "total25kgPacks" => $total25kgPacks,
            "total20kgPacks" => $total20kgPacks,
            "total10kgPacks" => $total10kgPacks,
            "total5kgPacks" => $total5kgPacks,
            "totalTinatakalKg" => round($totalTinatakalKg, 2),
            "totalVolumeKg" => round($totalVolumeKg, 2)
        ],
        "varietyBreakdown" => array_values($varietyList),
        "cashierBreakdown" => array_values($cashierStats),
        "paymentBreakdown" => array_values($paymentStats),
        "dailyTrend" => array_values($dailyStats),
        "transactions" => $transactions
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
?>
