<?php
namespace Rodokmen;


RouterBase::regRouter('Rodokmen\RouterAdmin');

class RouterAdmin extends RouterBase
{
	public function setup($app)
	{
		$app->get('/admin', $this->authRole(Role::Admin), function() use ($app)
		{
			$app->view->setData(array(
				'users' => User::findAll(),
				'log' => $app->readLogTail()
			));
			$app->render('admin.html');
		})->name('admin');

		$app->group('/ajax', $this->authRole(Role::Admin), $this->checkAjax(), function () use ($app)
		{
			// New user:
			$app->get('/admin/user/new', function() use ($app)
			{
				$app->view->setData('action', $app->urlFor('admin-user-new-p'));
				$app->render('ajax/form-admin-user-edit.html');
			})->name('admin-user-new');
			$app->post('/admin/user/new', function() use ($app)
			{
				$user = User::setupNew();
				if (!$user->edit($app->request, true)) $app->halt(403);
				$app->logOp(Op::Create, User::bean, $user->id());
			})->name('admin-user-new-p');

			// Edit user:
			$app->get('/admin/user/edit/:id', function($id) use ($app)
			{
				$user = User::fromId($id);
				if (!$user) $app->halt(403);
				$app->view->setData(array(
					'user' => $user,
					'action' => $app->urlFor('admin-user-edit-p')
				));
				$app->render('ajax/form-admin-user-edit.html');
			})->name('admin-user-edit');
			$app->post('/admin/user/edit', function() use ($app)
			{
				$id = $app->request->post('rdk_id');
				$user = User::fromId($id);
				if (!$user) $app->halt(403);
				if (!$user->edit($app->request)) $app->halt(403);
				$app->logOp(Op::Update, User::bean, $id);
			})->name('admin-user-edit-p');

			// Delete user:
			$app->get('/admin/user/delete/:id', function($id) use ($app)
			{
				$user = User::fromId($id);
				if (!$user) $app->halt(403);
				$app->view->setData(array(
					'user' => $user,
					'todelete' => $id != $app->user()->id(),
					'action' => $app->urlFor('admin-user-delete-p')
				));
				$app->render('ajax/form-admin-user-delete.html');
			})->name('admin-user-delete');
			$app->post('/admin/user/delete', function() use ($app)
			{
				$id = \intval($app->request->post('rdk_id'));
				if (($id < 1) || ($id == $app->user()->id())) $app->halt(403);
				$user = User::fromId($id);
				if (!$user) $app->halt(403);
				$app->logOp(Op::Delete, User::bean, $id);
				$user->trash();
			})->name('admin-user-delete-p');
		});

		$app->group('/ajax', $this->authRole(Role::Contrib), $this->checkAjax(), function () use ($app)
		{
			// Change password for contrib user:
			$app->get('/admin/user/changepw', function() use ($app)
			{
				$app->view->setData('action', $app->urlFor('admin-user-changepw-p'));
				$app->render('ajax/form-admin-user-changepw.html');
			})->name('admin-user-changepw');
			$app->post('/admin/user/changepw', function() use ($app)
			{
				$rq = $app->request;
				$user = $app->user();
				if (!$user->validatePassword($rq->post('rdk_pw_current'))) $app->halt(403);
				if (!$user->editPassword($rq)) $app->halt(403);
				$app->logOp(Op::Update, User::bean, $user->id());
			})->name('admin-user-changepw-p');
		});
	}

	public function __construct($app)
	{
		parent::__construct($app);
	}
};
