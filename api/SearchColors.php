<?php

require_once dirname(__DIR__) . '/config/api.php';
$user = requireUser();
$data = readRequest();
$search = '%' . requireString($data, 'search', 255, true) . '%';
$userId = $user['id'];

$conn = require dirname(__DIR__) . '/config/database.php';
$stmt = $conn->prepare('SELECT Name FROM Colors WHERE Name LIKE ? AND UserId = ? ORDER BY ID');
$stmt->bind_param('si', $search, $userId);
$stmt->execute();
$result = $stmt->get_result();
$colors = [];
while ($row = $result->fetch_assoc()) {
    $colors[] = $row['Name'];
}
$stmt->close();
$conn->close();
sendJson(['results' => $colors, 'error' => '']);
