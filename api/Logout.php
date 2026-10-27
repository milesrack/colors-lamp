<?php

require_once dirname(__DIR__) . '/config/session.php';
requireJsonPost();
startSession();
requireUser();
destroySession();
header('Content-Type: application/json');
echo '{"error":""}';
