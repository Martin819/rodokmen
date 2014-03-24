<?php
require __DIR__.'/model/require.all.php';

$app = new Rodokmen\App();
$router = new Rodokmen\RouterMain($app);
$app->run();
