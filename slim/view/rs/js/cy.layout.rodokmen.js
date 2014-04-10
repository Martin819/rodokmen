

(function($$)
{
	// Utilities
	$$.fn.eles(
	{
		nodesTo: function(selector)
		{
			return this.neighborhood("edge[source='"+this.id()+"']").targets(selector);
		},
		nodesFrom: function(selector)
		{
			return this.neighborhood("edge[target='"+this.id()+"']").sources(selector);
		},
		isM: function()
		{
			return !!this.nodes().hasClass('m');
		},
		hasM: function()
		{
			return !this.neighborhood("edge[source='"+this.id()+"']").empty();
		},
		rdk: function(data)
		{
			if (this._private.scratch.RodokmenLayout === void 0) this._private.scratch.RodokmenLayout = {};
			if (data === void 0) return this._private.scratch.RodokmenLayout;
			else $$.util.extend(this._private.scratch.RodokmenLayout, data);
		},
		pathWidth: function()
		{
			return this.isM() ? this.rdk().mpath_w : this.width();
		}
	});
	//

	var defaults =
	{
		ready: undefined,  // callback on layoutready
		stop: undefined,   // callback on layoutstop

		autoFit: true,     // whether to fit the viewport to the graph
		padding: 30,
		hdist: 50,
		mdist: 30,
		vdist: 80,

		baryScans: 2,
		rendererRaphael: true
	};

	function RodokmenLayout(options)
	{
		this.options = $$.util.extend({}, defaults, options);
	}

	RodokmenLayout.prototype.run = function()
	{

		var options = this.options;

		var cy = options.cy;
		var nodes = cy.nodes();
		var edges = cy.edges();
		var container = cy.container();

		var width = container.clientWidth;
		var height = container.clientHeight;

		var hdist = options.hdist;
		var mdist = options.mdist;

		function finish()
		{
			cy.one('layoutready', options.ready);
			cy.trigger('layoutready');

			cy.one('layoutstop', options.stop);
			cy.trigger('layoutstop');
		}

		if (!nodes.length)
		{
			finish();
			return;
		}

		if (options.rendererRaphael)
		{
			// Run the Raphael renderer in advance so that nodes widths are updated if needed
			var raphael = cy._private.renderer;
			cy.nodes().each(function(i, node)
			{
				node.position({ x: 0, y: 0 });
			});
			raphael.notify({ type: 'load', collection: cy.elements() });
		}

		// FIXME: m.rdk()
		// FIXME: outerWidth (?)


		var min_gen, max_gen;
		var gens = [];
		var offsets = [];
		var heights = [];

		function add_height(node, gen)
		{
			var height = node.outerHeight();
			if ((heights[gen] === void 0) || (height > heights[gen])) heights[gen] = height;
		}

		// DFS helper - mpath scanner
		// records mpath members in the main m
		// records parent and child nodes of the whole mpath in the main m
		// computes total width of the mpath
		function scan_mpath(m, pstack)
		{
			var w = m.width();
			var gen = m.rdk().gen;
			var x = m.rdk().x;

			m.rdk({ mark_mpath: true, mpath: [], mpath_p: [], mpath_c: [] });

			// mpath rdk vars:
			// mpath:   members of mpath
			// mpath_m: position of main m in mpath
			// mpath_p: all parent nodes
			// mpath_c: all child nodes
			// mpath_w: width of the whole mpath

			function scan_dir(node) // scans is one direction from m
			{
				var node_next;
				for (; !node.rdk().mark_mpath; node = node_next)
				{
					node.rdk().mark_mpath = true;
					node_next = node;  //ie. by default scanning ends in the next iteration
					m.rdk().mpath.push(node);
					add_height(node, gen);

					if (node.isM())
					{
						node.nodesFrom().each(function(i, ele)
						{
							// There are only two nodesFrom. Pick the unvisited one:
							if (!ele.rdk().mark_mpath) node_next = ele;
						});
						node.nodesTo().each(function(i, ele)
						{
							// Add each child to mpath children:
							m.rdk().mpath_c.push(ele);
							// Push each child onto the pstack (parent stack):
							ele.rdk().gen = gen + 1;
							pstack.push(ele);
						});
					} else
					{
						var next_found = false;
						node.nodesTo().each(function(i, ele)
						{
							if (!next_found)
							{
								// First find an m to continue mpath (if any)
								if (!ele.rdk().mark_mpath)
								{
									node_next = ele;
									next_found = true;
								}
							} else
							{
								// Then push all the other m's (branches) onto pstack, they will become seperate mpaths (if any)
								ele.rdk().gen = gen;
								pstack.push(ele);
							}
						});
						var parent = node.nodesFrom()[0];  // There's either one or none (TODO: special case - adoption)
						if (parent)
						{
							// Add parent to mpath parents:
							m.rdk().mpath_p.push(parent);
							// Push parent onto pstack:
							parent.rdk().gen = gen - 1;
							pstack.push(parent);
						}
					}

					node.rdk({ gen: gen, x: x });
					w += mdist + node.width();
				}
			}

			var nodesFrom = m.nodesFrom();
			scan_dir(nodesFrom[0]);  // scan to the left of m
			m.rdk().mpath.reverse(); // the leftmost member needs to be on index 0
			m.rdk().mpath.push(m);   // add self in between
			m.rdk().mpath_m = m.rdk().mpath.length;
			scan_dir(nodesFrom[1]);  // scan to the right of m

			m.rdk().mpath_w = w;

			m.nodesTo().each(function(i, ele)
			{
				// Add each child to mpath children:
				m.rdk().mpath_c.push(ele);
				// Push each child onto the pstack (parent stack):
				ele.rdk().gen = gen + 1;
				pstack.push(ele);
			});
		}

		// Main DFS
		(function()
		{
			var stack = [];

			var node0 = nodes[0];
			if (!node0.isM() && node0.hasM()) node0 = node0.nodesTo()[0];
			node0.rdk().gen = 0;
			stack.push(node0);

			while (stack.length)
			{
				var n = stack.pop();
				if (n.rdk().mark_dfs) continue;
				n.rdk().mark_dfs = true;

				var gen = n.rdk().gen;
				var offset;

				if ((min_gen === void 0) || (gen < min_gen)) min_gen = gen;
				if ((max_gen === void 0) || (gen > max_gen)) max_gen = gen;

				if (gens[gen] === void 0) gens[gen] = [];
				if (offsets[gen] === void 0) offsets[gen] = 0;
				add_height(n, gen);

				if (n.isM())
				{
					// M
					// Pick an M to represent the whole m-path
					offset = offsets[gen] + hdist;
					n.rdk().x = offset;
					// var width = subdfs(n, stack);
					// offsets[gen] += offset + width;
					// n.rdk().mpath_w = width;
					scan_mpath(n, stack);
					offsets[gen] += offset + n.rdk().mpath_w;
					gens[gen].push(n);
				} else if (n.hasM())
				{
					// Member of M-Path
					// Just push nearest M:
					var m = n.nodesTo()[0];
					m.rdk().gen = gen;
					stack.push(m);
				} else
				{
					// Leaf
					offset = offsets[gen] + hdist;
					offsets[gen] += offset + n.width();
					gens[gen].push(n);
					var m = n.nodesFrom()[0];
					if (m)
					{
						m.rdk().gen = gen - 1;
						stack.push(m);
					}
					n.rdk({ x: offset, w: 1 });
				}
			}
		})();

		// Helper for baryGen,
		// returns an array of nodes to use for barycenter heuristic for each node in a gen
		function baryNodes(node, dir) // dir: true = down, false = up
		{
			dir = !!dir;
			if (dir)
			{
				if (node.isM()) return node.rdk().mpath_p;
				else
				{
					var from = node.nodesFrom();
					return from.length ? from[0] : [];
				}
			} else
			{
				if (node.isM()) return node.rdk().mpath_c;
				else return [];
			}
		}

		// baryGen determines x value for each element in a generation
		// by a barycenter heuristic often used to layout DAG dependency trees
		function baryGen(gen, dir) // dir: true = down, false = up
		{
			dir = !!dir;

			// 1. Determine bary values:
			for (var i = 0; i < gen.length; i++)
			{
				var node = gen[i];
				var barynodes = baryNodes(node, dir);
				var bary = 0;
				var n;

				for (n = 0; n < barynodes.length; n++)
				{
					bary += barynodes[n].rdk().x;
				}

				if (n > 0)
				{
					bary /= n;
					node.rdk().x = bary;
					if (node.isM())
					{
						var members = node.rdk().mpath;
						for (var j = 0; j < members.length; j++) members[j].rdk().x = bary;
					}
				}
			}

			// 2. Sort the according to the bary value (stored in x):
			gen.sort(function(a, b) { return a.rdk().x - b.rdk().x; });

			// 3. Resolve collisions:
			var col_open = false;
			var collision, col_minx, col_wdith;

			function collision_layout()
			{
				// Helper function, lays out nodes that are members of a collision group
				var center = (collision[0].rdk().x + collision[collision.length-1].rdk().x) / 2;
				var cx = center - col_wdith / 2;
				if (cx < col_minx) cx = col_minx;
				var log_nodes = '';
				var log_cx = cx;
				for (var j = 0; j < collision.length; j++)
				{
					log_nodes += collision[j].id() + ' ';
					cx += collision[j].pathWidth() / 2;
					collision[j].rdk().x = cx;
					cx += collision[j].pathWidth() / 2 + hdist;
				}
				col_open = false;
			}

			var lastx = gen[0].rdk().x + gen[0].pathWidth() / 2 + hdist;
			for (var i = 1; i < gen.length; i++)
			{
				var n = gen[i];
				lastx += n.pathWidth() / 2;    // add half the width of this n so that we can compare with n.x

				if (!col_open)
				{
					if (n.rdk().x < lastx)
					{
						// New collision begins
						collision = [];
						col_open = true;
						col_minx = i == 1 ? Number.NEGATIVE_INFINITY : gen[i-2].rdk().x + gen[i-2].pathWidth() + hdist;
						col_wdith = gen[i-1].pathWidth() + hdist + n.pathWidth();
						collision.push(gen[i-1]);
						collision.push(n);
					}
				} else
				{
					if (n.rdk().x >= lastx)
					{
						// collision ends, lay it out:
						collision_layout();
					} else
					{
						// collision continues, just add this node:
						col_wdith += hdist + n.pathWidth();
						collision.push(n);
					}
				}

				if (n.rdk().x > lastx) lastx = n.rdk().x;
				lastx += n.pathWidth() / 2 + hdist;
			}
			if (col_open)
			{
				// Last collision remains open, lay it out:
				collision_layout();
			}

			// 4. Layout m-paths:
			function mpath_layout(m, a, b)
			{
				// Helper function, lays out member of mpath in order from index a to b
				// also computes sum of quadratic distances for optimal order estimation
				var inc = (a < b) - (a > b);
				var cx = m.rdk().x - m.rdk().mpath_w / 2;
				var mbs = m.rdk().mpath;
				var sum = 0;
				for (var i = a; i != b + inc; i += inc)
				{
					cx += mbs[i].width() / 2;
					mbs[i].rdk().x = cx;
					cx += mbs[i].width() / 2 + mdist;
					if (!mbs[i].isM())
					{
						mbs[i].nodesFrom().each(function(i, ele)
						{
							var dist = mbs[i].rdk().x - ele.rdk().x;
							sum += dist*dist;
						})
					}
				}
				return sum;
			}
			for (var i = 0; i < gen.length; i++)
			{
				var n = gen[i];
				if (n.isM())
				{
					var mbs = n.rdk().mpath;
					var mx = n.rdk().x;  // backup m's x coordinate, because it gets overwritten by layout
					var l2r = mpath_layout(n, 0, mbs.length - 1);
					n.rdk().x = mx;
					var r2l = mpath_layout(n, mbs.length - 1, 0);
					if (l2r < r2l)
					{
						// The former was better, let's bring it back:
						n.rdk().x = mx;
						mpath_layout(n, 0, mbs.length - 1);
					}
				}
			}
		}

		// Let's perform baryGen a couple of times:
		for (var i = 0; i < options.baryScans; i++)
		{
			for (var j = min_gen + 1; j <= max_gen; j++)
			{
				baryGen(gens[j], true);
			}
			for (var j = max_gen - 1; j >= min_gen; j--)
			{
				baryGen(gens[j], false);
			}
		}
		// What goes up, must come down... Let's baryGen one last time:
		// NOTE: this time all gens are processed, this is for the case when there's just one gen
		for (var j = min_gen; j <= max_gen; j++)
		{
			baryGen(gens[j], true);
		}

		// Determine y values based on gens and heights,
		// also determin graph dimensions:
		var y = 0;
		var xmin = Number.POSITIVE_INFINITY;
		var xmax = Number.NEGATIVE_INFINITY;
		function y_dims(node)
		{
			node.rdk().y = y;
			if (node.rdk().x < xmin) xmin = node.rdk().x;
			if (node.rdk().x > xmax) xmax = node.rdk().x;
		}
		for (var i = min_gen; i <= max_gen; i++)
		{
			y += heights[i] / 2;
			for (var j = 0; j < gens[i].length; j++)
			{
				if (gens[i][j].isM())
				{
					var mbs = gens[i][j].rdk().mpath;
					for (var k = 0; k < mbs.length; k++) y_dims(mbs[k]);
				} else y_dims(gens[i][j]);
			}
			y += heights[i] / 2 + options.vdist;
		}
		y -= options.vdist;

		nodes.positions(function(i, ele)
		{
			var rdk = ele.rdk();

			var ret =
			{
				x: rdk.x,
				y: rdk.y
			};

			return ret;
		});

		var padding = options.padding;
		if (options.autoFit && ((y + 2*padding > height) || (Math.abs(xmax-xmin) + 2*padding > width )))
		{
			cy.fit(padding);
		}

		cy.center(nodes);

		finish();
	};

	RodokmenLayout.prototype.stop = function()
	{
		// not a continuous layout
	};

	$$("layout", "rodokmen", RodokmenLayout);

})(cytoscape);
