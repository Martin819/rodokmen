<?php
namespace Rodokmen;
use \R;
use \PBKDF2;


abstract class Role
{
	const Anon    = 0x1;
	const Viewer  = 0x2;
	const Contrib = 0x4;
	const Admin   = 0x8;

	const All        = 0xffff;
	const AllMembers = 0xe;
	const AllContrib = 0xc;
	// Expressions in const initialization? Don't be silly. This is PHP. Not sanity.
}

abstract class UserBase
{
	protected $session = false;

	protected function login_to_session($id)
	{
		if (!$this->session) $this->session = new Session();
		$this->session->setID($id);
	}

	abstract public function login($pw);

	public function logout()
	{
		if (!$this->session) return;
		$this->session->delete();
	}

	abstract public function roleMatches($role);
	abstract public function username();
}

class StaticAdmin extends UserBase
{
	const username = 'admin';

	public function __construct($session = false)
	{
		$this->session = $session;
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

	public function roleMatches($role)
	{
		return !!($role & Role::Admin);
	}

	public function username()
	{
		return self::username;
	}
}

class AnonUser extends UserBase
{
	public function login($pw) {}

	public function roleMatches($role)
	{
		return !!($role & Role::Anon);
	}

	public function username()
	{
		return '<anonymous>';
	}
}

class User extends UserBase
{
	const bean = 'user';

	private $bean;

	private function __construct(\RedBean_OODBBean $bean, $session = false)
	{
		$this->bean = $bean;
		$this->session = $session;
	}

	static public function fromSession()
	{
		if (Session::exists())
		{
			$session = new Session();
			$id = $session->getID();
			if ($id === 0) return new StaticAdmin($session);
			else if ($id)
			{
				Db::useAuth();
				$bean = R::load(self::bean, $id);
				if ($bean->id) return new User($bean, $session);
			} else
			{
				// Invalid session
				$session->delete();
			}
		}
		return new AnonUser();
	}

	static public function fromUsername($username)
	{
		if ($username == StaticAdmin::username)
		{
			return new StaticAdmin();
		} else
		{
			Db::useAuth();
			$bean = R::findOne(self::bean, 'username = ?', array($username));
			if ($bean) return new User($bean);
			else return false;
		}
	}

	static public function setupNew($username, $role, $password)
	{
		Db::useAuth();
		$bean = R::dispense(self::bean);
		$bean->username = $username;
		$bean->role = $role;
		$bean->hash = PBKDF2::create($password);
		R::store($bean);
		return new User($bean);
	}

	public function login($pw)
	{
		if (PBKDF2::validate($pw, $this->bean->hash))
		{
			$this->login_to_session($this->bean->id);
			return true;
		}
		else return false;
	}

	public function roleMatches($role)
	{
		// FIXME
		return !!($this->bean->role & $role);
	}

	public function username()
	{
		return $this->bean->username;
	}
}
