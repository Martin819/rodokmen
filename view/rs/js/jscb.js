

(function($, undefined)
{
	var builtins = {};


	function call_cb($this, cb, eo, args)
	{
		var cbns = $.fn.jscb.opts.namespace.call($this);
		args.unshift(eo);
		if (typeof builtins[cb] === 'function') return builtins[cb].apply($this, args);
		else if (typeof cbns[cb] === 'function') return cbns[cb].apply($this, args);
	}

	function xhr_events($target, xhr)
	{
		xhr
		.done(function()   { $target.trigger('jscb:ajax', ['done', xhr]);   })
		.fail(function()   { $target.trigger('jscb:ajax', ['fail', xhr]);   })
		.always(function() { $target.trigger('jscb:ajax', ['always', xhr]); });
		$target.trigger('jscb:ajax', ['start', xhr]);
	}

	function bind($this, ev, cb, args)
	{
		if (ev === '') call_cb($this, cb, undefined, args);
		else $this.on(ev, function(eo)
		{
			var evargs = [].slice.call(arguments);
			evargs.shift();
			evargs = evargs.concat(args);
			return call_cb($this, cb, eo, evargs);
		});
	}

	function ajax_response($this, response)
	{
		if (typeof response == 'object' &&
		    'data' in response &&
		    'callback' in response && typeof response.callback === 'string')
		{
			var cb = response.callback;
			if (typeof cb === 'string') $this.jscb(cb, response.data);  // TODO: array of {data, cb}
		}
	}

	function event_stop(e)
	{
		if (e)
		{
			e.preventDefault();
			e.stopPropagation();
		}
	}


	builtins.alert = function(e, msg)
	{
		alert(msg);
	}

	builtins.focus = function(e)
	{
		this.focus();
	}

	builtins.location = function(e, location)
	{
		event_stop(e);
		window.location.href = location;
	}

	builtins.reload = function(e, location)
	{
		event_stop(e);
		window.location.reload(true);
	}

	builtins.html = function(e, data, append)
	{
		append ? this.append(data) : this.html(data);
		if (!$.fn.jscb.opts.noAuto) this.find('*').jscb();
	}

	builtins.ajaxClass = function(e, status)
	{
		if (status != 'always') this.removeClass('jscb-ajax-done jscb-ajax-fail');
		if (status == 'start') this.removeClass('jscb-ajax-always');
		else this.removeClass('jscb-ajax-start');
		this.addClass('jscb-ajax-'+status);
	}

	builtins.get = function(e, url, cb)
	{
		if (e) e.preventDefault();
		this.jscb('abortAjax');
		var args = [].slice.call(arguments);

		(function(self)
		{
			var cbargs = args.slice(3);
			var xhr = $.get(url)
			.done(function(data)
			{
				if ($.isFunction(cb)) cb.apply(self, [e, data].concat(cbargs));
				else if (typeof cb === 'string') self.jscb.apply(self, [cb, data].concat(cbargs));
			});

			xhr_events(self, xhr);
			self.data('jscb:xhr', xhr);
		})(this);
	}

	builtins.getHtml = function(e, url, target, append)
	{
		$(target).jscb('get', url, builtins.html, append);
	}

	builtins.formSubmit = function(e)
	{
		if (e) e.preventDefault();

		this.jscb('abortAjax');

		this.ajaxSubmit();
		var self = this;
		var xhr = this.data('jqxhr');
		xhr_events(this, xhr);
		xhr.done(function(response)
		{
			ajax_response(self, response);
		});
		this.data('jscb:xhr', xhr);
	}

	builtins.abortAjax = function(e)
	{
		var xhr = this.data('jscb:xhr');
		if (xhr && xhr.readyState < 4) xhr.abort();
	}


	$.fn.jscb = function(arg)
	{
		if (typeof arg === 'object') $.extend($.fn.jscb.opts, arg);
		if (typeof $.fn.jscb.opts.namespace !== 'function') throw 'JSCB: callback namespace not (correctly) defined';

		if (typeof arg === 'string')
		{
			var moreargs = [].slice.call(arguments);
			moreargs.shift();
			call_cb(this, arg, undefined, moreargs);
			return this;
		}
		else
		{
			for (var i = 0; i < $.fn.jscb.opts.binds.length; i++)
			{
				var b = $.fn.jscb.opts.binds[i];
				var sel = b[0];
				this.find(sel).each(function(i, e)
				{
					bind($(this), b[1], b[2], b.slice(2));
				});
			};

			this.each(function(i, e)
			{
				var $this = $(this);
				var def = $this.data('jscb');
				if (!$.isArray(def)) return true;
				var evts = typeof def[0] === 'string' ? [def] : def;

				for (var i = 0; i < evts.length; i++)
				{
					if (evts[i].length < 2) continue;
					if (typeof evts[i][0] !== 'string' && typeof evts[i][1] !== 'string') continue;

					bind($this, evts[i][0], evts[i][1], evts[i].slice(2));
				};

				return true;
			});

			return this;
		}
	}

	$.fn.jscb.opts =
	{
		namespace: undefined,
		noAuto: false,
		binds: []
	};

}(jQuery));
