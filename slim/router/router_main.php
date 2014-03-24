<?php
namespace Rodokmen;


class RouterMain
{
	private $app;

	private function check_https()
	{
		if ($this->app->environment['Rodokmen.force_https'] && $this->app->environment['slim.url_scheme'] != 'https')
			$this->app->redirect('https://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'], 301);
	}

	private function authRole($role, $redir = false)
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

	private function checkAjax()
	{
		return function()
		{
			// TODO: if production, halt if not ajax request (is this needed? probably not, the header can be spoofed anyway)
			// TODO: remove?
		};
	}

	private function contentJson()
	{
		$app = $this->app;
		return function() use ($app)
		{
			$app->response->headers->set('Content-Type', 'application/json');
		};
	}

	public function setup()
	{
		$app = $this->app;

		/*
			NOTE:
			Besides the routes defined here,
			there are also two defined in .htaccess:
			  /rs/*.ext, which is rewritten as /view/rs/ext/*.ext
			  /media/*, which is rewriten as /data/media/*
		*/


		// Global settings:

		$app->view->setData('root', $app->request->getRootUri());
		$app->view->setData('contrib', $app->user()->roleMatches(Role::AllContrib));
		header_remove('X-Powered-By');
		\Slim\Route::setDefaultConditions(array
		(
    	'id' => '\d*'
    ));


    // Main routes:

		$app->get('/', $this->authRole(Role::AllMembers, true), function() use ($app)
		{
			// var_dump($app->user());
			// $app->user()->logout();
			$app->log->debug('Rendering home!');
			$app->render('home.html');
		})->name('home');

		$app->get('/login', function() use ($app)
		{
			//FIXME: already logged in → redirect
			$app->render('login.html');
		})->name('login');

		$app->post('/login', function() use ($app)
		{
			$user = User::fromUsername($app->request->post('rdk_username'));
			if ($user && $user->login($app->request->post('rdk_pw')))
				$app->redirect($app->urlFor('home'));
			else
				echo 'login error';  // FIXME: flash error, redirect back
		});


		// Ajax routes:

		$app->group('/ajax', $this->checkAjax(), function () use ($app)
		{
			// Tree routes:

			$app->get('/lineage', $this->authRole(Role::AllMembers), $this->contentJson(), function() use ($app)
			{
				$l = new Lineage();
				echo $l->toJson();
			});

			$app->get('/person/:id', $this->authRole(Role::AllMembers), function($id) use ($app)
			{
				$person = new Person();
				$bean = $person->fromId($id);
				if ($bean)
				{
					$app->view->setData($bean->sidebarData());
					$app->render('ajax/sidebar-person.html');
				} else $app->halt(404);
			});

			$app->get('/marriage/:id', $this->authRole(Role::AllMembers), function($id) use ($app)
			{
				$marriage = new Marriage();
				$bean = $marriage->fromId($id);
				if ($bean)
				{
					$app->view->setData($bean->sidebarData());
					$app->render('ajax/sidebar-marriage.html');
				} else $app->halt(404);
			});


			// ... todo ...

		});
	}

	public function __construct($app)
	{
		$this->app = $app;
		$this->setup();
	}
};
