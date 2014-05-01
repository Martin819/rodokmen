
(function(rdk, $, undefined)
{
	function bindCyEvents(cy)
	{
		cy.nodes('.p').on('select', function(ev) { loadSidebar('person',   ev.cyTarget[0].data().oid); });
		cy.nodes('.m').on('select', function(ev) { loadSidebar('marriage', ev.cyTarget[0].data().oid); });
		cy.nodes().on('unselect', function(ev) { clearSidebar(); });
	}

	function bindSbEvents()
	{
		$('#sidebar')
		.on('click', 'a.js-sbselect', function(e)
		{
			cy.nodes(':selected').unselect();
			cy.nodes('#'+$(this).data('cyid')).select();
		})
		.on('click', '.js-openform', function(e)
		{
			e.preventDefault();
			rdk.openForm($(this).data('title'), $(this).attr('href'));
		});

		$(document)
		.on('click', '.js-formsubmit', function(e)
		{
			e.preventDefault();
			var $t = $(this);
			var $vex = $t.closest('.vex');
			var vexD = $vex.data('vex');

			rdk.submitForm($vex, $t.closest('form'), function()
			{
				rdk.spinnerOn(false);
				cy.elements().remove();
				vexD.afterClose = function() { loadLineage(); }
				vex.close(vexD.id);
			});
		})
		.on('click', '.js-formcancel', function(e)
		{
			vex.close($(this).closest('.vex').data('vex').id);
		});
	}

	var sbTimer;

	function loadSidebar(type, id)
	{
		clearTimeout(sbTimer);

		var sbLoadTimer = setTimeout(function()
		{
			$('#sidebar-content').detach();
			rdk.spinnerOn($('#sidebar'));
			clearTimeout(sbLoadTimer);
		}, 750);

		$.get(rdk.ajaxUrl('/'+type+'/'+id, '', 'html'))
		.done(function(data) { $('#sidebar').html(data); })
		.fail(rdk.ajaxError())
		.always(function()
		{
			clearTimeout(sbLoadTimer);
			rdk.spinnerOn(false);
		});
	}

	function clearSidebar()
	{
		sbTimer = setTimeout(function()
		{
			$('#sidebar-content').detach();
			clearTimeout(sbTimer);
		}, 100);
	}

	function loadLineage()
	{
		rdk.spinnerOn($('#cy'));

		$.get(rdk.ajaxUrl('/lineage'), '', 'json')
		.done(function(data)
		{
			cy.load(data, function()
			{
				this.nodes().ungrabify();
				bindCyEvents(this);
				rdk.spinnerOn(false);
				// TODO: lineage stats → sidebar (?)
			});
		})
		.fail(rdk.ajaxError());
	}

	$(document).ready(function()
	{
		// Bind evets
		bindSbEvents();

		// Cytoscape
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
