

(function($, undefined)
{
	var builtins = {};


	function call_cb($this, cb, eo, args)
	{
		var cbns = $.fn.jscb.opts.namespace.call($this, cb, eo);
		args.unshift(eo);
		if (typeof cbns[cb] === 'function') return cbns[cb].apply($this, args);
		else if (typeof builtins[cb] === 'function') return builtins[cb].apply($this, args);
	}

	function xhr_events($target, xhr)
	{
		xhr
		.done(function()   { $target.trigger('jscb:ajax', ['done', xhr]);   })
		.fail(function()   { $target.trigger('jscb:ajax', ['fail', xhr]);   })
		.always(function() { $target.trigger('jscb:ajax', ['always', xhr]); });
		$target.trigger('jscb:ajax', ['start', xhr]);
	}

	function cb_from_ev($this, ev)
	{
		var prefix = $this.attr('id');
		if (prefix === void 0) prefix = $this.prop('tagName').toLowerCase();

		if (ev === '') return prefix + 'Init';
		else
		{
			return prefix + ev.split(/\W/).map(function(s)
			{
				return s.charAt(0).toUpperCase() + s.slice(1);
			}).join('');
		}
	}

	function bind($this, args)
	{
		if (args.length < 1) return;
		var ev = args.shift();
		var cb = args.shift();

		// If no cb is supplied infer it from $this and event name:
		if (cb === void 0 || cb === '') cb = cb_from_ev($this, ev);

		if (ev === '') call_cb($this, cb, undefined, args);
		else $this.on(ev, function(eo)
		{
			var evargs = [].slice.call(arguments);
			evargs.shift();
			evargs = evargs.concat(args);
			return call_cb($this, cb, eo, evargs);
		});
	}

	function ajax_response_cb($this, response)
	{
		if (typeof response == 'object' &&
		    'data' in response && $.isArray(response.data) &&
		    'callback' in response && typeof response.callback === 'string')
		{
			call_cb($this, response.callback, undefined, response.data);
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

	function apply_opts(opts)
	{
		$.extend($.fn.jscb.opts, opts);
		if (typeof $.fn.jscb.opts.namespace !== 'function') throw 'JSCB: callback namespace not (correctly) defined';
	}


	builtins.multiple = function(e, cbs)
	{
		if (!$.isArray(cbs)) return;
		for (var i = 0; i < cbs.length; i++) ajax_response_cb(this, cbs[i]);
	}

	builtins.alert = function(e, msg)
	{
		alert(msg);
	}

	builtins.focus = function(e, ele)
	{
		if (ele !== void 0) ele.focus();
		else this.focus();
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
		if (!$.fn.jscb.opts.noAuto) this.jscbAll();
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
				else ajax_response_cb(self, data);
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
			ajax_response_cb(self, response);
		});
		this.data('jscb:xhr', xhr);
	}

	builtins.abortAjax = function(e)
	{
		var xhr = this.data('jscb:xhr');
		if (xhr && xhr.readyState < 4) xhr.abort();
	}

	builtins.validationError = function(e, inputs)
	{
		this.trigger('jscb:validationError', inputs);
		this.find('[name]').removeClass('jscb-input-invalid');
		this.find('[name="'+inputs[0]+'"]').addClass('jscb-input-invalid').focus();
		for (var i = 1; i < inputs.length; i++)
		{
			this.find('[name="'+inputs[i]+'"]').addClass('jscb-input-invalid');
		};
	}


	$.fn.jscbAll = function(arg)
	{
		if (typeof arg === 'object')
		{
			apply_opts.call(this, arg);
			arg = undefined;  // So that options are not re-applied in each jscb() call
		}

		$all = this.find('*');
		$all.each(function()
		{
			$(this).jscb(arg);
		});
	}

	$.fn.jscb = function(arg)
	{
		if (typeof arg === 'object') apply_opts.call(this, arg);

		if (typeof arg === 'string')
		{
			var moreargs = [].slice.call(arguments);
			moreargs.shift();
			call_cb(this, arg, undefined, moreargs);
			return this;
		}
		else
		{
			this.each(function(i, e)
			{
				var $this = $(this);

				for (var i = 0; i < $.fn.jscb.opts.binds.length; i++)
				{
					var b = $.fn.jscb.opts.binds[i];
					var sel = b[0];
					if ($this.is(sel)) bind($this, b.slice(1));
				};

				var def = $this.data('jscb');
				if (typeof def === 'string') def = [def];
				else if (!$.isArray(def)) return true;
				var evts = typeof def[0] === 'string' ? [def] : def;

				for (var i = 0; i < evts.length; i++)
				{
					var args;
					if (typeof evts[i] === 'string') args = [evts[i]];
					else if ($.isArray(evts[i])) args = evts[i];
					else continue;

					bind($this, args);
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
