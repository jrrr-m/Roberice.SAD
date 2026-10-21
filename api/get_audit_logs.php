<?php
header("Content-Type: application/json");
require_once "db.php";

try {
    // 1. Pagination parameters
    $isAll = isset($_GET['limit']) && strtolower($_GET['limit']) === 'all';
    $limit = $isAll ? 5000 : (isset($_GET['limit']) ? max(1, min(500, (int)$_GET['limit'])) : 150);
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    if (isset($_GET['page'])) {
        $page = max(1, (int)$_GET['page']);
        $offset = ($page - 1) * $limit;
    }

    $typeFilter = $_GET['type'] ?? 'all';
    $search = trim($_GET['search'] ?? '');
    $dateFilter = $_GET['date'] ?? 'all';

    // 2. High-performance aggregate KPI computation directly in SQL (O(1) memory)
    $kpiAdjStmt = $conn->query("
        SELECT 
            COUNT(*) AS total_adj,
            SUM(CASE WHEN adjustment_type = 'open_sack' THEN 1 ELSE 0 END) AS sacks_opened,
            SUM(CASE WHEN adjustment_type = 'batch_depleted' THEN 1 ELSE 0 END) AS batches_depleted,
            SUM(CASE WHEN adjustment_type = 'restock' THEN 1 ELSE 0 END) AS restocks
        FROM inventory_adjustment
    ");
    $kpiAdj = $kpiAdjStmt->fetch(PDO::FETCH_ASSOC);

    $totalSales = (int)$conn->query("SELECT COUNT(*) FROM sales_transaction WHERE transaction_status = 'Completed'")->fetchColumn();

    $totalEvents = ((int)($kpiAdj['total_adj'] ?? 0)) + $totalSales;
    $totalSacksOpened = (int)($kpiAdj['sacks_opened'] ?? 0);
    $totalBatchesDepleted = (int)($kpiAdj['batches_depleted'] ?? 0);
    $totalRestocks = (int)($kpiAdj['restocks'] ?? 0);

    // 3. Date filtering clause helper
    $dateAdjClause = "";
    $dateSaleClause = "";
    if ($dateFilter === 'today') {
        $dateAdjClause = "AND DATE(a.adjustment_date) = CURDATE()";
        $dateSaleClause = "AND DATE(s.transaction_date) = CURDATE()";
    } elseif ($dateFilter === 'week') {
        $dateAdjClause = "AND a.adjustment_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        $dateSaleClause = "AND s.transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    } elseif ($dateFilter === 'month') {
        $dateAdjClause = "AND a.adjustment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        $dateSaleClause = "AND s.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    }

    $adjustments = [];
    $sales = [];

    // 4. Selective fetching based on $typeFilter
    if ($typeFilter !== 'sale') {
        $adjWhere = "1=1 $dateAdjClause";
        $adjParams = [];

        if ($typeFilter !== 'all') {
            $adjWhere .= " AND a.adjustment_type = ?";
            $adjParams[] = $typeFilter;
        }

        if ($search !== '') {
            $adjWhere .= " AND (CONCAT('ADJ-', a.adjustment_id) LIKE ? OR p.product_name LIKE ? OR a.batch_code LIKE ? OR a.performed_by LIKE ? OR a.note LIKE ?)";
            $wild = "%{$search}%";
            $adjParams[] = $wild;
            $adjParams[] = $wild;
            $adjParams[] = $wild;
            $adjParams[] = $wild;
            $adjParams[] = $wild;
        }

        // Limit query to needed window
        $queryAdj = "
            SELECT 
                a.adjustment_id,
                a.adjustment_date,
                a.adjustment_type,
                a.batch_code,
                a.sacks,
                a.kg,
                a.note,
                a.performed_by,
                p.product_id,
                p.product_name,
                p.origin,
                p.rice_type
            FROM inventory_adjustment a
            LEFT JOIN product p ON a.product_id = p.product_id
            WHERE $adjWhere
            ORDER BY a.adjustment_date DESC, a.adjustment_id DESC
            LIMIT " . ($limit + $offset) . "
        ";
        $adjStmt = $conn->prepare($queryAdj);
        $adjStmt->execute($adjParams);
        $adjustments = $adjStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    if ($typeFilter === 'all' || $typeFilter === 'sale') {
        $saleWhere = "s.transaction_status = 'Completed' $dateSaleClause";
        $saleParams = [];

        if ($search !== '') {
            $saleWhere .= " AND (CONCAT('REC-', LPAD(s.transaction_id, 6, '0')) LIKE ? OR u.full_name LIKE ? OR u.username LIKE ? OR s.payment_method LIKE ?)";
            $wild = "%{$search}%";
            $saleParams[] = $wild;
            $saleParams[] = $wild;
            $saleParams[] = $wild;
            $saleParams[] = $wild;
        }

        $querySales = "
            SELECT 
                s.transaction_id,
                s.transaction_date,
                s.total_amount,
                s.payment_method,
                COALESCE(u.full_name, 'Cashier') AS cashier_name,
                COUNT(ti.transaction_item_id) AS item_count,
                GROUP_CONCAT(CONCAT(p.product_name, ' (', ti.quantity, ' ', ti.unit, ')') SEPARATOR ', ') AS item_summary
            FROM sales_transaction s
            LEFT JOIN users u ON s.user_id = u.user_id
            LEFT JOIN transaction_item ti ON s.transaction_id = ti.transaction_id
            LEFT JOIN product p ON ti.product_id = p.product_id
            WHERE $saleWhere
            GROUP BY s.transaction_id
            ORDER BY s.transaction_date DESC
            LIMIT " . ($limit + $offset) . "
        ";
        $salesStmt = $conn->prepare($querySales);
        $salesStmt->execute($saleParams);
        $sales = $salesStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $logs = [];

    // Format adjustments
    foreach ($adjustments as $a) {
        $type = $a['adjustment_type'];
        $label = ucfirst($type);
        $category = 'Inventory';
        $badgeClass = 'badge-secondary';
        $qtyImpact = '';

        if ($type === 'open_sack') {
            $label = 'Sack Opened';
            $category = 'Packaging';
            $badgeClass = 'badge-open-sack';
            $qtyImpact = "-{$a['sacks']} Sack(s) → +{$a['kg']} kg Loose";
        } elseif ($type === 'batch_depleted') {
            $label = 'Batch Depleted';
            $category = 'Batch Lifecycle';
            $badgeClass = 'badge-danger';
            $qtyImpact = '0 kg Remaining (Depleted)';
        } elseif ($type === 'restock') {
            $label = 'Restock / Arrival';
            $category = 'Supply';
            $badgeClass = 'badge-success';
            $qtyImpact = "+{$a['sacks']} Sacks / +{$a['kg']} kg";
        } elseif ($type === 'spoilage') {
            $label = 'Spoilage / Damage';
            $category = 'Loss';
            $badgeClass = 'badge-danger';
            $qtyImpact = "-{$a['sacks']} Sacks / -{$a['kg']} kg";
        } elseif ($type === 'repack') {
            $label = 'Repackaging';
            $category = 'Packaging';
            $badgeClass = 'badge-info';
            $qtyImpact = "Repacked into retail bags";
        } elseif ($type === 'correction') {
            $label = 'Count Correction';
            $category = 'Audit';
            $badgeClass = 'badge-warning';
            $qtyImpact = "Recalibrated: {$a['sacks']} Sacks, {$a['kg']} kg";
        }

        $logs[] = [
            'id' => 'ADJ-' . $a['adjustment_id'],
            'raw_date' => $a['adjustment_date'],
            'date_formatted' => date('M d, Y h:i A', strtotime($a['adjustment_date'])),
            'type' => $type,
            'label' => $label,
            'category' => $category,
            'badge_class' => $badgeClass,
            'product_name' => $a['product_name'] ?? 'System',
            'origin' => $a['origin'] ?? '',
            'batch_code' => $a['batch_code'] ?? 'N/A',
            'qty_impact' => $qtyImpact,
            'note' => $a['note'] ?? 'No notes provided',
            'user' => $a['performed_by'] ?? 'System'
        ];
    }

    // Format sales
    foreach ($sales as $s) {
        $logs[] = [
            'id' => 'REC-' . str_pad($s['transaction_id'], 6, '0', STR_PAD_LEFT),
            'raw_date' => $s['transaction_date'],
            'date_formatted' => date('M d, Y h:i A', strtotime($s['transaction_date'])),
            'type' => 'sale',
            'label' => 'POS Sale',
            'category' => 'Sales',
            'badge_class' => 'badge-sale',
            'product_name' => $s['item_summary'] ?: 'General Sale',
            'origin' => '',
            'batch_code' => 'Receipt #' . $s['transaction_id'],
            'qty_impact' => '₱' . number_format((float)$s['total_amount'], 2),
            'note' => 'Payment via ' . $s['payment_method'] . ' (' . $s['item_count'] . ' item(s))',
            'user' => $s['cashier_name']
        ];
    }

    // Sort combined window newest first
    usort($logs, function ($a, $b) {
        return strtotime($b['raw_date']) - strtotime($a['raw_date']);
    });

    // Apply offset and limit to the sorted window
    $paginatedLogs = array_slice($logs, $offset, $limit);

    header("X-Total-Events: " . $totalEvents);
    header("X-Limit: " . $limit);
    header("X-Offset: " . $offset);

    echo json_encode([
        'success' => true,
        'summary' => [
            'total_events' => $totalEvents,
            'sacks_opened' => $totalSacksOpened,
            'batches_depleted' => $totalBatchesDepleted,
            'restocks' => $totalRestocks
        ],
        'total' => count($logs),
        'limit' => $limit,
        'offset' => $offset,
        'logs' => $paginatedLogs
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
