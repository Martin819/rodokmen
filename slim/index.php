<?php
require __DIR__.'/model/require.all.php';

$app = new Rodokmen\App();
Rodokmen\RouterBase::createAll($app);
$app->run();
