<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

$items = $data["items"] ?? [];
$username = trim($data["username"] ?? "");
$paymentReceived = (float)($data["paymentReceived"] ?? 0);
$paymentMethod = trim($data["paymentMethod"] ?? "Cash");

if (empty($items)) {
    echo json_encode(["success" => false, "message" => "Cart is empty."]);
    exit;
}

try {
    $conn->beginTransaction();

    $stmt = $conn->prepare("
        SELECT user_id, full_name
        FROM users
        WHERE username = ? AND account_status = 'Active'
    ");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception("Cashier account was not found in the database.");
    }

    $total = 0;
    $processedItems = [];

    foreach ($items as $item) {
        $productId = (int)$item["productId"];
        $unit = $item["unit"];
        $qty = (float)$item["qty"];

        if ($qty <= 0) {
            throw new Exception("Invalid quantity.");
        }

        if ($unit === "sack" && floor($qty) != $qty) {
            throw new Exception("Sack quantity must be a whole number.");
        }

        $stmt = $conn->prepare("
            SELECT
                p.product_name,
                p.price_sack,
                p.price_kg,
                p.price_5kg,
                p.price_10kg,
                p.price_20kg,
                p.kg_per_sack,
                i.stock_sacks,
                i.stock_kg,
                i.packaged_5kg,
                i.packaged_10kg,
                i.packaged_20kg
            FROM product p
            JOIN inventory i ON p.product_id = i.product_id
            WHERE p.product_id = ?
            AND p.product_status = 'Active'
            FOR UPDATE
        ");
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            throw new Exception("Product not found.");
        }

        $stockSacks = (int)$product["stock_sacks"];
        $stockKg = (float)$product["stock_kg"];
        $p5 = (int)$product["packaged_5kg"];
        $p10 = (int)$product["packaged_10kg"];
        $p20 = (int)$product["packaged_20kg"];
        $kgPerSack = (float)$product["kg_per_sack"];

        $unitLower = strtolower(trim($unit));

        if ($unitLower === "sack") {
            if ($qty > $stockSacks) {
                throw new Exception("Insufficient sack stock for " . $product["product_name"] . ".");
            }
            $stockSacks -= (int)$qty;
            $unitPrice = (float)$product["price_sack"];
        } elseif ($unitLower === "5kg") {
            $unitPrice = !empty($product["price_5kg"]) && (float)$product["price_5kg"] > 0
                ? (float)$product["price_5kg"]
                : ((float)$product["price_kg"] * 5);

            $neededPacks = (int)$qty;
            if ($p5 >= $neededPacks) {
                $p5 -= $neededPacks;
            } else {
                $deficitPacks = $neededPacks - $p5;
                $p5 = 0;
                $neededKg = $deficitPacks * 5;
                if ($stockKg >= $neededKg) {
                    $stockKg -= $neededKg;
                } else {
                    $looseShort = $neededKg - $stockKg;
                    $sacksToOpen = (int)ceil($looseShort / $kgPerSack);
                    if ($sacksToOpen > $stockSacks) {
                        throw new Exception("Insufficient 5kg stock for " . $product["product_name"] . ".");
                    }
                    $stockSacks -= $sacksToOpen;
                    $stockKg = ($stockKg + ($sacksToOpen * $kgPerSack)) - $neededKg;
                }
            }
        } elseif ($unitLower === "10kg") {
            $unitPrice = !empty($product["price_10kg"]) && (float)$product["price_10kg"] > 0
                ? (float)$product["price_10kg"]
                : ((float)$product["price_kg"] * 10);

            $neededPacks = (int)$qty;
            if ($p10 >= $neededPacks) {
                $p10 -= $neededPacks;
            } else {
                $deficitPacks = $neededPacks - $p10;
                $p10 = 0;
                $neededKg = $deficitPacks * 10;
                if ($stockKg >= $neededKg) {
                    $stockKg -= $neededKg;
                } else {
                    $looseShort = $neededKg - $stockKg;
                    $sacksToOpen = (int)ceil($looseShort / $kgPerSack);
                    if ($sacksToOpen > $stockSacks) {
                        throw new Exception("Insufficient 10kg stock for " . $product["product_name"] . ".");
                    }
                    $stockSacks -= $sacksToOpen;
                    $stockKg = ($stockKg + ($sacksToOpen * $kgPerSack)) - $neededKg;
                }
            }
        } elseif ($unitLower === "20kg") {
            $unitPrice = !empty($product["price_20kg"]) && (float)$product["price_20kg"] > 0
                ? (float)$product["price_20kg"]
                : ((float)$product["price_kg"] * 20);

            $neededPacks = (int)$qty;
            if ($p20 >= $neededPacks) {
                $p20 -= $neededPacks;
            } else {
                $deficitPacks = $neededPacks - $p20;
                $p20 = 0;
                $neededKg = $deficitPacks * 20;
                if ($stockKg >= $neededKg) {
                    $stockKg -= $neededKg;
                } else {
                    $looseShort = $neededKg - $stockKg;
                    $sacksToOpen = (int)ceil($looseShort / $kgPerSack);
                    if ($sacksToOpen > $stockSacks) {
                        throw new Exception("Insufficient 20kg stock for " . $product["product_name"] . ".");
                    }
                    $stockSacks -= $sacksToOpen;
                    $stockKg = ($stockKg + ($sacksToOpen * $kgPerSack)) - $neededKg;
                }
            }
        } else {
            // "tinatakal" or "kg" (loose retail per kg)
            $unitPrice = (float)$product["price_kg"];
            $openSackType = !empty($item["openSackType"]) ? strtolower(trim($item["openSackType"])) : null;

            $totalAvailableKg = ($p20 * 20) + ($p10 * 10) + ($p5 * 5) + ($stockSacks * $kgPerSack) + $stockKg;

            if ($qty > $totalAvailableKg) {
                throw new Exception("Insufficient stock for " . $product["product_name"] . ". Total available is " . number_format($totalAvailableKg, 2) . " kg.");
            }

            if ($stockKg >= $qty && empty($openSackType)) {
                // Stock already has enough loose kg
                $stockKg -= $qty;
            } else {
                // Need to open a sack (or cashier explicitly chose to open a sack)
                $neededKg = max(0, $qty - $stockKg);
                $openedSackDesc = "";

                if ($openSackType === "20kg" || (empty($openSackType) && $p20 > 0)) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / 20.0));
                    if ($p20 < $sacksToOpen) {
                        throw new Exception("Insufficient 20kg sacks in stock for " . $product["product_name"] . ".");
                    }
                    $p20 -= $sacksToOpen;
                    $addedKg = $sacksToOpen * 20.0;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x 20kg sack";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } elseif ($openSackType === "10kg" || (empty($openSackType) && $p10 > 0)) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / 10.0));
                    if ($p10 < $sacksToOpen) {
                        throw new Exception("Insufficient 10kg sacks in stock for " . $product["product_name"] . ".");
                    }
                    $p10 -= $sacksToOpen;
                    $addedKg = $sacksToOpen * 10.0;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x 10kg sack";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } elseif ($openSackType === "5kg" || (empty($openSackType) && $p5 > 0)) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / 5.0));
                    if ($p5 < $sacksToOpen) {
                        throw new Exception("Insufficient 5kg sacks in stock for " . $product["product_name"] . ".");
                    }
                    $p5 -= $sacksToOpen;
                    $addedKg = $sacksToOpen * 5.0;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x 5kg sack";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } elseif ($stockSacks > 0) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / $kgPerSack));
                    if ($stockSacks < $sacksToOpen) {
                        throw new Exception("Insufficient sacks in stock for " . $product["product_name"] . ".");
                    }
                    $stockSacks -= $sacksToOpen;
                    $addedKg = $sacksToOpen * $kgPerSack;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x standard sack";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } else {
                    throw new Exception("No sacks available to open for " . $product["product_name"] . ".");
                }

                // Deduct sold quantity from the newly opened loose stock
                $stockKg -= $qty;

                // Log the opened sack in inventory adjustment log
                $adjStmt = $conn->prepare("
                    INSERT INTO inventory_adjustment
                    (product_id, adjustment_type, sacks, kg, note, performed_by)
                    VALUES (?, 'open_sack', ?, ?, ?, ?)
                ");
                $adjStmt->execute([
                    $productId,
                    $openedSacksCount,
                    $openedKgAmount,
                    "Opened {$openedSackDesc} for {$qty} kg sale ({$stockKg} kg stored in loose inventory)",
                    $user["full_name"]
                ]);
            }
        }

        $subtotal = $unitPrice * $qty;
        $total += $subtotal;

        $processedItems[] = [
            "productId" => $productId,
            "productName" => $product["product_name"],
            "unit" => $unit,
            "qty" => $qty,
            "unitPrice" => $unitPrice,
            "subtotal" => $subtotal
        ];

        $stmt = $conn->prepare("
            UPDATE inventory
            SET stock_sacks = ?, stock_kg = ?, packaged_5kg = ?, packaged_10kg = ?, packaged_20kg = ?
            WHERE product_id = ?
        ");
        $stmt->execute([$stockSacks, $stockKg, $p5, $p10, $p20, $productId]);
    }

    if ($paymentReceived < $total) {
        throw new Exception("Payment received is insufficient.");
    }

    $change = $paymentReceived - $total;

    $stmt = $conn->prepare("
        INSERT INTO sales_transaction
        (user_id, total_amount, payment_amount, change_amount, payment_method, transaction_status)
        VALUES (?, ?, ?, ?, ?, 'Completed')
    ");

    $stmt->execute([
        $user["user_id"],
        $total,
        $paymentReceived,
        $change,
        $paymentMethod
    ]);

    $transactionId = $conn->lastInsertId();

    $itemStmt = $conn->prepare("
        INSERT INTO transaction_item
        (transaction_id, product_id, unit, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    foreach ($processedItems as $item) {
        $itemStmt->execute([
            $transactionId,
            $item["productId"],
            $item["unit"],
            $item["qty"],
            $item["unitPrice"],
            $item["subtotal"]
        ]);
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "transactionId" => $transactionId,
        "cashierName" => $user["full_name"],
        "totalAmount" => $total,
        "paymentReceived" => $paymentReceived,
        "changeAmount" => $change,
        "paymentMethod" => $paymentMethod,
        "items" => $processedItems
    ]);

} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>