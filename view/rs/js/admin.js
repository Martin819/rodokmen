
(function(rdk, $, undefined)
{
	function bindEvents()
	{
		$('.tab-control').click(function()
		{
			$('.tab').hide();
			$('.tab-control').removeClass('tab-active');
			$(this).addClass('tab-active');
			$($(this).data('tab')).show();
		});

		$('#gallery .js-openform').click(function(e)
		{
			e.preventDefault();
			$t = $(this);
			rdk.openForm($t.data('title'), $t.attr('href'));
		});

		$(document)
		.on('click', '.js-formsubmit', function(e)
		{
			e.preventDefault();

			var $t = $(this);
			var $vex = $t.closest('.vex');
			var vexD = $vex.data('vex');

			var xhr = rdk.submitForm($vex, $t.closest('form'));
			xhr.success(function()
			{
				vexD.afterClose = function() { location.reload(true); }
			}).always(function()
			{
				rdk.spinnerOn(false);
				vex.close(vexD.id);
			});
		})
		.on('click', '.js-formcancel', function(e)
		{
			vex.close($(this).closest('.vex').data('vex').id);
		});
	}

	$(document).ready(function()
	{
		bindEvents();
		$('.tab-default').click();
	});
}(window.rdk = window.rdk || {}, jQuery));
