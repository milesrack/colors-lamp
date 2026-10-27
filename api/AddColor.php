<?php

require_once dirname(__DIR__) . '/config/api.php';
$user = requireUser();
$data = readRequest();
$color = requireString($data, 'color', 255);
$userId = $user['id'];

$conn = require dirname(__DIR__) . '/config/database.php';
$stmt = $conn->prepare('INSERT INTO Colors (UserId, Name) VALUES (?, ?)');
$stmt->bind_param('is', $userId, $color);
$stmt->execute();
$stmt->close();
$conn->close();
sendJson(['error' => '']);
