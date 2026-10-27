<?php

require_once dirname(__DIR__) . '/config/session.php';
requireJsonPost();
startSession();
$user = requireUser();
header('Content-Type: application/json');
echo json_encode($user + ['error' => '']);
