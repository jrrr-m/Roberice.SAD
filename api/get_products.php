<?php

header("Content-Type: application/json");

require_once "db.php";

try {

    $sql = "
        SELECT
            p.product_id,
            p.product_name,
            p.category,
            p.origin,
            p.rice_type,
            p.description,
            p.price_sack,
            p.price_25kg,
            p.price_kg,
            p.price_5kg,
            p.price_10kg,
            p.price_20kg,
            p.kg_per_sack,
            p.product_status,

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
            i.reorder_level_kg

        FROM product p

        LEFT JOIN inventory i
        ON p.product_id = i.product_id

        WHERE p.product_status = 'Active'
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Synchronize inventory numbers with active inventory_batch records to ensure unified source of truth
    $hasBatches = $conn->query("SHOW TABLES LIKE 'inventory_batch'")->fetchAll();
    if (count($hasBatches) > 0) {
        $batchStmt = $conn->query("
            SELECT
                product_id,
                batch_code,
                received_date,
                DATEDIFF(CURRENT_DATE, received_date) AS days_old,
                stock_sacks,
                packaged_25kg,
                packaged_20kg,
                packaged_10kg,
                packaged_5kg,
                stock_kg
            FROM inventory_batch
            WHERE status = 'Active'
              AND ((stock_sacks * 50) + (packaged_25kg * 25) + (packaged_20kg * 20) + (packaged_10kg * 10) + (packaged_5kg * 5) + stock_kg) > 0
            ORDER BY received_date ASC, batch_id ASC
        ");
        $allBatches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

        $batchesByProduct = [];
        foreach ($allBatches as $b) {
            $pid = (int)$b['product_id'];
            $batchesByProduct[$pid][] = $b;
        }

        foreach ($products as &$p) {
            $pid = (int)$p['product_id'];
            if (!empty($batchesByProduct[$pid])) {
                $sumSacks = 0;
                $sum25 = 0;
                $sum20 = 0;
                $sum10 = 0;
                $sum5 = 0;
                $sumKg = 0.0;
                $maxDaysOld = 0;
                $latestBatch = $p['batch_number'];

                foreach ($batchesByProduct[$pid] as $b) {
                    $sumSacks += (int)$b['stock_sacks'];
                    $sum25 += (int)$b['packaged_25kg'];
                    $sum20 += (int)$b['packaged_20kg'];
                    $sum10 += (int)$b['packaged_10kg'];
                    $sum5 += (int)$b['packaged_5kg'];
                    $sumKg += (float)$b['stock_kg'];
                    if ((int)$b['days_old'] > $maxDaysOld) {
                        $maxDaysOld = (int)$b['days_old'];
                    }
                    $latestBatch = $b['batch_code'];
                }

                $p['stock_sacks'] = $sumSacks;
                $p['packaged_25kg'] = $sum25;
                $p['packaged_20kg'] = $sum20;
                $p['packaged_10kg'] = $sum10;
                $p['packaged_5kg'] = $sum5;
                $p['stock_kg'] = round($sumKg, 2);
                $p['days_old'] = $maxDaysOld;
                $p['batch_number'] = $latestBatch;
            }
        }
        unset($p);
    }

    echo json_encode($products);

} catch (PDOException $e) {

    echo json_encode([
        "error" => $e->getMessage()
    ]);

}

?>