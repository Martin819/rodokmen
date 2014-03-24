<?php
namespace Rodokmen;
use \Slim;


class LogMiddleware extends \Slim\Middleware
{
	public function call()
	{
		$env = $this->app->environment;
		$env['slim.errors'] = fopen(__DIR__.'/../data/log', 'a');
		$this->next->call();
	}
}

class App extends Slim\Slim
{
	const name = 'Rodokmen';

	private $config;
	private $usr;

	// private function get_locale()
	// {
	// 	// TODO: detect based on the Accept-Language header
	// 	return 'en_GB';
	// }

	private function setup_twig()
	{
		$this->view->parserOptions = array(
			'charset' => 'utf-8',
			'cache' => __DIR__.'/../cache',
			'auto_reload' => true,
			'strict_variables' => false,
			'autoescape' => true
		);
		$this->view->parserExtensions = array(new \Slim\Views\TwigExtension());

		// l18n disabled for now, see also require.all.php

		// $this->view->getInstance()->addExtension(new \Twig_Extensions_Extension_I18n());

		// $locale = $this->get_locale();
		// putenv('LC_ALL='.$locale);
		// setlocale(LC_ALL, $locale);
		// bindtextdomain($this->getName(), __DIR__.'/../view/locale');
		// bind_textdomain_codeset($this->getName(), 'UTF-8');
		// textdomain($this->getName());
	}

	private function setup_db()
	{
		Db::setup($this->config->db_auth,
							$this->config->db_data,
							$this->config->db_freeze === true);
	}

	private function setup_modes()
	{
		$this->configureMode('development', function ()
		{
			// FIXME
			$this->config(array
			(
				'log.enabled' => true,
				'log.level' => \Slim\Log::DEBUG,
				// 'log.writer' => new Logger(__DIR__.'/../data/log'),
				'debug' => true
			));
		});

		$this->configureMode('production', function ()
		{
			// FIXME
			$this->config(array
			(
				'log.enabled' => true,
				'log.level' => \Slim\Log::NOTICE,
				// 'log.writer' => new Logger(__DIR__.'/../data/log'),
				'debug' => false
			));
			$this->environment['Rodokmen.force_https'] = true;
		});
	}

	public function __construct($name = self::name)
	{
		parent::__construct(array
		(
			'mode' => 'developement',
			'view' => new \Slim\Views\Twig(),
			'templates.path' => __DIR__.'/../view'
		));

		// $this->add(new LogMiddleware());
		$this->log->setWriter(new Logger($this, __DIR__.'/../data/log'));

		$this->setName($name);
		self::$apps[$name] = $this;

		// TODO: slim.errors

		$this->config = new Config();

		$this->setup_twig();
		$this->setup_db();
		$this->setup_modes();

		// var_dump($this->log);

		$this->usr = User::fromSession();

		// User::setupNew('vk', Role::Contrib, 'pk');
		// $p = new Person();
		// $bean = $p->setupNew();
		// $bean->name = 'Nabla';
		// \R::store($bean);
		// $m = new marriage();
		// $bean = $m->setupNew();
		// \R::store($bean);
		// $r = new Relation();
		// $bp = $p->fromId(5);
		// $bm = $m->fromId(1);
		// $br = $r->relate($bp, $bm, 'parent');
		// \R::store($br);
	}

	public function __destruct()
	{
		Db::close();
	}

	public static function getApp($name = self::name)
	{
		return parent::getInstance($name);
	}

	public function user()
	{
		return $this->usr;
	}

	public function conf()
	{
		return $this->config;
	}
};
