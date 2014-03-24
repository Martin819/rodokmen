

(function($, $$, undefined)
{
	'use strict';

	var defaults =
	{
		minZoom: 0.1,
		maxZoom: 10,
		multiSelect: true,
		fitLabels: true,
		labelPad: 10
	};

	function RaphaelRenderer(options)
	{
		this.options = $.extend({}, defaults, options);

		this.data =
		{
			cy: options.cy,
			container: options.cy.container(),
			fitLabels: this.options.fitLabels
		};
	}

	RaphaelRenderer.isTouch = $$.is.touch();

	RaphaelRenderer.prototype.bindEvents = function()
	{
		var paper = this.data.paper;
		var cy = this.data.cy;
		var options = this.options;

		function eleFromMouse(event)
		{
			var re = paper.getElementByPoint(event.pageX, event.pageY);
			return re ? re.data('cy') : null;
		}

		$(paper.canvas).click(function(ev)
		{
			ev.preventDefault();
			if (ev.button == 0)
			{
				var e = eleFromMouse(ev);
				if (!options.multiSelect || !ev.shiftKey) cy.nodes(':selected').unselect();
				if (e && e.selectable()) e.select();
			}
		})
		.mouseup(function(ev)
		{
			ev.preventDefault();
			if (ev.button == 1)
			{
				cy.zoom(1);
				cy.center();
				cy.nodes().unselect();
			}
		})
		.drag('init', function(ev, dd)
		{
			ev.preventDefault();
			var e = eleFromMouse(ev);
			var ignore;

			if (e)
			{
				ignore = !e.grabbable();
				if (e.selected()) e = cy.nodes('node:selected:grabbable');
				e.each(function(i, ele) { ele.rscratch('raphael').dragOrigPos = { x: ele.position().x, y: ele.position().y }; })
			} else
			{
				ignore = !cy.userPanningEnabled();
			}

			var rdkDrag =
			{
				ignore: ignore,
				ele: e,
				origPan: { x: cy.pan().x, y: cy.pan().y }
			};
			$(this).data('rdkDrag', rdkDrag);
		})
		.drag('start', function(ev, dd)
		{
			var rdkDrag = $(this).data('rdkDrag');
			if (rdkDrag.ele && !rdkDrag.ignore) rdkDrag.ele.grabbed(true);
		})
		.drag(function(ev, dd)
		{
			ev.preventDefault();
			var rdkDrag = $(this).data('rdkDrag');
			if (rdkDrag.ignore) return;
			if (rdkDrag.ele)
			{
				// Dragging (an) element(s)
				var z = cy.zoom();
				rdkDrag.ele.each(function(i, ele)
				{
					var orig = ele.rscratch('raphael').dragOrigPos;
					ele.position({ x: orig.x + dd.deltaX/z, y: orig.y + dd.deltaY/z });
				})
			} else
			{
				// Panning
				cy.pan({ x: rdkDrag.origPan.x + dd.deltaX, y: rdkDrag.origPan.y + dd.deltaY });
			}
		})
		.drag('end', function(ev, dd)
		{
			var rdkDrag = $(this).data('rdkDrag');
			if (rdkDrag.ele) rdkDrag.ele.grabbed(false);
		})
		.mousewheel(function(ev)
		{
			ev.preventDefault();
			if (cy.userZoomingEnabled())
			{
				var lvl = cy.zoom() + cy.zoom()*ev.deltaY/4;
				lvl = clamp(lvl, options.minZoom, options.maxZoom);
				var offset = $(this).offset();
				var pos = { x: ev.pageX - offset.left, y: ev.pageY - offset.top };
				cy.zoom({ level: lvl, renderedPosition: pos });
			}
		});
	}

	RaphaelRenderer.prototype.init = function(eles)
	{
		var d = this.data;
		if (d.paper)
		{
			d.paper.clear();
		} else
		{
			d.paper = new Raphael(d.container, d.container.clientWidth, d.container.clientHeight);
			this.bindEvents();
		}

		d.fitLabels = this.options.fitLabels;

		this.addEles(eles);
	}

	var clamp = function(x, min, max)
	{
		return x > max ? max : (x < min ? min : x);
	}

	RaphaelRenderer.prototype.nodeAttrs = function(node, widthHint)
	{
		// Returns attribs specific to node's shape

		var pos = node.position();
		var width = node.width();

		widthHint += 2*this.options.labelPad
		if (this.data.fitLabels && (node.style().content.length > 0) && (width < widthHint))
		{
			width = widthHint;
			node.css('width', width);
		}
		var height = node.height();

		switch (node.style().shape)
		{
			case 'ellipse': return { cx: pos.x, cy: pos.y, r: width/2 };
			case 'roundrectangle':
				return { x: pos.x-width/2, y: pos.y-height/2, width: width, height: height, r: $$.math.getRoundRectangleRadius(width, height) };
		}
	}

	RaphaelRenderer.prototype.labelPos = function(node)
	{
		var pos = node.position();
		return pos;

		// TODO: various options...
	}

	RaphaelRenderer.prototype.makeNode = function(node)
	{
		var paper = this.data.paper;
		var attrs = this.nodeAttrs(node);
		var labelPos = this.labelPos(node);
		var width = node.width();
		var height = node.height();
		node.rscratch('raphael', {});
		var scratch = node.rscratch('raphael');

		var label = node.style().content;
		var re_label = paper.text(labelPos.x, labelPos.y, label);
		re_label.data('cy', node);

		var re_node;
		switch (node.style().shape)
		{
			case 'ellipse':
				re_node = paper.circle(attrs.cx, attrs.cy, attrs.r);
				break;
			case 'roundrectangle':
				re_node = paper.rect(attrs.x, attrs.y, attrs.width, attrs.height, attrs.r);
				break;
		}
		re_node.data('cy', node);

		re_node.insertBefore(re_label);
		scratch.nodeId = re_node.id;
		scratch.labelId = re_label.id;

		var set = paper.set();
		set.push(re_node);
		set.push(re_label);
		return set;
	}

	RaphaelRenderer.prototype.makeEdgePath = function(edge, ps, pt, cstyle)
	{
		var ps = edge.source().position();
		var pt = edge.target().position();

		if (edge.style().curveStyle == 'bezier')
		{
			// Bezier style edge
			var ay = ps.y + 2*(pt.y - ps.y)/3;
			var by = ps.y +   (pt.y - ps.y)/3;
			return [['M', ps.x, ps.y], ['C', ps.x, ay, pt.x, by, pt.x, pt.y]];
		} else
		{
			// Haystack style edge (asumed)
			return [['M', ps.x, ps.y], ['L', pt.x, pt.y]];
		}
	}

	RaphaelRenderer.prototype.makeEdge = function(edge)
	{
		var paper = this.data.paper;
		edge.rscratch('raphael', {});
		var scratch = edge.rscratch('raphael');
		var path = this.makeEdgePath(edge);

		var re = paper.path(path);
		re.id = edge.id();
		re.data('cy', edge);
		scratch.edgeId = re.id;
		scratch.edgePath = path;
		return re;
	}

	RaphaelRenderer.prototype.addEles = function(eles, updateMappers)
	{
		var self = this;

		eles.nodes().each(function(i, node) { self.makeNode(node); });
		eles.edges().each(function(i, edge) { self.makeEdge(edge); });

		this.updateStyle(eles);
	}

	RaphaelRenderer.prototype.updateViewport = function()
	{
		var paper = this.data.paper;
		var zoom = this.data.cy.zoom();
		var pan = this.data.cy.pan();

		paper.forEach(function(re)
		{
			re.transform('s'+zoom+','+zoom+',0,0'+'T'+pan.x+','+pan.y);
			var ele = re.data('cy');
			var stroke = (ele.isNode() ? ele._private.style['border-width'] : ele._private.style['width']).value
			re.attr({'stroke-width': stroke * zoom});
			// TODO: label's gonna need some adjusting too (size, pos, outline, firefox problems...)
		});
	}

	RaphaelRenderer.prototype.updatePositions = function(eles)
	{
		var self = this;
		var paper = this.data.paper;

		eles.nodes().each(function(i, node)
		{
			var scratch = node.rscratch('raphael');
			var re_node = paper.getById(scratch.nodeId);
			var re_label = paper.getById(scratch.labelId);

			// Move node:
			re_node.attr(self.nodeAttrs(node));

			// Move label:
			re_label.attr(self.labelPos(node));

			// Move connected edges' endpoints:
			function moveEdgeEndp(edge, source)
			{
				var scratch = edge.rscratch('raphael');
				scratch.edgePath = self.makeEdgePath(edge);
				paper.getById(scratch.edgeId).attr({ path: scratch.edgePath });
			}
			var edgesFrom = node.neighborhood("edge[source='"+node.id()+"']");
			var edgesTo   = node.neighborhood("edge[target='"+node.id()+"']");
			edgesFrom.each(function(i, edge) { moveEdgeEndp(edge, true); });
			edgesTo  .each(function(i, edge) { moveEdgeEndp(edge, false); });
		});
	}

	RaphaelRenderer.prototype.updateStyle = function(eles)
	{
		var self = this;
		var paper = this.data.paper;
		var zoom = self.data.cy.zoom();

		eles.nodes().each(function(i, node)
		{
			var re_node  = paper.getById(node.rscratch('raphael').nodeId);
			var re_label = paper.getById(node.rscratch('raphael').labelId);
			var style = node._private.style;
			re_label.attr(
			{
				'fill': style['color'].strValue,
				'font-family': style['font-family'].strValue,
				'font-size': style['font-size'].strValue,
				'font-weight': style['font-weight'].strValue,
				'stroke': style['text-outline-width'] > 0 ? style['text-outline-color'].strValue : 'none',
				'stroke-width': style['text-outline-width'].value,
				'stroke-opacity': style['text-outline-opacity'].value,
				'cursor': 'default'
			});
			re_node.attr(self.nodeAttrs(node, re_label.getBBox().width));
			re_node.attr(
			{
				'fill': style['background-color'].strValue,
				'stroke': style['border-width'].value > 0 ? style['border-color'].strValue : 'none',
				'stroke-width': style['border-width'].value * zoom,
				'stroke-opacity': style['border-opacity'].value
			});
		});

		eles.edges().each(function(i, edge)
		{
			var re = paper.getById(edge.rscratch('raphael').edgeId);
			var style = edge._private.style;
			re.attr(
			{
				'stroke': style['line-color'].strValue,
				'stroke-width': style['width'].value * zoom,
				'opacity': style['opacity'].value
			});
			re.toBack(); // TODO: kinda rough. There might be z-index specified.
		})
	}

	RaphaelRenderer.prototype.notify = function(params)
	{
		// console.log(params);

		switch (params.type)
		{

			case 'load':
				this.init(params.collection);
				this.updateViewport();
				this.data.fitLabels = false;
				break;

			case 'add':
			case 'remove':
				// TODO
				break;

			case 'position':
				this.updatePositions(params.collection);
				break;

			case 'viewport':
				this.updateViewport();
				break;

			case 'style':
				this.updateStyle(params.collection);
				break;

			case 'destroy':
				this.destroy();
				return;
		}
	};

	RaphaelRenderer.prototype.destroy = function()
	{
		this.data.paper.clear();
	};

	$$('renderer', 'raphael', RaphaelRenderer);

})(jQuery, cytoscape);
