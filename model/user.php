<?php
namespace Rodokmen;
use \R;
use \PBKDF2;


abstract class Role
{
	const Anon    = 0;
	const Member  = 1;
	const Contrib = 2;
	const Admin   = 3;

	static public function validate($role)
	{
		return $role >= self::Member && $role <= self::Admin;  // Anon is not a valid role for a user
	}
}

abstract class UserBase
{
	protected $session = false;

	protected function login_to_session($id)
	{
		if (!$this->session) $this->session = new Session();
		$this->session->setID($id);
	}

	protected function validate_edit_rq($rq, $isNew, $noRole = false)
	{
		$username = $rq->post('rdk_username');
		$pw = $rq->post('rdk_pw');

		if (\strlen($username) < 1) return false;
		if ($isNew && (User::fromUsername($username) !== false)) return false;
		if ($isNew && \strlen($pw) < 1) return false;
		if (\strlen($pw) > 0)
		{
			if ($pw !== $rq->post('rdk_pw_verif')) return false;
		}
		if (!$noRole && !Role::validate(\intval($rq->post('rdk_role')))) return false;

		return true;
	}

	abstract public function edit($rq, $isNew = false);
	abstract public function login($pw);

	public function logout()
	{
		if (!$this->session) return;
		$this->session->delete();
	}

	abstract public function role();
	abstract public function roleMatches($role);
	abstract public function id();
	abstract public function username();
}

class StaticAdmin extends UserBase
{
	static public function staticUsername()
	{
		return App::getApp()->conf()->admin_username;
	}

	public function __construct($session = false)
	{
		$this->session = $session;
	}

	public function edit($rq, $isNew = false)
	{
		if (!$this->validate_edit_rq($rq, $isNew, true)) return false;

		$conf = App::getApp()->conf();
		$pw = $rq->post('rdk_pw');

		$conf->admin_username = $rq->post('rdk_username');
		if (\strlen($pw) > 0) $conf->admin_hash = PBKDF2::create($pw);

		return true;
	}

	public function login($pw)
	{
		if (PBKDF2::validate($pw, App::getApp()->conf()->admin_hash))
		{
			$this->login_to_session(0);
			return true;
		}
		else return false;
	}

	public function role() { return Role::Admin; }
	public function roleMatches($role) { return Role::Admin >= $role; }
	public function id() { return 0; }
	public function username() { return self::staticUsername(); }
}

class AnonUser extends UserBase
{
	public function edit($rq, $isNew = false) { return false; }
	public function login($pw) {}
	public function role() { return Role::Anon; }
	public function roleMatches($role) { return Role::Anon >= $role; }
	public function id() { return -1; }
	public function username() { return '<anonymous>'; }
}

class User extends UserBase
{
	const bean = 'user';
	const pwMinChars = 6;

	private $bean;

	private function __construct($bean, $session = false)
	{
		$this->bean = $bean;
		$this->session = $session;
	}

	private function store()
	{
		Db::useAuth();
		R::store($this->bean);
	}

	static public function fromSession()
	{
		if (Session::exists())
		{
			$session = new Session();
			$id = $session->getID();
			$user = self::fromId($id, $session);
			if ($user) return $user;
			else $session->delete(); // Invalid session
		}
		return new AnonUser();
	}

	static public function fromUsername($username)
	{
		if ($username == StaticAdmin::staticUsername())
		{
			return new StaticAdmin();
		} else
		{
			Db::useAuth();
			$bean = R::findOne(self::bean, 'username = ?', array($username));
			return $bean ? new User($bean) : false;
		}
	}

	static public function fromId($id, $session = false)
	{
		$id = \intval($id);
		if ($id === 0) return new StaticAdmin($session);
		else if ($id > 0)
		{
			Db::useAuth();
			$bean = R::load(self::bean, $id);
			return $bean->id > 0 ? new User($bean, $session) : false;
		}
		else return false;
	}

	static public function findAll()
	{
		$ret = array();
		$ret[] = new StaticAdmin();
		Db::useAuth();
		$all = R::findAll(self::bean);
		foreach ($all as $bean) $ret[] = new User($bean);
		return $ret;
	}

	static public function setupNew()
	{
		Db::useAuth();
		$bean = R::dispense(self::bean);
		return new User($bean);
	}

	public function validatePassword($pw)
	{
		return PBKDF2::validate($pw, $this->bean->hash);
	}

	public function editPassword($rq)
	{
		$pw = $rq->post('rdk_pw_new');

		if (\strlen($pw) < self::pwMinChars) return false;
		if ($pw !== $rq->post('rdk_pw_new_verif')) return false;

		$this->bean->hash = PBKDF2::create($pw);
		$this->store();
		return true;
	}

	public function edit($rq, $isNew = false)
	{
		if (!$this->validate_edit_rq($rq, $isNew)) return false;

		$pw = $rq->post('rdk_pw');
		$this->bean->username = $rq->post('rdk_username');
		if (\strlen($pw) > 0) $this->bean->hash = PBKDF2::create($pw);
		$this->bean->role = \intval($rq->post('rdk_role'));

		$this->store();
		return true;
	}

	public function login($pw)
	{
		if ($this->validatePassword($pw))
		{
			$this->login_to_session($this->bean->id);
			return true;
		}
		else return false;
	}

	public function role() { return $this->bean->role; }
	public function roleMatches($role) { return $this->bean->role >= $role; }

	public function id()
	{
		$id = $this->bean->id;
		return  $id > 0 ? $id : -1;  // So that new beans are not confused with admin
	}

	public function username() { return $this->bean->username; }

	public function trash()
	{
		Db::useAuth();
		R::trash($this->bean);
	}
}
