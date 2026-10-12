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

if (!in_array($type, ['restock', 'spoilage', 'correction'])) {
    echo json_encode(["success" => false, "message" => "Invalid adjustment type."]);
    exit;
}

try {
    $conn->beginTransaction();

    $stmt = $conn->prepare("
        SELECT
            i.stock_sacks,
            i.stock_kg,
            i.packaged_5kg,
            i.packaged_10kg,
            i.packaged_20kg,
            i.received_date,
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
    $newKg = (float)$product['stock_kg'];
    $newPack5 = (int)$product['packaged_5kg'];
    $newPack10 = (int)$product['packaged_10kg'];
    $newPack20 = (int)$product['packaged_20kg'];

    $p5 = (int)($data['packaged5kg'] ?? 0);
    $p10 = (int)($data['packaged10kg'] ?? 0);
    $p20 = (int)($data['packaged20kg'] ?? 0);

    $receivedDate = !empty($data['receivedDate']) ? $data['receivedDate'] : ($type === 'restock' ? date('Y-m-d') : $product['received_date']);

    if ($type === 'restock') {
        $newSacks += abs($sacks);
        $newKg += abs($kg);
        $newPack5 += abs($p5);
        $newPack10 += abs($p10);
        $newPack20 += abs($p20);
    } elseif ($type === 'spoilage') {
        $newSacks = max(0, $newSacks - abs($sacks));
        $newKg = max(0, $newKg - abs($kg));
        $newPack5 = max(0, $newPack5 - abs($p5));
        $newPack10 = max(0, $newPack10 - abs($p10));
        $newPack20 = max(0, $newPack20 - abs($p20));
    } elseif ($type === 'repack') {
        // Repacking loose/sack rice into packages
        // e.g. Pack into 5kg/10kg/20kg bags
        $newPack5 += abs($p5);
        $newPack10 += abs($p10);
        $newPack20 += abs($p20);
        $totalRepackedKg = (abs($p5) * 5) + (abs($p10) * 10) + (abs($p20) * 20);
        if ($newKg >= $totalRepackedKg) {
            $newKg -= $totalRepackedKg;
        } else {
            $neededKg = $totalRepackedKg - $newKg;
            $kgPerSack = (float)$product['kg_per_sack'];
            $sacksToOpen = (int)ceil($neededKg / $kgPerSack);
            $newSacks = max(0, $newSacks - $sacksToOpen);
            $newKg = max(0, ($newKg + ($sacksToOpen * $kgPerSack)) - $totalRepackedKg);
        }
    } else {
        // Correction
        $newSacks = max(0, $sacks);
        $newKg = max(0, $kg);
        if (isset($data['packaged5kg'])) $newPack5 = max(0, $p5);
        if (isset($data['packaged10kg'])) $newPack10 = max(0, $p10);
        if (isset($data['packaged20kg'])) $newPack20 = max(0, $p20);
    }

    $stmt = $conn->prepare("
        UPDATE inventory
        SET stock_sacks = ?, stock_kg = ?, packaged_5kg = ?, packaged_10kg = ?, packaged_20kg = ?, received_date = ?
        WHERE product_id = ?
    ");
    $stmt->execute([$newSacks, $newKg, $newPack5, $newPack10, $newPack20, $receivedDate, $productId]);

    $detailNote = $note;
    if ($p5 > 0 || $p10 > 0 || $p20 > 0) {
        $detailNote .= " [Packs: 5kg=" . $p5 . ", 10kg=" . $p10 . ", 20kg=" . $p20 . "]";
    }

    $stmt = $conn->prepare("
        INSERT INTO inventory_adjustment
        (product_id, adjustment_type, sacks, kg, note, performed_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $productId,
        $type,
        abs($sacks),
        abs($kg),
        trim($detailNote),
        $user
    ]);

    $totalKg = ($newSacks * (float)$product['kg_per_sack']) + $newKg + ($newPack5 * 5) + ($newPack10 * 10) + ($newPack20 * 20);
    $lowStock = $totalKg <= (float)$product['reorder_level_kg'];

    $conn->commit();

    echo json_encode([
        "success" => true,
        "productName" => $product['product_name'],
        "stockSacks" => $newSacks,
        "stockKg" => $newKg,
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