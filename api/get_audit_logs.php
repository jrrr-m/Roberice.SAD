<?php
header("Content-Type: application/json");
require_once "db.php";

try {
    $typeFilter = $_GET['type'] ?? 'all';
    $search = trim($_GET['search'] ?? '');
    $dateFilter = $_GET['date'] ?? 'all';

    // 1. Fetch from inventory_adjustment joined with product
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
        ORDER BY a.adjustment_date DESC, a.adjustment_id DESC
    ";
    $adjStmt = $conn->prepare($queryAdj);
    $adjStmt->execute();
    $adjustments = $adjStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch from sales_transaction joined with users and transaction items
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
        WHERE s.transaction_status = 'Completed'
        GROUP BY s.transaction_id
        ORDER BY s.transaction_date DESC
    ";
    $salesStmt = $conn->prepare($querySales);
    $salesStmt->execute();
    $sales = $salesStmt->fetchAll(PDO::FETCH_ASSOC);

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

    // Sort all logs newest first
    usort($logs, function ($a, $b) {
        return strtotime($b['raw_date']) - strtotime($a['raw_date']);
    });

    // Summary KPIs
    $totalEvents = count($logs);
    $totalSacksOpened = 0;
    $totalBatchesDepleted = 0;
    $totalRestocks = 0;

    foreach ($adjustments as $a) {
        if ($a['adjustment_type'] === 'open_sack') $totalSacksOpened++;
        elseif ($a['adjustment_type'] === 'batch_depleted') $totalBatchesDepleted++;
        elseif ($a['adjustment_type'] === 'restock') $totalRestocks++;
    }

    echo json_encode([
        'success' => true,
        'summary' => [
            'total_events' => $totalEvents,
            'sacks_opened' => $totalSacksOpened,
            'batches_depleted' => $totalBatchesDepleted,
            'restocks' => $totalRestocks
        ],
        'logs' => $logs
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
