<?php
namespace Rodokmen;
use \JSCB\Callback;


RouterBase::regRouter('Rodokmen\RouterMain');

class RouterMain extends RouterBase
{
	public function setup($app)
	{
		// Main routes:

		$app->get('/', $this->authRole(Role::Member, true), function() use ($app)
		{
			$app->render('home.html');
		})->name('home');

		$app->get('/login', function() use ($app)
		{
			if ($app->user()->roleMatches(Role::Member)) $app->redirect($app->urlFor('home'));
			$app->render('login.html');
		})->name('login');
		$app->post('/login', function() use ($app)
		{
			$user = User::fromUsername($app->request->post('rdk_username'));
			if ($user && $user->login($app->request->post('rdk_pw')))
				Callback::sendCb('location', array($app->urlFor('home')));
			else
				Callback::sendCb('loginFail');
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
