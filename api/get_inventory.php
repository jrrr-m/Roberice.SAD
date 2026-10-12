<?php
header("Content-Type: application/json");
require_once "db.php";

try {
    // Check if inventory_batch table exists
    $hasBatchesTable = false;
    $check = $conn->query("SHOW TABLES LIKE 'inventory_batch'")->fetchAll();
    if (count($check) > 0) {
        $hasBatchesTable = true;
    }

    $stmt = $conn->prepare("
        SELECT
            p.product_id,
            p.product_name,
            p.category,
            p.origin,
            p.rice_type,
            p.kg_per_sack,
            p.price_sack,
            p.price_25kg,
            p.price_kg,
            p.price_5kg,
            p.price_10kg,
            p.price_20kg,
            i.inventory_id,
            i.stock_sacks,
            i.packaged_25kg,
            i.stock_kg,
            i.packaged_5kg,
            i.packaged_10kg,
            i.packaged_20kg,
            i.received_date,
            i.batch_number,
            DATEDIFF(CURRENT_DATE, COALESCE(i.received_date, CURRENT_DATE)) AS days_old,
            i.reorder_level_kg,
            i.last_updated
        FROM product p
        LEFT JOIN inventory i ON p.product_id = i.product_id
        WHERE p.product_status = 'Active'
        ORDER BY p.product_name
    ");
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($hasBatchesTable) {
        // Query only active batches that have stock > 0
        $batchStmt = $conn->prepare("
            SELECT
                b.batch_id,
                b.product_id,
                b.batch_code,
                b.received_date,
                DATEDIFF(CURRENT_DATE, b.received_date) AS days_old,
                b.stock_sacks,
                b.packaged_25kg,
                b.packaged_20kg,
                b.packaged_10kg,
                b.packaged_5kg,
                b.stock_kg,
                ((b.stock_sacks * 50) + (b.packaged_25kg * 25) + (b.packaged_20kg * 20) + (b.packaged_10kg * 10) + (b.packaged_5kg * 5) + b.stock_kg) AS total_kg,
                b.status
            FROM inventory_batch b
            WHERE b.status = 'Active'
              AND ((b.stock_sacks * 50) + (b.packaged_25kg * 25) + (b.packaged_20kg * 20) + (b.packaged_10kg * 10) + (b.packaged_5kg * 5) + b.stock_kg) > 0
            ORDER BY b.received_date ASC, b.batch_id ASC
        ");
        $batchStmt->execute();
        $allBatches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

        $batchesByProduct = [];
        foreach ($allBatches as $b) {
            $pid = (int)$b['product_id'];
            if (!isset($batchesByProduct[$pid])) {
                $batchesByProduct[$pid] = [];
            }
            $batchesByProduct[$pid][] = $b;
        }

        foreach ($products as &$p) {
            $pid = (int)$p['product_id'];
            $p['batches'] = $batchesByProduct[$pid] ?? [];

            // If active batches exist, calculate aggregated inventory metrics from them
            if (!empty($p['batches'])) {
                $sumSacks = 0;
                $sum25 = 0;
                $sum20 = 0;
                $sum10 = 0;
                $sum5 = 0;
                $sumKg = 0.0;
                $maxDaysOld = 0;

                foreach ($p['batches'] as $b) {
                    $sumSacks += (int)$b['stock_sacks'];
                    $sum25 += (int)$b['packaged_25kg'];
                    $sum20 += (int)$b['packaged_20kg'];
                    $sum10 += (int)$b['packaged_10kg'];
                    $sum5 += (int)$b['packaged_5kg'];
                    $sumKg += (float)$b['stock_kg'];
                    if ((int)$b['days_old'] > $maxDaysOld) {
                        $maxDaysOld = (int)$b['days_old'];
                    }
                }

                $p['stock_sacks'] = $sumSacks;
                $p['packaged_25kg'] = $sum25;
                $p['packaged_20kg'] = $sum20;
                $p['packaged_10kg'] = $sum10;
                $p['packaged_5kg'] = $sum5;
                $p['stock_kg'] = round($sumKg, 2);
                $p['days_old'] = $maxDaysOld; // Oldest batch age for FIFO vigilance
            }
        }
        unset($p);
    }

    echo json_encode($products);
} catch (PDOException $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>