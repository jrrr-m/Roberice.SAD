<?php
header("Content-Type: application/json; charset=UTF-8");
require_once "db.php";

$method = $_SERVER["REQUEST_METHOD"];

// Handle GET request: Return selectable roles dynamically from the database
if ($method === "GET") {
    try {
        $baseRoles = ["Cashier", "Inventory Clerk", "Store Manager"];
        $customStmt = $conn->query("SELECT role_name FROM custom_roles ORDER BY role_name ASC");
        $custom = $customStmt->fetchAll(PDO::FETCH_COLUMN);
        $allRoles = array_values(array_unique(array_merge($baseRoles, $custom)));
        echo json_encode([
            "success" => true,
            "roles" => $allRoles
        ]);
        exit;
    } catch (Exception $e) {
        echo json_encode([
            "success" => true,
            "roles" => ["Cashier", "Inventory Clerk", "Store Manager"]
        ]);
        exit;
    }
}

if ($method !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Only POST is accepted."
    ]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    $input = $_POST;
}

$fullName = trim($input["full_name"] ?? "");
$email    = trim($input["email"] ?? "");
$username = trim($input["username"] ?? "");
$password = $input["password"] ?? "";
$role     = trim($input["role"] ?? "Cashier");

// 1. Validate Full Name
if ($fullName === "" || mb_strlen($fullName) < 2) {
    echo json_encode([
        "success" => false,
        "message" => "Full name must be at least 2 characters long."
    ]);
    exit;
}

// 2. Validate Email
if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "A valid email address is required (e.g. name@example.com)."
    ]);
    exit;
}

// 3. Validate Username (letters, numbers, underscore, period)
if ($username === "" || !preg_match('/^[a-zA-Z0-9_.]{3,30}$/', $username)) {
    echo json_encode([
        "success" => false,
        "message" => "Username must be between 3 and 30 characters and contain only letters, numbers, underscores, or periods."
    ]);
    exit;
}

// 4. Validate Password
if ($password === "" || strlen($password) < 6) {
    echo json_encode([
        "success" => false,
        "message" => "Password must be at least 6 characters long."
    ]);
    exit;
}

// 5. Normalize requested role dynamically connected to custom_roles in DB
$allowedRoles = ["Cashier", "Inventory Clerk", "Store Manager", "Custom Staff"];
try {
    $dbCustom = $conn->query("SELECT role_name FROM custom_roles")->fetchAll(PDO::FETCH_COLUMN);
    if (!empty($dbCustom)) {
        $allowedRoles = array_merge($allowedRoles, $dbCustom);
    }
} catch (Exception $e) {}

$foundRole = null;
foreach ($allowedRoles as $ar) {
    if (strcasecmp($ar, $role) === 0) {
        $foundRole = $ar;
        break;
    }
}
$role = $foundRole ?: "Cashier";

try {
    // 6. Check if username is already registered in active users
    $stmtUser = $conn->prepare("SELECT user_id FROM users WHERE username = ? LIMIT 1");
    $stmtUser->execute([$username]);
    if ($stmtUser->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "The username '{$username}' is already in use by an existing account. Please choose another username."
        ]);
        exit;
    }

    // 7. Check if email is already registered in active users
    $stmtEmail = $conn->prepare("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1");
    $stmtEmail->execute([$email]);
    if ($stmtEmail->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "The email '{$email}' is already associated with an account. Please sign in or use another email."
        ]);
        exit;
    }

    // 8. Check if username has a pending request
    $stmtReqUser = $conn->prepare("SELECT request_id FROM account_requests WHERE username = ? AND status = 'Pending' LIMIT 1");
    $stmtReqUser->execute([$username]);
    if ($stmtReqUser->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "An account registration request for username '{$username}' is already pending administrator approval."
        ]);
        exit;
    }

    // 9. Check if email has a pending request
    $stmtReqEmail = $conn->prepare("SELECT request_id FROM account_requests WHERE LOWER(email) = LOWER(?) AND status = 'Pending' LIMIT 1");
    $stmtReqEmail->execute([$email]);
    if ($stmtReqEmail->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "A registration request with email '{$email}' is already awaiting administrator approval."
        ]);
        exit;
    }

    // 10. Hash password securely
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // 11. Insert pending account request
    $insertStmt = $conn->prepare("
        INSERT INTO account_requests (full_name, username, email, password, role, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'Pending', NOW())
    ");
    $insertStmt->execute([
        $fullName,
        $username,
        $email,
        $hashedPassword,
        $role
    ]);

    $requestId = (int)$conn->lastInsertId();

    echo json_encode([
        "success" => true,
        "message" => "Registration request submitted successfully! An administrator will review and approve your account shortly.",
        "request_id" => $requestId
    ]);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error processing registration request: " . $e->getMessage()
    ]);
    exit;
}
?>
