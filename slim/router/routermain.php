<?php
namespace Rodokmen;


RouterBase::regRouter('Rodokmen\RouterMain');

class RouterMain extends RouterBase
{
	public function setup($app)
	{
		// Main routes:

		$app->get('/', $this->authRole(Role::AllMembers, true), function() use ($app)
		{
			// $app->log->debug('Rendering home!');
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

		$app->get('/logout', function() use ($app)
		{
			$app->user()->logout();
			$app->redirect($app->urlFor('login'));
		})->name('logout');
	}

	public function __construct($app)
	{
		parent::__construct($app);
	}
};
