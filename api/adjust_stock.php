
<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['productId'], $data['type'])) {
    echo json_encode(["success" => false, "message" => "Missing required information."]);
    exit;
}

$productId = (int)$data['productId'];
$type = $data['type'];
$sacks = (int)($data['sacks'] ?? 0);
$kg = (float)($data['kg'] ?? 0);
$note = trim($data['note'] ?? '');
$user = trim($data['user'] ?? 'Admin User');

if (!in_array($type, ['restock', 'spoilage', 'correction', 'repack', 'open_sack'])) {
    echo json_encode(["success" => false, "message" => "Invalid adjustment type."]);
    exit;
}

try {
    $conn->beginTransaction();

    $stmt = $conn->prepare("
        SELECT
            i.stock_sacks,
            i.packaged_25kg,
            i.stock_kg,
            i.packaged_5kg,
            i.packaged_10kg,
            i.packaged_20kg,
            i.received_date,
            i.batch_number,
            i.reorder_level_kg,
            p.product_name,
            p.kg_per_sack
        FROM inventory i
        JOIN product p ON i.product_id = p.product_id
        WHERE i.product_id = ?
        FOR UPDATE
    ");
    $stmt->execute([$productId]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        throw new Exception("Inventory record not found.");
    }

    $newSacks = (int)$product['stock_sacks'];
    $newPack25 = (int)($product['packaged_25kg'] ?? 0);
    $newKg = (float)$product['stock_kg'];
    $newPack5 = (int)$product['packaged_5kg'];
    $newPack10 = (int)$product['packaged_10kg'];
    $newPack20 = (int)$product['packaged_20kg'];

    $p5 = (int)($data['packaged5kg'] ?? 0);
    $p10 = (int)($data['packaged10kg'] ?? 0);
    $p20 = (int)($data['packaged20kg'] ?? 0);
    $p25 = (int)($data['packaged25kg'] ?? 0);
    $sackType = trim($data['sackType'] ?? '20kg');
    $openQty = max(1, (int)($data['openQty'] ?? $data['qty'] ?? 1));
    $batchNumber = !empty($data['batchNumber']) ? trim($data['batchNumber']) : ($product['batch_number'] ?? 'BATCH-001');

    $receivedDate = !empty($data['receivedDate']) ? $data['receivedDate'] : ($type === 'restock' ? date('Y-m-d') : $product['received_date']);
    $detailNote = $note;

    if ($type === 'open_sack') {
        // Cashier or Admin opens a sack into loose inventory from chosen batch
        if ($sackType === '25kg' || $sackType === 'half') {
            if ($newPack25 < $openQty) {
                throw new Exception("Insufficient 25kg half sacks in stock to open. Available: " . $newPack25);
            }
            $newPack25 -= $openQty;
            $addedKg = $openQty * 25.0;
            $newKg += $addedKg;
            $sacks = $openQty;
            $kg = $addedKg;
            $detailNote = !empty($note) ? $note : "Opened {$openQty}x 25kg half sack(s) from Batch {$batchNumber} (+{$addedKg} kg into loose stock)";
        } elseif ($sackType === '20kg') {
            if ($newPack20 < $openQty) {
                throw new Exception("Insufficient 20kg sacks in stock to open. Available: " . $newPack20);
            }
            $newPack20 -= $openQty;
            $addedKg = $openQty * 20.0;
            $newKg += $addedKg;
            $sacks = $openQty;
            $kg = $addedKg;
            $detailNote = !empty($note) ? $note : "Opened {$openQty}x 20kg sack(s) from Batch {$batchNumber} (+{$addedKg} kg into loose stock)";
        } elseif ($sackType === '10kg') {
            if ($newPack10 < $openQty) {
                throw new Exception("Insufficient 10kg sacks in stock to open. Available: " . $newPack10);
            }
            $newPack10 -= $openQty;
            $addedKg = $openQty * 10.0;
            $newKg += $addedKg;
            $sacks = $openQty;
            $kg = $addedKg;
            $detailNote = !empty($note) ? $note : "Opened {$openQty}x 10kg sack(s) from Batch {$batchNumber} (+{$addedKg} kg into loose stock)";
        } elseif ($sackType === '5kg') {
            if ($newPack5 < $openQty) {
                throw new Exception("Insufficient 5kg sacks in stock to open. Available: " . $newPack5);
            }
            $newPack5 -= $openQty;
            $addedKg = $openQty * 5.0;
            $newKg += $addedKg;
            $sacks = $openQty;
            $kg = $addedKg;
            $detailNote = !empty($note) ? $note : "Opened {$openQty}x 5kg sack(s) from Batch {$batchNumber} (+{$addedKg} kg into loose stock)";
        } else {
            // Whole sack (50kg)
            if ($newSacks < $openQty) {
                throw new Exception("Insufficient whole sacks in stock to open. Available: " . $newSacks);
            }
            $kgPerSack = 50.0;
            $newSacks -= $openQty;
            $addedKg = $openQty * $kgPerSack;
            $newKg += $addedKg;
            $sacks = $openQty;
            $kg = $addedKg;
            $detailNote = !empty($note) ? $note : "Opened {$openQty}x Whole (50kg) sack(s) from Batch {$batchNumber} (+{$addedKg} kg into loose stock)";
        }
    } elseif ($type === 'restock') {
        $newSacks += abs($sacks);
        $newKg += abs($kg);
        $newPack5 += abs($p5);
        $newPack10 += abs($p10);
        $newPack20 += abs($p20);
        $newPack25 += abs($p25);
        if ($p5 > 0 || $p10 > 0 || $p20 > 0 || $p25 > 0) {
            $detailNote .= " [Packs: 25kg={$p25}, 20kg={$p20}, 10kg={$p10}, 5kg={$p5}]";
        }
    } elseif ($type === 'spoilage') {
        $newSacks = max(0, $newSacks - abs($sacks));
        $newKg = max(0, $newKg - abs($kg));
        $newPack5 = max(0, $newPack5 - abs($p5));
        $newPack10 = max(0, $newPack10 - abs($p10));
        $newPack20 = max(0, $newPack20 - abs($p20));
        $newPack25 = max(0, $newPack25 - abs($p25));
        if ($p5 > 0 || $p10 > 0 || $p20 > 0 || $p25 > 0) {
            $detailNote .= " [Damaged packs: 25kg={$p25}, 20kg={$p20}, 10kg={$p10}, 5kg={$p5}]";
        }
    } elseif ($type === 'repack') {
        $newPack5 += abs($p5);
        $newPack10 += abs($p10);
        $newPack20 += abs($p20);
        $newPack25 += abs($p25);
        $totalRepackedKg = (abs($p5) * 5) + (abs($p10) * 10) + (abs($p20) * 20) + (abs($p25) * 25);
        if ($newKg >= $totalRepackedKg) {
            $newKg -= $totalRepackedKg;
        } else {
            $neededKg = $totalRepackedKg - $newKg;
            $kgPerSack = 50.0;
            $sacksToOpen = (int)ceil($neededKg / $kgPerSack);
            $newSacks = max(0, $newSacks - $sacksToOpen);
            $newKg = max(0, ($newKg + ($sacksToOpen * $kgPerSack)) - $totalRepackedKg);
        }
        $detailNote = !empty($note) ? $note : "Repacked stock into bags [25kg={$p25}, 20kg={$p20}, 10kg={$p10}, 5kg={$p5}]";
    } else {
        // Correction
        $newSacks = max(0, $sacks);
        $newKg = max(0, $kg);
        if (isset($data['packaged5kg'])) $newPack5 = max(0, $p5);
        if (isset($data['packaged10kg'])) $newPack10 = max(0, $p10);
        if (isset($data['packaged20kg'])) $newPack20 = max(0, $p20);
        if (isset($data['packaged25kg'])) $newPack25 = max(0, $p25);
    }

    $stmt = $conn->prepare("
        UPDATE inventory
        SET stock_sacks = ?, packaged_25kg = ?, stock_kg = ?, packaged_5kg = ?, packaged_10kg = ?, packaged_20kg = ?, received_date = ?, batch_number = ?
        WHERE product_id = ?
    ");
    $stmt->execute([$newSacks, $newPack25, $newKg, $newPack5, $newPack10, $newPack20, $receivedDate, $batchNumber, $productId]);

    // Sync with inventory_batch table if exists
    $hasBatches = $conn->query("SHOW TABLES LIKE 'inventory_batch'")->fetchAll();
    if (count($hasBatches) > 0 && !empty($batchNumber)) {
        $bStmt = $conn->prepare("SELECT * FROM inventory_batch WHERE product_id = ? AND batch_code = ? LIMIT 1");
        $bStmt->execute([$productId, $batchNumber]);
        $bRow = $bStmt->fetch(PDO::FETCH_ASSOC);

        if ($bRow) {
            $bId = $bRow['batch_id'];
            $bSacks = (int)$bRow['stock_sacks'];
            $b25 = (int)$bRow['packaged_25kg'];
            $b20 = (int)$bRow['packaged_20kg'];
            $b10 = (int)$bRow['packaged_10kg'];
            $b5 = (int)$bRow['packaged_5kg'];
            $bKg = (float)$bRow['stock_kg'];

            if ($type === 'open_sack') {
                if ($sackType === '25kg' || $sackType === 'half') {
                    $b25 = max(0, $b25 - $openQty);
                    $bKg += $addedKg;
                } elseif ($sackType === '20kg') {
                    $b20 = max(0, $b20 - $openQty);
                    $bKg += $addedKg;
                } elseif ($sackType === '10kg') {
                    $b10 = max(0, $b10 - $openQty);
                    $bKg += $addedKg;
                } elseif ($sackType === '5kg') {
                    $b5 = max(0, $b5 - $openQty);
                    $bKg += $addedKg;
                } else {
                    $bSacks = max(0, $bSacks - $openQty);
                    $bKg += $addedKg;
                }
            } elseif ($type === 'restock') {
                $bSacks += abs($sacks);
                $b25 += abs($p25);
                $b20 += abs($p20);
                $b10 += abs($p10);
                $b5 += abs($p5);
                $bKg += abs($kg);
            } elseif ($type === 'spoilage') {
                $bSacks = max(0, $bSacks - abs($sacks));
                $b25 = max(0, $b25 - abs($p25));
                $b20 = max(0, $b20 - abs($p20));
                $b10 = max(0, $b10 - abs($p10));
                $b5 = max(0, $b5 - abs($p5));
                $bKg = max(0, $bKg - abs($kg));
            }

            $bVol = ($bSacks * 50) + ($b25 * 25) + ($b20 * 20) + ($b10 * 10) + ($b5 * 5) + $bKg;
            $newStatus = ($bVol <= 0) ? 'Depleted' : 'Active';

            $upd = $conn->prepare("UPDATE inventory_batch SET stock_sacks = ?, packaged_25kg = ?, packaged_20kg = ?, packaged_10kg = ?, packaged_5kg = ?, stock_kg = ?, status = ? WHERE batch_id = ?");
            $upd->execute([$bSacks, $b25, $b20, $b10, $b5, $bKg, $newStatus, $bId]);

            // If batch depleted, log to audit history!
            if ($newStatus === 'Depleted' && $bRow['status'] === 'Active') {
                $depStmt = $conn->prepare("
                    INSERT INTO inventory_adjustment
                    (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
                    VALUES (?, ?, NOW(), 'batch_depleted', 0, 0, ?, ?)
                ");
                $depStmt->execute([
                    $productId,
                    $batchNumber,
                    "Batch {$batchNumber} for {$product['product_name']} ran out (0 kg remaining) — batch completed & archived.",
                    $user
                ]);
            }
        } else {
            // If batch record does not exist yet, create a new active batch row in inventory_batch
            if ($type === 'restock' || $type === 'correction') {
                $bSacks = abs($sacks);
                $b25 = abs($p25);
                $b20 = abs($p20);
                $b10 = abs($p10);
                $b5 = abs($p5);
                $bKg = abs($kg);
                $bVol = ($bSacks * 50) + ($b25 * 25) + ($b20 * 20) + ($b10 * 10) + ($b5 * 5) + $bKg;
                $newStatus = ($bVol <= 0) ? 'Depleted' : 'Active';

                $insBatch = $conn->prepare("
                    INSERT INTO inventory_batch 
                    (product_id, batch_code, received_date, stock_sacks, packaged_25kg, packaged_20kg, packaged_10kg, packaged_5kg, stock_kg, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ");
                $insBatch->execute([$productId, $batchNumber, $receivedDate, $bSacks, $b25, $b20, $b10, $b5, $bKg, $newStatus]);
            }
        }
    }

    $stmt = $conn->prepare("
        INSERT INTO inventory_adjustment
        (product_id, batch_code, adjustment_type, sacks, kg, note, performed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $productId,
        $batchNumber,
        $type,
        abs($sacks),
        abs($kg),
        trim($detailNote),
        $user
    ]);

    $totalKg = ($newSacks * 50.0) + ($newPack25 * 25.0) + ($newPack20 * 20.0) + ($newPack10 * 10.0) + ($newPack5 * 5.0) + $newKg;
    $lowStock = $totalKg <= (float)$product['reorder_level_kg'];

    $conn->commit();

    echo json_encode([
        "success" => true,
        "productName" => $product['product_name'],
        "stockSacks" => $newSacks,
        "packaged25kg" => $newPack25,
        "stockKg" => $newKg,
        "packaged5kg" => $newPack5,
        "packaged10kg" => $newPack10,
        "packaged20kg" => $newPack20,
        "batchNumber" => $batchNumber,
        "thresholdKg" => (float)$product['reorder_level_kg'],
        "lowStock" => $lowStock
    ]);
} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>