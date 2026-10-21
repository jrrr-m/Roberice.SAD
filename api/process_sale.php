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
        $openedSacksCount = 0;
        $openedKgAmount = 0.0;
        $chosenSackToOpen = null;

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
                p.price_25kg,
                p.price_kg,
                p.price_5kg,
                p.price_10kg,
                p.price_20kg,
                p.kg_per_sack,
                i.stock_sacks,
                i.packaged_25kg,
                i.stock_kg,
                i.packaged_5kg,
                i.packaged_10kg,
                i.packaged_20kg,
                i.batch_number
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
        $p25 = (int)($product["packaged_25kg"] ?? 0);
        $stockKg = (float)$product["stock_kg"];
        $p5 = (int)$product["packaged_5kg"];
        $p10 = (int)$product["packaged_10kg"];
        $p20 = (int)$product["packaged_20kg"];
        $kgPerSack = 50.0;

        // Fetch all active batches for this product in strict FIFO order (oldest received date first)
        $batchStmt = $conn->prepare("
            SELECT * 
            FROM inventory_batch 
            WHERE product_id = ? AND status = 'Active'
            ORDER BY received_date ASC, batch_id ASC
            FOR UPDATE
        ");
        $batchStmt->execute([$productId]);
        $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

        $unitLower = strtolower(trim($unit));

        // 1. Determine Unit Price
        if ($unitLower === "sack" || $unitLower === "50kg") {
            $unitPrice = (float)$product["price_sack"];
        } elseif ($unitLower === "25kg" || $unitLower === "half_sack" || $unitLower === "half") {
            $unitPrice = !empty($product["price_25kg"]) && (float)$product["price_25kg"] > 0
                ? (float)$product["price_25kg"]
                : ((float)$product["price_sack"] / 2);
        } elseif ($unitLower === "20kg") {
            $unitPrice = !empty($product["price_20kg"]) && (float)$product["price_20kg"] > 0
                ? (float)$product["price_20kg"]
                : ((float)$product["price_kg"] * 20);
        } elseif ($unitLower === "10kg") {
            $unitPrice = !empty($product["price_10kg"]) && (float)$product["price_10kg"] > 0
                ? (float)$product["price_10kg"]
                : ((float)$product["price_kg"] * 10);
        } elseif ($unitLower === "5kg") {
            $unitPrice = !empty($product["price_5kg"]) && (float)$product["price_5kg"] > 0
                ? (float)$product["price_5kg"]
                : ((float)$product["price_kg"] * 5);
        } else {
            // tinatakal / loose per kg
            $unitPrice = (float)$product["price_kg"];
        }

        // 2. Perform Stock Validation and FIFO Deduction across Active Batches
        if (!empty($batches)) {
            if ($unitLower === "sack" || $unitLower === "50kg") {
                $totalAvailable = array_sum(array_column($batches, 'stock_sacks'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient whole sacks in stock for {$product['product_name']}. Only {$totalAvailable} sacks available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['stock_sacks'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['stock_sacks']);
                    $b['stock_sacks'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } elseif ($unitLower === "25kg" || $unitLower === "half_sack" || $unitLower === "half") {
                $totalAvailable = array_sum(array_column($batches, 'packaged_25kg'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient 25kg half sacks in stock for {$product['product_name']}. Only {$totalAvailable} available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['packaged_25kg'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['packaged_25kg']);
                    $b['packaged_25kg'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } elseif ($unitLower === "20kg") {
                $totalAvailable = array_sum(array_column($batches, 'packaged_20kg'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient 20kg sacks in stock for {$product['product_name']}. Only {$totalAvailable} available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['packaged_20kg'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['packaged_20kg']);
                    $b['packaged_20kg'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } elseif ($unitLower === "10kg") {
                $totalAvailable = array_sum(array_column($batches, 'packaged_10kg'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient 10kg sacks in stock for {$product['product_name']}. Only {$totalAvailable} available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['packaged_10kg'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['packaged_10kg']);
                    $b['packaged_10kg'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } elseif ($unitLower === "5kg") {
                $totalAvailable = array_sum(array_column($batches, 'packaged_5kg'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient 5kg sacks in stock for {$product['product_name']}. Only {$totalAvailable} available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['packaged_5kg'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['packaged_5kg']);
                    $b['packaged_5kg'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } else {
                // Tinatakal (loose per kg)
                $totalAvailableKg = 0.0;
                $totalLooseKg = 0.0;
                foreach ($batches as $b) {
                    $totalAvailableKg += ($b['stock_sacks'] * 50.0) + ($b['packaged_25kg'] * 25.0) + ($b['packaged_20kg'] * 20.0) + ($b['packaged_10kg'] * 10.0) + ($b['packaged_5kg'] * 5.0) + (float)$b['stock_kg'];
                    $totalLooseKg += (float)$b['stock_kg'];
                }

                if ($qty > $totalAvailableKg) {
                    throw new Exception("Insufficient stock for {$product['product_name']}. Total available is " . number_format($totalAvailableKg, 2) . " kg.");
                }

                $openSackType = !empty($item["openSackType"]) ? strtolower(trim($item["openSackType"])) : null;

                // Auto-open a sack in FIFO order if loose kg is insufficient or explicitly requested
                if ($totalLooseKg < $qty || !empty($openSackType)) {
                    $neededKg = max(0.0, $qty - $totalLooseKg);
                    $openedDesc = "";
                    $openedBatchCode = "";
                    $openedCount = 0;
                    $openedAddedKg = 0.0;

                    // Open from oldest batch that has whole sacks (or requested package tier)
                    foreach ($batches as &$b) {
                        if ($openSackType === '25kg' || $openSackType === 'half') {
                            if ($b['packaged_25kg'] > 0) {
                                $sacksToOpen = max(1, (int)ceil($neededKg / 25.0));
                                $actualOpen = min($sacksToOpen, (int)$b['packaged_25kg']);
                                $b['packaged_25kg'] -= $actualOpen;
                                $b['stock_kg'] += ($actualOpen * 25.0);
                                $openedDesc = "{$actualOpen}x 25kg half sack";
                                $openedBatchCode = $b['batch_code'];
                                $openedCount = $actualOpen;
                                $openedAddedKg = $actualOpen * 25.0;
                                break;
                            }
                        } elseif ($openSackType === '20kg') {
                            if ($b['packaged_20kg'] > 0) {
                                $sacksToOpen = max(1, (int)ceil($neededKg / 20.0));
                                $actualOpen = min($sacksToOpen, (int)$b['packaged_20kg']);
                                $b['packaged_20kg'] -= $actualOpen;
                                $b['stock_kg'] += ($actualOpen * 20.0);
                                $openedDesc = "{$actualOpen}x 20kg sack";
                                $openedBatchCode = $b['batch_code'];
                                $openedCount = $actualOpen;
                                $openedAddedKg = $actualOpen * 20.0;
                                break;
                            }
                        } elseif ($openSackType === '10kg') {
                            if ($b['packaged_10kg'] > 0) {
                                $sacksToOpen = max(1, (int)ceil($neededKg / 10.0));
                                $actualOpen = min($sacksToOpen, (int)$b['packaged_10kg']);
                                $b['packaged_10kg'] -= $actualOpen;
                                $b['stock_kg'] += ($actualOpen * 10.0);
                                $openedDesc = "{$actualOpen}x 10kg sack";
                                $openedBatchCode = $b['batch_code'];
                                $openedCount = $actualOpen;
                                $openedAddedKg = $actualOpen * 10.0;
                                break;
                            }
                        } elseif ($openSackType === '5kg') {
                            if ($b['packaged_5kg'] > 0) {
                                $sacksToOpen = max(1, (int)ceil($neededKg / 5.0));
                                $actualOpen = min($sacksToOpen, (int)$b['packaged_5kg']);
                                $b['packaged_5kg'] -= $actualOpen;
                                $b['stock_kg'] += ($actualOpen * 5.0);
                                $openedDesc = "{$actualOpen}x 5kg sack";
                                $openedBatchCode = $b['batch_code'];
                                $openedCount = $actualOpen;
                                $openedAddedKg = $actualOpen * 5.0;
                                break;
                            }
                        } else {
                            // Default: open 50kg whole sack from oldest batch
                            if ($b['stock_sacks'] > 0) {
                                $sacksToOpen = max(1, (int)ceil($neededKg / 50.0));
                                $actualOpen = min($sacksToOpen, (int)$b['stock_sacks']);
                                $b['stock_sacks'] -= $actualOpen;
                                $b['stock_kg'] += ($actualOpen * 50.0);
                                $openedDesc = "{$actualOpen}x Whole Sack (50kg)";
                                $openedBatchCode = $b['batch_code'];
                                $openedCount = $actualOpen;
                                $openedAddedKg = $actualOpen * 50.0;
                                break;
                            }
                        }
                    }
                    unset($b);

                    if (!empty($openedBatchCode)) {
                        $adjStmt = $conn->prepare("
                            INSERT INTO inventory_adjustment
                            (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
                            VALUES (?, ?, NOW(), 'open_sack', ?, ?, ?, ?)
                        ");
                        $adjStmt->execute([
                            $productId,
                            $openedBatchCode,
                            $openedCount,
                            $openedAddedKg,
                            "Auto-opened {$openedDesc} from Batch {$openedBatchCode} (FIFO rotation) for {$qty} kg retail sale.",
                            $user["full_name"]
                        ]);
                    }
                }

                // Deduct loose kg in FIFO order across active batches
                $remKg = (float)$qty;
                foreach ($batches as &$b) {
                    if ((float)$b['stock_kg'] <= 0.0) continue;
                    $deduct = min($remKg, (float)$b['stock_kg']);
                    $b['stock_kg'] = max(0.0, (float)$b['stock_kg'] - $deduct);
                    $remKg -= $deduct;
                    if ($remKg <= 0.0) break;
                }
                unset($b);
            }

            // Update each batch and detect depletions
            $updBatchStmt = $conn->prepare("
                UPDATE inventory_batch 
                SET stock_sacks = ?, packaged_25kg = ?, packaged_20kg = ?, packaged_10kg = ?, packaged_5kg = ?, stock_kg = ?, status = ?, updated_at = NOW()
                WHERE batch_id = ?
            ");

            $depStmt = $conn->prepare("
                INSERT INTO inventory_adjustment
                (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
                VALUES (?, ?, NOW(), 'batch_depleted', 0, 0, ?, ?)
            ");

            $totalSacks = 0;
            $total25 = 0;
            $total20 = 0;
            $total10 = 0;
            $total5 = 0;
            $totalKg = 0.0;
            $latestBatchCode = $product['batch_number'] ?? 'BATCH-001';
            $latestRecDate = $product['received_date'] ?? date('Y-m-d');

            foreach ($batches as $b) {
                $bVol = ($b['stock_sacks'] * 50) + ($b['packaged_25kg'] * 25) + ($b['packaged_20kg'] * 20) + ($b['packaged_10kg'] * 10) + ($b['packaged_5kg'] * 5) + (float)$b['stock_kg'];
                $newStatus = ($bVol <= 0) ? 'Depleted' : 'Active';

                $updBatchStmt->execute([
                    $b['stock_sacks'],
                    $b['packaged_25kg'],
                    $b['packaged_20kg'],
                    $b['packaged_10kg'],
                    $b['packaged_5kg'],
                    round((float)$b['stock_kg'], 2),
                    $newStatus,
                    $b['batch_id']
                ]);

                if ($newStatus === 'Depleted' && $b['status'] === 'Active') {
                    $depStmt->execute([
                        $productId,
                        $b['batch_code'],
                        "Batch {$b['batch_code']} for {$product['product_name']} fully sold out (0 kg remaining) — batch completed & archived.",
                        $user["full_name"]
                    ]);
                }

                if ($newStatus === 'Active') {
                    $totalSacks += (int)$b['stock_sacks'];
                    $total25 += (int)$b['packaged_25kg'];
                    $total20 += (int)$b['packaged_20kg'];
                    $total10 += (int)$b['packaged_10kg'];
                    $total5 += (int)$b['packaged_5kg'];
                    $totalKg += (float)$b['stock_kg'];
                    $latestBatchCode = $b['batch_code'];
                    $latestRecDate = $b['received_date'];
                }
            }

            // Synchronize inventory table directly from batch sums
            $updInv = $conn->prepare("
                UPDATE inventory
                SET stock_sacks = ?, packaged_25kg = ?, stock_kg = ?, packaged_5kg = ?, packaged_10kg = ?, packaged_20kg = ?, batch_number = ?, received_date = ?
                WHERE product_id = ?
            ");
            $updInv->execute([$totalSacks, $total25, round($totalKg, 2), $total5, $total10, $total20, $latestBatchCode, $latestRecDate, $productId]);

        } else {
            // Legacy / standalone inventory table fallback
            if ($unitLower === "sack" || $unitLower === "50kg") {
                if ($qty > $stockSacks) throw new Exception("Insufficient whole sacks in stock for {$product['product_name']}.");
                $stockSacks -= (int)$qty;
            } elseif ($unitLower === "25kg") {
                if ($qty > $p25) throw new Exception("Insufficient 25kg half sacks in stock for {$product['product_name']}.");
                $p25 -= (int)$qty;
            } elseif ($unitLower === "20kg") {
                if ($qty > $p20) throw new Exception("Insufficient 20kg sacks in stock for {$product['product_name']}.");
                $p20 -= (int)$qty;
            } elseif ($unitLower === "10kg") {
                if ($qty > $p10) throw new Exception("Insufficient 10kg sacks in stock for {$product['product_name']}.");
                $p10 -= (int)$qty;
            } elseif ($unitLower === "5kg") {
                if ($qty > $p5) throw new Exception("Insufficient 5kg sacks in stock for {$product['product_name']}.");
                $p5 -= (int)$qty;
            } else {
                if ($stockKg >= $qty) {
                    $stockKg -= $qty;
                } elseif ($stockSacks > 0) {
                    $stockSacks -= 1;
                    $stockKg = max(0.0, ($stockKg + 50.0) - $qty);
                } else {
                    throw new Exception("Insufficient loose stock for {$product['product_name']}.");
                }
            }

            $stmt = $conn->prepare("
                UPDATE inventory
                SET stock_sacks = ?, packaged_25kg = ?, stock_kg = ?, packaged_5kg = ?, packaged_10kg = ?, packaged_20kg = ?
                WHERE product_id = ?
            ");
            $stmt->execute([$stockSacks, $p25, $stockKg, $p5, $p10, $p20, $productId]);
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
        "cashierId" => (int)$user["user_id"],
        "cashierUsername" => $user["username"],
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