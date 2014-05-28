
(function(rdk, $, undefined)
{
	var sbTimer;
	var sbLoadTimer;


	rdk.mapTileServer = 'http://otile3.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
	rdk.mapAttribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">';


	function latDist(a, b)
	{
		a = L.latLng(a.lat, 0);
		b = L.latLng(b.lat, 0);
		return a.distanceTo(b);
	}

	function placeMake(json)
	{
		var place = {
			ll: L.latLng(json.lat, json.lon),
			text: {}
		};
		placeMerge(place, json);
		return place;
	}

	function placeMerge(place, json)
	{
		if (place.text[json.type] === void 0) place.text[json.type] = [];
		place.text[json.type].push(rdk.strings.idName(json.person_name.name, json.person_name.birth));
	}

	function makePlaces(json)
	{
		if (!$.isArray(json)) return [];
		if (json.length < 1)  return [];

		json.sort(function(a, b) { return a.lat - b.lat; });

		var threshold = 100; // in meters

		// First lets divide the places into clusters based on latitude:
		var ci = 0;
		var clusters = [[json[0]]];
		for (var i = 1; i < json.length; i++)
		{
			var dist = latDist(json[i-1], json[i]);
			if (dist < threshold) clusters[ci].push(json[i]);
			else
			{
				// new cluster
				clusters.push([json[i]]);
				ci++;
			}
		}

		// Second, sort each cluster by longitude:
		// (since places in one cluster have almost the same latitude, this should correspond to distance)
		for (var i = 0; i < clusters.length; i++)
		{
			clusters[i].sort(function(a, b) { return a.lon - b.lon; });
		}

		// Last but not least, generate places:
		var places = [];
		for (var i = 0; i < clusters.length; i++)
		{
			places.push(placeMake(clusters[i][0]));
			var pi = places.length-1;
			for (var j = 1; j < clusters[i].length; j++)
			{
				var dist = places[pi].ll.distanceTo(L.latLng(clusters[i][j].lat, clusters[i][j].lon));
				if (dist < threshold) placeMerge(places[pi], clusters[i][j]);
				else
				{
					places.push(placeMake(clusters[i][j]));
					pi++;
				}
			}
		}

		return places;
	}

	function displayMap(places)
	{
		map = L.map('map').setView([42, 0], 2);
		L.tileLayer(rdk.mapTileServer,
		{
			attribution: rdk.mapAttribution,
			maxZoom: 18
		}).addTo(map);

		L.Icon.Default.imagePath = rdk.baseUrl+'/rs/leaflet';

		var bounds = [];
		for (var i = 0; i < places.length; i++)
		{
			var place = places[i];
			bounds.push(place.ll);

			var marker = L.marker(place.ll);
			var text = '';
			for (var type in place.text)
			{
				text += '<h3>'+rdk.strings.mapPopup[type]+'</h3><ul>';
				for (var j = 0; j < place.text[type].length; j++)
				{
					text += '<li>'+place.text[type][j]+'</li>';
				};
				text += '</ul>';
			}
			marker.bindPopup(text);
			marker.addTo(map);
		};

		if (bounds.length > 0) map.fitBounds(L.latLngBounds(bounds), { maxZoom: 8 });
		if (map.getZoom() > 3) map.zoomOut(1, { animate: false });
	}


	rdk.globalAjax = function(e, status)
	{
		if (status == 'fail') vex.dialog.alert(rdk.strings.ajaxErrMsg['get']);
		else if (e)
		{
			if (status == 'start')
			{
				rdk.spinner.play($(e.target));
			}
			else if (status == 'always')
			{
				rdk.spinner.pause();
			}
		}
		return false;
	}

	rdk.loginAjax = function(e, status)
	{
		if (status == 'start')
		{
			this.css('visibility', 'hidden');
			$lb = $('#loginbox');
			rdk.spinner.play($lb);
			e.stopPropagation();
		}
	}

	rdk.loginFail = function(e)
	{
		this.css('visibility', 'inherit');
		this.find('#loginfail').css('visibility', 'inherit');
		this.find('.focus').focus().select();
	}

	rdk.sidebarJscbAjax = function(e, status)
	{
		if (status == 'start')
		{
			clearTimeout(sbTimer);
			sbLoadTimer = setTimeout(function()
			{
				$('#sidebar-content').detach();
				rdk.spinner.play($('#sidebar'));
				clearTimeout(sbLoadTimer);
			}, 750);
			return false;
		}
		else if (status == 'always')
		{
			clearTimeout(sbLoadTimer);
			rdk.spinner.pause();
			return false;
		}

		return true;
	}

	rdk.cyInit = function(e)
	{
		// Initialize Cytoscape:
		var self = this;
		self.cytoscape(
		{
			layout: { name: 'rodokmen' },

			renderer:
			{
				name: 'raphael',
				multiSelect: false
			},

			style: cytoscape.stylesheet()
				.selector('node.p')
					.css({
						'background-color': '#006280',
						'shape': 'roundrectangle',
						'width': 50,
						'height': 40,
						'content': 'data(name)',
						'text-valign': 'center',
						'text-outline-width': 0,
						'color': '#fff',
						'font-size': 15,
						'font-weight': 'normal',
						'font-family': 'sans-serif'
					})
				.selector('node.m')
					.css({
						'background-color': '#006280',
						'content': '',
						'shape': 'circle',
						'width': 20
					})
				.selector(':selected')
					.css({
						'border-width': 3,
						'border-color': '#eee'
					})
				.selector('edge')
					.css({
						'curve-style': 'bezier',
						'width': 2,
						'target-arrow-shape': 'none',
						'source-arrow-shape': 'none',
						'line-color': '#006280'
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
				window.cy = this;
				this.boxSelectionEnabled(false);
				self.jscb('cyLoad');
			}
		});
	}

	rdk.cyLoad = function(e, cyid)
	{
		function giddyUp(e, data)
		{
			cy.load(data, function()
			{
				this.nodes().ungrabify();
				this.nodes().on('select', function(ev)
				{
					var ele = ev.cyTarget[0];
					var url = ele.hasClass('p') ? '/person/' : '/marriage/';
					$().jscb('getHtml', rdk.ajaxUrl(url + ele.data().oid), '#sidebar');
				});
				this.nodes().on('unselect', function(ev)
				{
					sbTimer = setTimeout(function()
					{
						$('#sidebar-content').detach();
						clearTimeout(sbTimer);
					}, 100);
				});

				rdk.spinner.pause();

				if (cyid) $().jscb('cySelect', cyid);

				// TODO: lineage stats → sidebar (?)
			});
		}

		cy.nodes().unselect();
		cy.elements().remove();
		this.jscb('get', rdk.ajaxUrl('/lineage'), giddyUp);
	}

	rdk.cyJscbAjax = function(e, status)
	{
		if (status == 'always') e.stopPropagation(); // Let's not stop the spinner just yet
	}

	rdk.cySelect = function(e, cyid)
	{
		if (e)
		{
			e.preventDefault();
			e.stopPropagation();
		}
		cy.nodes(':selected').unselect();
		cy.nodes('#'+cyid).select();
	}

	rdk.cyEdited = function(e, cyid)
	{
		var vexD = this.closest('.vex').data('vex');
		vexD.afterClose = function()
		{
			$('#cy').jscb('cyLoad', cyid);
		}
		vex.close(vexD.id);
	}

	rdk.vexOpen = function(e, url, title)
	{
		if (e)
		{
			e.preventDefault();
			e.stopPropagation();
		}
		vex.open(
		{
			content: '<h2>'+title+'</h2><div class="hr"></div>',
			css: { padding: '50px 0' },
			contentCSS:
			{
				position: 'absolute',
				top: '50px',
				bottom: '50px',
				left: '20%'
			},
			afterOpen: function($vexContent) { $().jscb('getHtml', url, $vexContent, true); },
			afterClose: function() {},
			onSubmit: function() {}
		});
	}

	rdk.vexAjax = function(e, status)
	{
		if (status == 'start')
		{
			rdk.spinner.play(this.closest('.vex'));
			this.children().hide();
			e.stopPropagation();
		}
	}

	rdk.vexValidationError = function()
	{
		this.children().show();
		this.find('input[type=radio]').removeClass('jscb-input-invalid').closest('.vex-dialog-edit').addClass('jscb-input-invalid');
	}

	rdk.vexClose = function(e)
	{
		var $vex = this.closest('.vex');
		this.find('form').jscb('abortAjax');
		rdk.spinner.pause();
		vex.close($vex.data('vex').id);
	}

	rdk.fotorama = function(e, fid)
	{
		if (e && (e.which != 1 || e.ctrlKey)) return;
		e.preventDefault();
		var fotorama = $('#fotorama').data('fotorama');
		fotorama.show(fid);
		fotorama.requestFullScreen();
	}

	rdk.mapInit = function(e)
	{
		function makemap(e, data)
		{
			displayMap(makePlaces(data));
		}

		this.jscb('get', rdk.ajaxUrl('/places'), makemap);
	}

	rdk.adminTab = function(e, target)
	{
		$('.tab').hide();
		$(target).show();
	}


	$(document).ready(function()
	{
		$.ajaxSetup({ timeout: 20000 });

		rdk.spinner = new rdk.Spinner(undefined,
		{
			size: 80,
			stroke: 4,
			color1: '#1173A7',
			color2: '#1173A7',
			speed: 8000
		});

		$('.jscb').jscb(
		{
			namespace: function() { return window.rdk; },
			binds:
			[
				['body', 'jscb:ajax', 'globalAjax'],
				['.focus', '', 'focus'],
				['.nominatim', '', '$', 'nominatim'],
				['.fotorama', '', '$', 'fotorama'],
				['.personSelect', '', '$', 'personSelect'],
				['.vex-dialog-form', 'submit'],
				['.vex-dialog-form', 'jscb:ajax', 'vexAjax'],
				['.vex-dialog-form', 'jscb:validationError', 'vexValidationError'],
				['.vex-cancel', 'click', 'vexClose']
			]
		});
	});

}(window.rdk = window.rdk || {}, jQuery));
