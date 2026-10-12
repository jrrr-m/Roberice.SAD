<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

try {
    $origin = !empty($data['origin']) && in_array($data['origin'], ['Local', 'Imported']) ? $data['origin'] : 'Local';
    $riceType = !empty($data['riceType']) ? trim($data['riceType']) : (!empty($data['category']) ? trim($data['category']) : 'White Rice');
    $price25kg = !empty($data['price25kg']) ? (float)$data['price25kg'] : ((float)$data['priceSack'] / 2);
    $price5kg = !empty($data['price5kg']) ? (float)$data['price5kg'] : ((float)$data['priceKg'] * 5);
    $price10kg = !empty($data['price10kg']) ? (float)$data['price10kg'] : ((float)$data['priceKg'] * 10);
    $price20kg = !empty($data['price20kg']) ? (float)$data['price20kg'] : ((float)$data['priceKg'] * 20);

    $stmt = $conn->prepare("
        UPDATE product
        SET product_name = ?, category = ?, origin = ?, rice_type = ?, price_sack = ?, price_25kg = ?, price_kg = ?, price_5kg = ?, price_10kg = ?, price_20kg = ?, kg_per_sack = 50.00
        WHERE product_id = ?
    ");

    $stmt->execute([
        $data['name'],
        $data['category'],
        $origin,
        $riceType,
        $data['priceSack'],
        $price25kg,
        $data['priceKg'],
        $price5kg,
        $price10kg,
        $price20kg,
        $data['productId']
    ]);

    $stmt = $conn->prepare("
        UPDATE inventory
        SET reorder_level_kg = ?
        WHERE product_id = ?
    ");

    $stmt->execute([
        $data['thresholdKg'],
        $data['productId']
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Product updated successfully."
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>