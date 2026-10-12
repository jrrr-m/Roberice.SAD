<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

try {
    $conn->beginTransaction();

    $origin = !empty($data['origin']) && in_array($data['origin'], ['Local', 'Imported']) ? $data['origin'] : 'Local';
    $riceType = !empty($data['riceType']) ? trim($data['riceType']) : (!empty($data['category']) ? trim($data['category']) : 'White Rice');
    $price5kg = !empty($data['price5kg']) ? (float)$data['price5kg'] : ((float)$data['priceKg'] * 5);
    $price10kg = !empty($data['price10kg']) ? (float)$data['price10kg'] : ((float)$data['priceKg'] * 10);
    $price20kg = !empty($data['price20kg']) ? (float)$data['price20kg'] : ((float)$data['priceKg'] * 20);

    $stmt = $conn->prepare("
        INSERT INTO product
        (product_name, category, origin, rice_type, description, price_sack, price_kg, price_5kg, price_10kg, price_20kg, kg_per_sack, product_status)
        VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'Active')
    ");

    $stmt->execute([
        $data['name'],
        $data['category'],
        $origin,
        $riceType,
        $data['priceSack'],
        $data['priceKg'],
        $price5kg,
        $price10kg,
        $price20kg,
        $data['kgPerSack']
    ]);

    $productId = $conn->lastInsertId();

    $packaged5kg = isset($data['packaged5kg']) ? (int)$data['packaged5kg'] : 0;
    $packaged10kg = isset($data['packaged10kg']) ? (int)$data['packaged10kg'] : 0;
    $packaged20kg = isset($data['packaged20kg']) ? (int)$data['packaged20kg'] : 0;
    $receivedDate = !empty($data['receivedDate']) ? $data['receivedDate'] : date('Y-m-d');
    $batchNumber = !empty($data['batchNumber']) ? trim($data['batchNumber']) : ('BATCH-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $data['name']), 0, 3)) . '-' . date('ym'));

    $stmt = $conn->prepare("
        INSERT INTO inventory
        (product_id, stock_sacks, stock_kg, packaged_5kg, packaged_10kg, packaged_20kg, received_date, batch_number, reorder_level_kg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $productId,
        $data['initialSacks'],
        $data['initialKg'],
        $packaged5kg,
        $packaged10kg,
        $packaged20kg,
        $receivedDate,
        $batchNumber,
        $data['thresholdKg']
    ]);

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Product added successfully."
    ]);

} catch (Exception $e) {
    $conn->rollBack();

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>