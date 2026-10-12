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

    echo json_encode($products);

} catch (PDOException $e) {

    echo json_encode([
        "error" => $e->getMessage()
    ]);

}

?>