<?php
namespace Rodokmen;


RouterBase::regRouter('Rodokmen\RouterMap');

class RouterMap extends RouterBase
{
	public function setup($app)
	{
		$self = $this;

		$app->get('/map', $this->authRole(Role::Member, true), function() use ($app)
		{
			$app->render('map.html');
		})->name('map');

		$app->group('/ajax', $this->checkAjax(), function () use ($app, $self)
		{
			$app->get('/places', $self->authRole(Role::Member), $self->contentJson(), function() use ($app)
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
