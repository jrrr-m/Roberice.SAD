<?php

$host = "localhost";
$dbname = "roberice_db";
$username = "root";
$password = "";

try {
    $conn = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password
    );

    $conn->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

} catch (PDOException $e) {
    if (php_sapi_name() === 'cli') {
        fwrite(STDERR, "[Roberice DB Error] Cannot connect to MySQL database on {$host}:{$dbname}.\n");
        fwrite(STDERR, "Details: " . $e->getMessage() . "\n");
        fwrite(STDERR, "Please ensure MySQL is started in the XAMPP Control Panel on port 3306.\n");
        exit(1);
    }

    http_response_code(503);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "success" => false,
        "error" => "DATABASE_CONNECTION_ERROR",
        "message" => "Cannot connect to MySQL database. Please make sure MySQL is started in the XAMPP Control Panel on port 3306."
    ]);
    exit;
}
?>