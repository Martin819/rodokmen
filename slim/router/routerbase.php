<?php
namespace Rodokmen;


abstract class RouterBase
{
	static private $routers = array();

	private $app;

	private function check_https()
	{
		// FIXME: use this
		if ($this->app->environment['Rodokmen.force_https'] && $this->app->environment['slim.url_scheme'] != 'https')
			$this->app->redirect('https://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'], 301); // FIXME: use request url
	}


	protected static function getBean($id, $pod, $app)
	{
		$bean = $pod->fromId($id);
		if (!$bean) $app->halt(404);
		else return $bean;
	}

	protected function authRole($role, $redir = false)
	{
		$app = $this->app;
		return function() use ($app, $role, $redir)
		{
			if (!$app->user()->roleMatches($role))
			{
				if (!$redir) $app->halt(403);
				else $app->redirect($app->urlFor('login'));
			} else
			{
				$app->view->appendData(array('username' => $app->user()->username()));
			}
		};
	}

	protected function checkAjax()
	{
		return function()
		{
			// TODO: if production, halt if not ajax request
			// NOTE: needed to prevent non-ajax form submit
		};
	}

	protected function contentJson()
	{
		$app = $this->app;
		return function() use ($app)
		{
			$app->response->headers->set('Content-Type', 'application/json');
		};
	}

	abstract public function setup($app);

	public function __construct($app)
	{
		$this->app = $app;
		$this->setup($app);
	}


	static public function regRouter($name)
	{
		self::$routers[] = $name;
	}

	static public function createAll($app)
	{
		/*
			NOTE:
			Besides the routes defined in all the routers,
			there are also two defined in .htaccess:
			  /rs/*.ext, which is rewritten as /view/rs/ext/*.ext
			  /media/*, which is rewriten as /data/media/*
		*/

		// Setup common settings:
		$app->view->setData('username', $app->user()->username());
		$app->view->setData('contrib', $app->user()->roleMatches(Role::AllContrib));
		$app->view->setData('admin', $app->user()->roleMatches(Role::Admin));
		$app->view->setData('ajs', 'javascript:void(0)');
		header_remove('X-Powered-By');
		\Slim\Route::setDefaultConditions(array
		(
			'id' => '\d*'   // An ID should be a number
		));

		// Create routers:
		foreach (self::$routers as $name)
		{
			new $name($app);
		}
	}
};
