
(function(rdk, $, undefined)
{
	// How to namespace in JS: http://stackoverflow.com/a/5947280/786102

	var spinner;

	function spinnerOn(element)
	{
		if (element)
		{
			var p = element.position();
			var se = spinner.element();
			se.css('top',  p.top + element.outerHeight()/2);
			se.css('left', p.left + element.outerWidth()/2);
			spinner.play();
		} else
		{
			spinner.pause();
		}
	}

	function ajaxUrl(url)
	{
		return rdkRoot+'/ajax'+url;
	}

	function bindCyEvents(cy)
	{
		cy.nodes('.p').on('select', function(ev) { loadSidebar('person',   ev.cyTarget[0].data().oid); });
		cy.nodes('.m').on('select', function(ev) { loadSidebar('marriage', ev.cyTarget[0].data().oid); });
		cy.nodes().on('unselect', function(ev) { sidebarClear(); });
	}

	function bindSbEvents()
	{
		$('a.js-sbselect').click(function(e)
		{
			cy.nodes(':selected').unselect();
			cy.nodes('#'+$(this).data('cyid')).select();
		})
	}

	var sbTimer;

	function loadSidebar(type, id)
	{
		clearTimeout(sbTimer);

		var sbLoadTimer = setTimeout(function()
		{
			$('#sidebar-content').detach();
			spinnerOn($('#sidebar'));
			clearTimeout(sbLoadTimer);
		}, 750);

		$.get(ajaxUrl('/'+type+'/'+id, '', 'html'))
		.done(function(data)
		{
			$('#sidebar').html(data);
			bindSbEvents();
		})
		.fail(function(jqXHR, textStatus, errorThrown)
		{
			// FIXME: ajax error
			console.log('ajax fail:', type+':', textStatus, errorThrown);
		})
		.always(function()
		{
			clearTimeout(sbLoadTimer);
			spinnerOn(false);
		});
	}

	function sidebarClear()
	{
		// TODO
		// TODO: lineage stats (← JS) (?)

		sbTimer = setTimeout(function()
		{
			$('#sidebar-content').detach();
			clearTimeout(sbTimer);
		}, 100);
	}

	function loadLineage()
	{
		spinnerOn($('#cy'));
		$.get(ajaxUrl('/lineage'), '', 'json')
		.done(function(data)
		{
			cy.load(data, function()
			{
				this.nodes().ungrabify();
				bindCyEvents(this);
				spinnerOn(false);
			});
		})
		.fail(function(jqXHR, textStatus, errorThrown)
		{
			// FIXME: ajax error
			spinnerOn(false);
			console.log('ajax fail: lineage:', textStatus, errorThrown);
		});
	}

	$(document).ready(function()
	{
		spinner = new rdk.Spinner($('#spinner'),
		{
			size: 80,
			stroke: 4,
			color1: '#1173A7',
			color2: '#1173A7',
			// color2: '#0091BD',
			speed: 8000
		});


		$('#cy').cytoscape(
		{
			layout: { name: 'rodokmen' },
			// layout: { name: 'breadthfirst' },

			renderer:
			{
				name: 'raphael',
				multiSelect: false,
			},
			// renderer: { name: 'canvas' },

			style: cytoscape.stylesheet()
				.selector('node.p')
					.css({
						// 'background-color': '#239DF3',
						'background-color': '#006280',
						'shape': 'roundrectangle',
						'width': 50,
						'height': 40,
						'content': 'data(name)',
						'text-valign': 'center',
						'text-outline-width': 0,
						// 'text-outline-color': '#000000',
						'color': '#fff',
						'font-size': 15,
						'font-weight': 'bold',
						'font-family': 'sans-serif'
					})
				.selector('node.m')
					.css({
						// 'background-color': '#239DF3',
						'background-color': '#006280',
						// 'background-color': 'red',
						'content': '',
						'shape': 'circle',
						'width': 20,
					})
				.selector(':selected')
					.css({
						'border-width': 3,
						'border-color': '#eee'
					})
				.selector('edge')
					.css({
						'curve-style': 'bezier',
						// 'curve-style': 'haystack',
						'width': 2,
						'target-arrow-shape': 'none',
						// 'target-arrow-shape': 'triangle',
						'source-arrow-shape': 'none',
						// 'line-color': '#239DF3',
						'line-color': '#006280',
						// 'source-arrow-color': 'data(faveColor)',
						// 'target-arrow-color': 'data(faveColor)'
					})
				.selector('edge.questionable')
					.css({
						'line-style': 'dotted',
						'target-arrow-shape': 'diamond'
					})
				.selector('.faded')
					.css({
						'opacity': 0.25,
						'text-opacity': 0
					}),

			showOverlay: false,

			ready: function(e)
			{
				window.cy = e.cy;

				this.boxSelectionEnabled(false);

				// this.zoom(1.5);
				loadLineage();

				// giddy up
			}
		});
	});
}(window.rdk = window.rdk || {}, jQuery));
