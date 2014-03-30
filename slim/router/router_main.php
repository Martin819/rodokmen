<?php
namespace Rodokmen;


class RouterMain
{
	private $app;

	private static function get_bean($id, $pod, $app)
	{
		$bean = $pod->fromId($id);
		if (!$bean) $app->halt(404);
		else return $bean;
	}

	private function check_https()
	{
		if ($this->app->environment['Rodokmen.force_https'] && $this->app->environment['slim.url_scheme'] != 'https')
			$this->app->redirect('https://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'], 301);
	}

	private function authRole($role, $redir = false) // TODO: name inconsistency
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
			// NOTE: needed to prevent non-ajax form submit
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

		$app->view->setData('root', $app->request->getRootUri());  // FIXME: needed?
		$app->view->setData('contrib', $app->user()->roleMatches(Role::AllContrib));
		$app->view->setData('ajs', 'javascript:void(0)');
		header_remove('X-Powered-By');
		\Slim\Route::setDefaultConditions(array
		(
    	'id' => '\d*'
    ));


    // Main routes:

		$app->get('/', $this->authRole(Role::AllMembers, true), function() use ($app)
		{
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
			// Linage route:
			$app->get('/lineage', $this->authRole(Role::AllMembers), $this->contentJson(), function() use ($app)
			{
				$l = new Lineage();
				echo $l->toJson();   // JSON representation to display using Cytoscape
			});


			// Person details for sidebar:
			$app->get('/person/:id', $this->authRole(Role::AllMembers), function($id) use ($app)
			{
				$bean = self::get_bean($id, new Person(), $app);
				$app->view->setData($bean->sidebarData());
				$app->render('ajax/sidebar-person.html');
			});

			// Edit existing person:
			$app->get('/person/edit/:id', $this->authRole(Role::AllContrib), function($id) use ($app)
			{
				$bean = self::get_bean($id, new Person(), $app);
				$app->view->setData($bean->infoData());
				$app->view->setData('action', $app->urlFor('person-edit-p'));
				$app->render('ajax/form-person.html');
			})->name('person-edit');
			$app->post('/person/edit', $this->authRole(Role::AllContrib), function() use ($app)
			{
				$rq = $app->request;
				$person = new Person();
				$bean = self::get_bean($rq->post('rdk_id'), $person, $app);
				$bean->edit($rq);
				$person->store($bean);
			})->name('person-edit-p');


			// Marriage details for sidebar
			$app->get('/marriage/:id', $this->authRole(Role::AllMembers), function($id) use ($app)
			{
				$bean = self::get_bean($id, new Marriage(), $app);
				$app->view->setData($bean->sidebarData());
				$app->render('ajax/sidebar-marriage.html');
			});

			// TODO: edit marriage

			// Add a new child to a marriage
			$app->get('/marriage/newchild/:id', $this->authRole(Role::AllContrib), function($id) use ($app)
			{
				$bean = self::get_bean($id, new Marriage(), $app);
				$app->view->setData('id', $id);
				$app->view->setData('action', $app->urlFor('marriage-newchild-p'));
				$app->render('ajax/form-person.html');
			})->name('marriage-newchild');
			$app->post('/marriage/newchild', $this->authRole(Role::AllContrib), function() use ($app)
			{
				DB::transaction(DB::data, function() use ($app)
				{
					$rq = $app->request;
					$m = self::get_bean($rq->post('rdk_id'), new Marriage(), $app);

					$pod_p = new Person();
					$pod_r = new Relation();

					$p = $pod_p->setupNew();
					$p->edit($rq);
					$r = $pod_r->relate($p, $m, 'child');

					$pod_p->store($p);
					$pod_r->store($r);
				});
			})->name('marriage-newchild-p');

			// New marriage w/ person
			$app->get('/marriage/new/withperson/:id', $this->authRole(Role::AllContrib), function($id) use ($app)
			{
				$app->view->setData('id', $id);
				$app->view->setData('action', $app->urlFor('marriage-new-withperson-p'));
				$app->render('ajax/form-person.html');
			})->name('marriage-new-withperson');
			$app->post('/marriage/new/withperson', $this->authRole(Role::AllContrib), function() use ($app)
			{
				DB::transaction(DB::data, function() use ($app)
				{
					$rq = $app->request;
					$pod_p = new Person();
					$pod_m = new Marriage();
					$pod_r = new Relation();

					$p = self::get_bean($rq->post('rdk_id'), $pod_p, $app);
					$np = $pod_p->setupNew();
					$np->edit($rq);
					$m = $pod_m->setupNew();
					$r1 = $pod_r->relate($p,  $m, 'parent');
					$r2 = $pod_r->relate($np, $m, 'parent');

					$pod_p->store($np);
					$pod_m->store($m);
					$pod_r->store($r1);
					$pod_r->store($r2);
				});
			})->name('marriage-new-withperson-p');

			// New parent marriage for a child
			$app->get('/marriage/new/forchild/:id', $this->authRole(Role::AllContrib), function($id) use ($app)
			{
				$app->view->setData('id', $id);
				$app->view->setData('action', $app->urlFor('marriage-new-forchild-p'));
				$app->render('ajax/form-parents.html');
			})->name('marriage-new-forchild');
			$app->post('/marriage/new/forchild', $this->authRole(Role::AllContrib), function() use ($app)
			{
				DB::transaction(DB::data, function() use ($app)
				{
					$rq = $app->request;
					$pod_p = new Person();
					$pod_m = new Marriage();
					$pod_r = new Relation();

					$c = self::get_bean($rq->post('rdk_id'), $pod_p, $app);
					if (!empty($c->parents())) $app->halt(403);  // Checks whether this person already has parents

					$p1 = $pod_p->setupNew();
					$p1->setNames($rq->post('rdk_p1_firstname'), $rq->post('rdk_p1_lastname'));
					$p2 = $pod_p->setupNew();
					$p2->setNames($rq->post('rdk_p2_firstname'), $rq->post('rdk_p2_lastname'));
					$m = $pod_m->setupNew();
					$rp1 = $pod_r->relate($p1, $m, 'parent');
					$rp2 = $pod_r->relate($p2, $m, 'parent');
					$rc = $pod_r->relate($c, $m, 'child');

					$pod_p->store($p1);
					$pod_p->store($p2);
					$pod_m->store($m);
					$pod_r->store($rp1);
					$pod_r->store($rp2);
					$pod_r->store($rc);
				});
			})->name('marriage-new-forchild-p');

		});
	}

	public function __construct($app)
	{
		$this->app = $app;
		$this->setup();
	}
};
