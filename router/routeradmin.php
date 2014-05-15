<?php
namespace Rodokmen;
use \JSCB\Callback;


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
				DB::transaction(DB::auth, function() use ($app)
				{
					$user = User::setupNew();
					$user->edit($_POST, true);
					$app->logOp(Op::Create, User::bean, $user->id());
					return array('reload');
				});
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
				DB::transaction(DB::auth, function() use ($app)
				{
					$id = $app->request->post('rdk_id');
					$user = User::fromId($id);
					if (!$user) $app->halt(403);
					$user->edit($_POST);
					$app->logOp(Op::Update, User::bean, $id);
					return array('reload');
				});
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
				Callback::sendCb('reload');
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
				DB::transaction(DB::auth, function() use ($app)
				{
					$user = $app->user();
					$user->editPassword($_POST);
					$app->logOp(Op::Update, User::bean, $user->id());
					return array('vexClose');
				});
			})->name('admin-user-changepw-p');
		});
	}

	public function __construct($app)
	{
		parent::__construct($app);
	}
};
