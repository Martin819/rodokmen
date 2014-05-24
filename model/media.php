<?php
namespace Rodokmen;
use \R;


class Media extends Pod
{
	const thumbW = 210;
	const thumbH = 175;
	const viewW = 1920;
	const viewH = 1080;
	const maxSize = 8388608;  // 8MB
	// "640K ought to be enough for anybody."

	public function __construct() { parent::__construct('media'); }

	public function findAllByYear()
	{
		return $this->findAll('ORDER BY year DESC');
	}
}

class ModelMedia extends \RedBean_SimpleModel
{
	private static $image_formats = array(
		'image/png',
		'image/gif',
		'image/jpeg',
		'image/pjpeg'
	);

	const url_image_orig  = 'media/photo/original/';
	const url_image_thumb = 'media/photo/thumb/';
	const url_image_view  = 'media/photo/view/';

	const view_threshold_size = 1048576; // 1MB

	private static function media_fn($url_dir, $file_id, $ext)
	{
		// Data path is hardcoded for media, because it's also hardcoded in .htaccess
		return __DIR__.'/../data/'.$url_dir.$file_id.'.'.$ext;
	}

	private static function unlink_files($file_id, $ext)
	{
		@\unlink(self::media_fn(self::url_image_orig, $file_id, $ext));
		@\unlink(self::media_fn(self::url_image_thumb, $file_id, 'jpg'));
		@\unlink(self::media_fn(self::url_image_view, $file_id, 'jpg'));
	}

	private function add_image($input_name)
	{
		//Create thumbnail and view image, store original

		if (!\array_key_exists($input_name, $_FILES)) return false;

		$tmp_fn = $_FILES[$input_name]['tmp_name'];
		$ext = \strtolower(\pathinfo($_FILES[$input_name]['name'], PATHINFO_EXTENSION));
		$unique_name = \uniqid('', true);
		$orig_fn  = self::media_fn(self::url_image_orig, $unique_name, $ext);
		$thumb_fn = self::media_fn(self::url_image_thumb, $unique_name, 'jpg');
		$view_fn  = self::media_fn(self::url_image_view, $unique_name, 'jpg');

		if (!\move_uploaded_file($tmp_fn, $orig_fn)) return false;

		try
		{
			$thumb = \PhpThumbFactory::create($orig_fn);
			$thumb->adaptiveResize(Media::thumbW, Media::thumbH);
			$thumb->save($thumb_fn, 'jpg');

			$view  = \PhpThumbFactory::create($orig_fn);
			if (\filesize($tmp_fn) > self::view_threshold_size) $view->resize(Media::viewW, Media::viewH);
			$view->save($view_fn, 'jpg');
		}
		catch (Exception $e)
		{
			self::unlink_files($unique_name, $ext);
			return false;
		}

		$this->type = 'image';
		$this->file_id = $unique_name;
		$this->orig_ext = $ext;

		return true;
	}

	public function after_delete()
	{
		// Invoked after bean is trashed
		self::unlink_files($this->file_id, $this->orig_ext);
	}

	public function edit($input, $upload = false)
	{
		// File upload validation:
		if ($upload)
		{
			Pod::validate($_FILES, array(
					array('required', array('rdk_uploadfile')),
					array('file', 'rdk_uploadfile', Media::maxSize, self::$image_formats),
					array('eval', 'rdk_uploadfile', $this->add_image('rdk_uploadfile'))  // NOTE: it is important this rule comes after the file rule
				));
		}

		// Other inputs validation:
		$d = Pod::validate($input, array(
				array('required', array('rdk_year')),
				array('integer', 'rdk_year')
			));

		$this->year = $d['rdk_year'];
		$this->comment = $d['rdk_comment'];

		// Person-Media tags:
		$tags = \json_decode($d['rdk_tags'], true);
		if ($tags && \array_key_exists('tags', $tags))
		{
			$pod_p = new Person();
			$this->bean->sharedPersonList = array();

			foreach ($tags['tags'] as $tag)
			{
				$person = $pod_p->fromId($tag);
				if ($person) $this->bean->sharedPersonList[] = $person;
			}
		}
	}

	public function origFilename()
	{
		return $this->media_fn(self::url_image_orig, $this->file_id, $this->orig_ext);
	}

	public function thumbUrl()
	{
		return self::url_image_thumb.$this->file_id.'.jpg';
	}

	public function viewUrl()
	{
		return self::url_image_view.$this->file_id.'.jpg';
	}

	public function tags($json = false)
	{
		$tags = array();

		foreach ($this->bean->sharedPersonList as $person)
		{
			$tags[] = $person->idName();
		}

		if ($json)
			return \json_encode(array('tags' => $tags ? $tags : false), JSON_HEX_QUOT|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS);
		else
			return $tags;
	}
}
