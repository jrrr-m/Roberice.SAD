<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

$username = trim($data["username"] ?? "");
$password = $data["password"] ?? "";

if ($username === "" || $password === "") {
    echo json_encode([
        "success" => false,
        "message" => "Username and password are required."
    ]);
    exit;
}

try {
    $stmt = $conn->prepare("
        SELECT user_id, username, password, full_name, email, role, account_status, permissions
        FROM users
        WHERE username = ? OR (email IS NOT NULL AND LOWER(email) = LOWER(?))
        LIMIT 1
    ");

    $stmt->execute([$username, $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Check if there is an account registration request pending or rejected
        $reqStmt = $conn->prepare("
            SELECT request_id, full_name, status, rejection_reason 
            FROM account_requests 
            WHERE username = ? OR LOWER(email) = LOWER(?)
            ORDER BY request_id DESC 
            LIMIT 1
        ");
        $reqStmt->execute([$username, $username]);
        $pendingReq = $reqStmt->fetch(PDO::FETCH_ASSOC);

        if ($pendingReq) {
            if ($pendingReq["status"] === "Pending") {
                echo json_encode([
                    "success" => false,
                    "message" => "Account registration request for '" . htmlspecialchars($pendingReq["full_name"]) . "' is currently pending administrator approval. Please wait for an administrator to approve it."
                ]);
                exit;
            } elseif ($pendingReq["status"] === "Rejected") {
                $reason = !empty($pendingReq["rejection_reason"]) ? " (" . htmlspecialchars($pendingReq["rejection_reason"]) . ")" : "";
                echo json_encode([
                    "success" => false,
                    "message" => "Your account registration request was declined by the administrator" . $reason . "."
                ]);
                exit;
            }
        }

        echo json_encode([
            "success" => false,
            "message" => "Invalid username or password."
        ]);
        exit;
    }

    if ($user["account_status"] !== "Active") {
        echo json_encode([
            "success" => false,
            "message" => "Account is inactive. Please contact the administrator."
        ]);
        exit;
    }

    $validPassword = false;

    if (password_verify($password, $user["password"])) {
        $validPassword = true;
    } elseif (hash_equals($user["password"], $password)) {
        $validPassword = true;

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $update = $conn->prepare("
            UPDATE users
            SET password = ?
            WHERE user_id = ?
        ");

        $update->execute([
            $hashedPassword,
            $user["user_id"]
        ]);
    }

    if (!$validPassword) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid username or password."
        ]);
        exit;
    }

    $perms = [];
    if (!empty($user["permissions"])) {
        if (is_array($user["permissions"])) {
            $perms = array_values($user["permissions"]);
        } else {
            $decoded = json_decode($user["permissions"], true);
            if (is_array($decoded)) {
                $perms = array_values($decoded);
            }
        }
    }
    if (empty($perms)) {
        if (strtolower(trim($user["role"] ?? "")) === 'admin') {
            $perms = ['dashboard', 'pos', 'view-inventory', 'inventory', 'products', 'transactions', 'sales-report', 'file-manager', 'audit', 'users'];
        } else {
            $perms = ['pos', 'view-inventory', 'transactions', 'sales-report'];
        }
    }

    $normalizedRole = strtolower(trim($user["role"] ?? "cashier"));

    echo json_encode([
        "success" => true,
        "user" => [
            "id" => (string)$user["user_id"],
            "username" => $user["username"],
            "name" => $user["full_name"],
            "email" => $user["email"] ?? "",
            "role" => $normalizedRole,
            "status" => strtolower(trim($user["account_status"] ?? "active")),
            "permissions" => $perms
        ]
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Unable to login."
    ]);
}
?>