<?php
namespace Rodokmen;


RouterBase::regRouter('Rodokmen\RouterMap');

class RouterMap extends RouterBase
{
	public function setup($app)
	{
		$app->get('/map', $this->authRole(Role::AllMembers, true), function() use ($app)
		{
			$app->render('map.html');
		})->name('map');

		$app->group('/ajax', $this->checkAjax(), function () use ($app)
		{
			$app->get('/places', $this->authRole(Role::AllMembers), $this->contentJson(), function() use ($app)
			{
				$places = new Place();
				echo $places->toJson();
			});
		});
	}

	public function __construct($app)
	{
		parent::__construct($app);
	}
};
