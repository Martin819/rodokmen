<?php

define('REDBEAN_MODEL_PREFIX', '\Rodokmen\\Model');

// Libs
require __DIR__.'/../lib/Slim/Slim/Slim.php';
Slim\Slim::registerAutoloader();
require __DIR__.'/../lib/Twig/Twig/Autoloader.php';
Twig_Autoloader::register();
// require __DIR__.'/../lib/Twig/Extensions/Autoloader.php';
// Twig_Extensions_Autoloader::register();
require __DIR__.'/../lib/Slim/Views/Twig.php';
require __DIR__.'/../lib/Slim/Views/TwigExtension.php';
require __DIR__.'/../lib/pbkdf2/pbkdf2.php';
// require __DIR__.'/../lib/RedBeanPHP/rb.phar';
require __DIR__.'/../lib/RedBeanPHP/loader.php';
require __DIR__.'/../lib/PHPThumb/ThumbLib.inc.php';

// App
require __DIR__.'/logger.php';
require __DIR__.'/app.php';

// Model
require __DIR__.'/utils.php';
require __DIR__.'/db.php';
require __DIR__.'/session.php';
require __DIR__.'/config.php';
require __DIR__.'/pod.php';
require __DIR__.'/user.php';
require __DIR__.'/person.php';
require __DIR__.'/marriage.php';
require __DIR__.'/relation.php';
require __DIR__.'/lineage.php';
require __DIR__.'/media.php';
require __DIR__.'/place.php';

// Router
require __DIR__.'/../router/routerbase.php';
require __DIR__.'/../router/routermain.php';
require __DIR__.'/../router/routerlineage.php';
require __DIR__.'/../router/routergallery.php';
require __DIR__.'/../router/routermap.php';
