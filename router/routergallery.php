<?php
namespace Rodokmen;
use \JSCB\Callback;


RouterBase::regRouter('Rodokmen\RouterGallery');

class RouterGallery extends RouterBase
{
	public function setup($app)
	{
		$self = $this;

		$app->get('/gallery', $this->authRole(Role::Member, true), function() use ($app)
		{
			$media = new Media();
			$app->view->setData('media', $media->findAllByYear());
			$app->render('gallery.html');
		})->name('gallery');

		$app->get('/gallery/download/:id', $this->authRole(Role::Member, true), function($id) use ($app, $self)
		{
			$bean = RouterBase::getBean($id, new Media(), $app);
			$self->downloadFile($bean->origFilename());
		})->name('gallery-download');

		$app->group('/ajax', $this->checkAjax(), function () use ($app, $self)
		{
			// Upload media:
			$app->get('/gallery/upload', $self->authRole(Role::Contrib), function() use ($app)
			{
				$app->view->setData('upload', true);
				$app->view->setData('action', $app->urlFor('gallery-upload-p'));
				$app->render('ajax/form-gallery-edit.html');
			})->name('gallery-upload');
			$app->post('/gallery/upload', $self->authRole(Role::Contrib), function() use ($app)
			{
				DB::transaction(DB::data, function() use ($app)
				{
					$media = new Media();
					$bean = $media->setupNew();
					$bean->edit(\array_merge($_FILES, $_POST), true);
					$media->store($bean);
					$app->logOp(Op::Create, $bean);
					return array('reload');
				});
			})->name('gallery-upload-p');

			// Edit media:
			$app->get('/gallery/edit/:id', $self->authRole(Role::Contrib), function($id) use ($app)
			{
				$bean = RouterBase::getBean($id, new Media(), $app);
				$app->view->setData(array(
					'upload' => false,
					'bean' => $bean,
					'action' => $app->urlFor('gallery-edit-p')
				));
				$app->render('ajax/form-gallery-edit.html');
			})->name('gallery-edit');
			$app->post('/gallery/edit', $self->authRole(Role::Contrib), function() use ($app)
			{
				DB::transaction(DB::data, function() use ($app)
				{
					$media = new Media();
					$bean = RouterBase::getBean($app->request->post('rdk_id'), $media, $app);
					$bean->edit($_POST);
					$media->store($bean);
					$app->logOp(Op::Update, $bean);
					return array('reload');
				});
			})->name('gallery-edit-p');

			// Delete media:
			$app->get('/gallery/delete/:id', $self->authRole(Role::Contrib), function($id) use ($app)
			{
				$bean = RouterBase::getBean($id, new Media(), $app);
				$app->view->setData('bean', $bean);
				$app->view->setData('action', $app->urlFor('gallery-delete-p'));
				$app->render('ajax/form-gallery-delete.html');
			})->name('gallery-delete');
			$app->post('/gallery/delete', $self->authRole(Role::Contrib), function() use ($app)
			{
				$media = new Media();
				$bean = RouterBase::getBean($app->request->post('rdk_id'), $media, $app);
				$app->logOp(Op::Delete, $bean);
				$media->trash($bean);
				Callback::sendCb('reload');
			})->name('gallery-delete-p');
		});
	}

	public function __construct($app)
	{
		parent::__construct($app);
	}
};
