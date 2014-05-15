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

	private static function media_fn($url)
	{
		// Data path is hardcoded for media, because it's also hardcoded in .htaccess
		return __DIR__.'/../data/'.$url;
	}

	private function unlink_if_exists($orig_fn, $thumb_fn, $view_fn)
	{
		if (\file_exists($orig_fn))  \unlink($orig_fn);
		if (\file_exists($thumb_fn)) \unlink($thumb_fn);
		if (\file_exists($view_fn))  \unlink($view_fn);
	}

	private function add_image($input_name)
	{
		//Create thumbnail and view image, store original

		if (!\array_key_exists($input_name, $_FILES)) return false;

		$tmp_fn = $_FILES[$input_name]['tmp_name'];
		$ext = \pathinfo($_FILES[$input_name]['name'], PATHINFO_EXTENSION);
		$unique_name = \uniqid('', true);
		$orig_url  = self::url_image_orig.$unique_name.'.'.$ext;
		$thumb_url = self::url_image_thumb.$unique_name.'.jpg';
		$view_url  = self::url_image_view.$unique_name.'.jpg';
		$orig_fn = self::media_fn($orig_url);
		$thumb_fn = self::media_fn($thumb_url);
		$view_fn = self::media_fn($view_url);

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
			self::unlink_if_exists($orig_fn, $thumb_fn, $view_fn);
			return false;
		}

		$this->type = 'image';
		$this->orig_url  = $orig_url;
		$this->thumb_url = $thumb_url;
		$this->view_url  = $view_url;

		return true;
	}

	public function after_delete()
	{
		// Invoked after bean is trashed
		self::unlink_if_exists(
			self::media_fn($this->orig_url),
			self::media_fn($this->thumb_url),
			self::media_fn($this->view_url));
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
	}

	public function origFilename()
	{
		return $this->media_fn($this->orig_url);
	}
}
