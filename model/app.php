<?php
namespace Rodokmen;
use \Slim;


class LogMiddleware extends \Slim\Middleware
{
	//FIXME: wtf is this
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

	private function check_https()
	{
		if ($this->config('mode') == 'production' && $this->environment['slim.url_scheme'] != 'https')
		{
			// Can't use $app->redirect, $app is not constructed nor running yet
			\header('Location: https://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']);
			exit();
		}
	}

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
		$self = $this;

		$this->configureMode('development', function () use ($self)
		{
			$self->config(array
			(
				'log.enabled' => true,
				'log.level' => \Slim\Log::DEBUG,
				'debug' => true
			));
		});

		$this->configureMode('production', function () use ($self)
		{
			$self->config(array
			(
				'log.enabled' => true,
				'log.level' => \Slim\Log::NOTICE,
				'debug' => false
			));
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

		\date_default_timezone_set('UTC');

		$this->log->setWriter(new Logger($this, __DIR__.'/../data/log'));

		$this->setName($name);
		self::$apps[$name] = $this;

		$this->config = new Config();

		$this->setup_twig();
		$this->setup_db();
		$this->setup_modes();

		$this->check_https();

		$this->usr = User::fromSession();
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

	public function logOp($op, $what, $id = false)
	{
		if ($id === false)
		{
			// If no $id is supplied, assume $what is a bean
			$id = $what->id;
			$what = $what->getMeta('type');
		}
		$this->log->notice(sprintf("%s %s id: %u", Op::string($op), $what, $id));
	}

	public function logOpAll($op, $beans)
	{
		foreach ($beans as $bean) $this->logOp($op, $bean);
	}

	public function readLogTail($tailBytes = 524288)  // 0.5MB by default
	{
		$writer = $this->log->getWriter();
		return $writer->tail($tailBytes);
	}

	public function formResponse($callback, $data = '')
	{
		$this->response->headers->set('Content-Type', 'application/json');
		echo \json_encode(array(
				'callback' => $callback,
				'data' => $data
			),
			JSON_HEX_QUOT|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS);
	}
};
