<?php
namespace Rodokmen;


RouterBase::regRouter('Rodokmen\RouterGallery');

class RouterGallery extends RouterBase
{
	public function setup($app)
	{
		$app->get('/gallery', $this->authRole(Role::AllMembers, true), function() use ($app)
		{
			$media = new Media();
			$app->view->setData('media', $media->findAllByYear());
			$app->render('gallery.html');
		})->name('gallery');

		$app->get('/gallery/download/:id', $this->authRole(Role::AllMembers, true), function($id) use ($app)
		{
			$bean = self::getBean($id, new Media(), $app);
			$this->downloadFile($bean->origFilename());
		})->name('gallery-download');

		$app->group('/ajax', $this->checkAjax(), function () use ($app)
		{
			// Upload media:
			$app->get('/gallery/upload', $this->authRole(Role::AllContrib), function() use ($app)
			{
				$app->view->setData('upload', true);
				$app->view->setData('action', $app->urlFor('gallery-upload-p'));
				$app->render('ajax/form-gallery-edit.html');
			})->name('gallery-upload');
			$app->post('/gallery/upload-p', $this->authRole(Role::AllContrib), function() use ($app)
			{
				$media = new Media();
				$bean = $media->setupNew();
				if (!$bean->addUpload($app->request)) $app->halt(403);
				$media->store($bean);
				// FIXME: log
			})->name('gallery-upload-p');

			// Edit media:
			$app->get('/gallery/edit/:id', $this->authRole(Role::AllContrib), function($id) use ($app)
			{
				$bean = self::getBean($id, new Media(), $app);
				$app->view->setData(array(
					'upload' => false,
					'bean' => $bean,
					'action' => $app->urlFor('gallery-edit-p')
				));
				$action = $app->urlFor('gallery-edit-p');
				error_log("action = $action");
				$app->render('ajax/form-gallery-edit.html');
			})->name('gallery-edit');
			$app->post('/gallery/edit-p', $this->authRole(Role::AllContrib), function() use ($app)
			{
				$media = new Media();
				$bean = self::getBean($app->request->post('rdk_id'), $media, $app);
				if (!$bean->edit($app->request)) $app->halt(403);
				$media->store($bean);
				// FIXME: log
			})->name('gallery-edit-p');

			// Delete media:
			$app->get('/gallery/delete/:id', $this->authRole(Role::AllContrib), function($id) use ($app)
			{
				$bean = self::getBean($id, new Media(), $app);
				$app->view->setData('bean', $bean);
				$app->view->setData('action', $app->urlFor('gallery-delete-p'));
				$app->render('ajax/form-gallery-delete.html');
			})->name('gallery-delete');
			$app->post('/gallery/delete-p', $this->authRole(Role::AllContrib), function() use ($app)
			{
				$media = new Media();
				$bean = self::getBean($app->request->post('rdk_id'), $media, $app);
				$media->trash($bean);
				// FIXME: log
			})->name('gallery-delete-p');
		});
	}

	public function __construct($app)
	{
		parent::__construct($app);
	}
};
