<?php

require_once dirname(__DIR__) . '/config/api.php';
$user = requireUser();
readRequest();
sendJson($user + ['error' => '']);
