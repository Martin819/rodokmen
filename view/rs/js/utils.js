
(function(rdk, $, undefined)
{

	// Loading spinner

	var spinner_defaults =
	{
		size: 100,
		stroke: 10,
		speed: 5000,
		color1: '#fff',
		color2: '#fff',
		pattern1: '- ',
		pattern2: '- .'
	};

	rdk.Spinner = function(element, options)
	{
		this.options = $.extend({}, spinner_defaults, options);
		var opts = this.options;

		this.ele = element;
		element.hide();
		this.paper = Raphael(element[0], opts.size+2*opts.stroke, opts.size+2*opts.stroke);

		this.c1 = this.paper.circle(opts.stroke+opts.size/2, opts.stroke+opts.size/2, opts.size/2);
		this.c1.attr('stroke', opts.color1);
		this.c1.attr('stroke-width', opts.stroke);
		this.c1.attr('stroke-dasharray', opts.pattern1);

		this.c2 = this.paper.circle(opts.stroke+opts.size/2, opts.stroke+opts.size/2, opts.size/2);
		this.c2.attr('stroke', opts.color2);
		this.c2.attr('stroke-width', opts.stroke);
		this.c2.attr('stroke-dasharray', opts.pattern2);
	}

	rdk.Spinner.prototype.play = function()
	{
		this.ele.show();
		var R = Math.floor(Math.random()*360);
		this.c1.attr({'transform': 'R'+R});
		this.c2.attr({'transform': 'R'+R});
		this.spin1 = Raphael.animation({'transform': 'R'+R+'r360'}, this.options.speed).repeat(Infinity);
		this.c1.animate(this.spin1);
		this.spin2 = Raphael.animation({'transform': 'R'+R+'r360'}, .71*this.options.speed).repeat(Infinity);
		this.c2.animate(this.spin2);
	}

	rdk.Spinner.prototype.pause = function()
	{
		this.ele.hide();
		this.c1.stop(this.spin1);
		this.c2.stop(this.spin2);
	}

	rdk.Spinner.prototype.element = function()
	{
		return this.ele;
	}


	// Spinner usage

	var spinner;

	rdk.spinnerOn = function (element)
	{
		if (element)
		{
			var se = spinner.element();
			se.appendTo(element);
			se.css('top',  element.outerHeight()/2);
			se.css('left', element.outerWidth()/2);
			spinner.play();
		} else
		{
			spinner.element().appendTo($('body'));
			spinner.pause();
		}
	}


	// Ajax & forms

	rdk.ajaxUrl = function (url)
	{
		return rdk.baseUrl+'/ajax'+url;
	}

	rdk.ajaxError = function(method)
	{
		if (method != 'post') method = 'get';
		return function(jqXHR, textStatus, errorThrown)
		{
			vex.dialog.alert(rdk.strings.ajaxErrMsg[method]);
		}
	}

	rdk.openForm = function(heading, url)
	{
		vex.open(
		{
			content: '<h2>'+heading+'</h2><div class="hr"></div>',
			css: { padding: '50px 0' },  // TODO: move css (?)
			contentCSS:
			{
				position: 'absolute',
				top: '50px',
				bottom: '50px',
				left: '20%'
			},
			afterOpen: function($vexContent) { loadForm(url, $vexContent); },
			afterClose: function() {}
		});
	}

	function loadForm(url, $vexContent)
	{
		rdk.spinnerOn($vexContent);
		$.get(url, '', 'html')
		.done(function(data)
		{
			$vexContent.append(data);
			$('.vex form').ajaxForm();
			$('.mask').each(function()
			{
				$(this).mask($(this).data('mask'));
			});
			$('.nominatim').each(function() { $(this).nominatim(); });
			$('.vex .focus').focus();
		})
		.fail(rdk.ajaxError())
		.always(function() { rdk.spinnerOn(false); });
	}

	rdk.submitForm = function($vex, $form)
	{
		$form.ajaxSubmit();
		var xhr = $form.data('jqxhr');

		$form.hide();
		rdk.spinnerOn($vex);

		xhr.fail(rdk.ajaxError('post'));
		return xhr;
	}


	// Location search field

	$.fn.nominatim = function()
	{
		this.select2(
		{
			placeholder: "Vyhledat místo...",
			multiple: true,
			minimumInputLength: 1,
			maximumSelectionSize: 1,
			ajax:
			{
				url: rdk.nominatimServer,
				type: "GET",
				dataType: 'json',
				quietMillis: 500,
				data: function (term)
				{
					return { q: term, format: 'json' };
				},
				results: function (data)
				{
					return {
						results: $.map(data, function(p, i)
						{
							return { id: i, text: p.display_name, lon: p.lon, lat: p.lat };
						})
					};
				}
			},
			initSelection: function(e, cb)
			{
				cb([{ id: 0, text: e.val() }]);
			}
		});

		var input_id = this.data('input');
		this.after('<input type="hidden" name="'+input_id+'" id="'+input_id+'" value="" />');
		var input = $('#'+input_id);
		this.on('change', function(e)
		{
			if (e.added) input.val(JSON.stringify(e.added));
			else if (e.removed) input.val('{"removed": true}');
		})
	}


	// Ready setup

	$(document).ready(function()
	{
		// jQuery
		$.ajaxSetup({ timeout: 20000 });

		// Loading spinner
		spinner = new rdk.Spinner($('#spinner'),
		{
			size: 80,
			stroke: 4,
			color1: '#1173A7',
			color2: '#1173A7',
			speed: 8000
		});
	});

}(window.rdk = window.rdk || {}, jQuery));
