<?php

require_once dirname(__DIR__) . '/config/api.php';
requireUser();
readRequest();
destroySession();
sendJson(['error' => '']);
