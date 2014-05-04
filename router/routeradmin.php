<?php
namespace Rodokmen;


RouterBase::regRouter('Rodokmen\RouterAdmin');

class RouterAdmin extends RouterBase
{
	public function setup($app)
	{
		$self = $this;

		$app->get('/admin', $this->authRole(Role::Admin), function() use ($app)
		{
			$app->view->setData('users', User::findAll());
			$app->render('admin.html');
		})->name('admin');

		$app->group('/ajax', $this->authRole(Role::Admin), $this->checkAjax(), function () use ($app, $self)
		{
		});
	}

	public function __construct($app)
	{
		parent::__construct($app);
	}
};
