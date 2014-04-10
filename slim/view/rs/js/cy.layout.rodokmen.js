

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
		rod: function(data)
		{
			if (this._private.scratch.RodokmenLayout === void 0) this._private.scratch.RodokmenLayout = {};
			if (data === void 0) return this._private.scratch.RodokmenLayout;
			else $$.util.extend(this._private.scratch.RodokmenLayout, data);
		},
		pathWidth: function()
		{
			return this.isM() ? this.rod().mpath_w : this.outerWidth();
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

		baryScans: 3,
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
			var w = m.outerWidth();
			var gen = m.rod().gen;
			var x = m.rod().x;

			m.rod({ mark_mpath: true, mpath: [], mpath_p: [], mpath_c: [] });

			// mpath rod vars:
			// mpath:   members of mpath
			// mpath_m: position of main m in mpath
			// mpath_p: all parent nodes
			// mpath_c: all child nodes
			// mpath_w: width of the whole mpath

			function scan_dir(node) // scans is one direction from m
			{
				var node_next;
				for (; !node.rod().mark_mpath; node = node_next)
				{
					node.rod().mark_mpath = true;
					node_next = node;  //ie. by default scanning ends in the next iteration
					m.rod().mpath.push(node);
					add_height(node, gen);

					if (node.isM())
					{
						node.nodesFrom().each(function(i, ele)
						{
							// There are only two nodesFrom. Pick the unvisited one:
							if (!ele.rod().mark_mpath) node_next = ele;
						});
						node.nodesTo().each(function(i, ele)
						{
							// Add each child to mpath children:
							m.rod().mpath_c.push(ele);
							// Push each child onto the pstack (parent stack):
							ele.rod().gen = gen + 1;
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
								if (!ele.rod().mark_mpath)
								{
									node_next = ele;
									next_found = true;
								}
							} else
							{
								// Then push all the other m's (branches) onto pstack, they will become seperate mpaths (if any)
								ele.rod().gen = gen;
								pstack.push(ele);
							}
						});
						var parent = node.nodesFrom()[0];  // There's either one or none (TODO: special case - adoption)
						if (parent)
						{
							// Add parent to mpath parents:
							m.rod().mpath_p.push(parent);
							// Push parent onto pstack:
							parent.rod().gen = gen - 1;
							pstack.push(parent);
						}
					}

					node.rod({ gen: gen, x: x });
					w += mdist + node.outerWidth();
				}
			}

			var nodesFrom = m.nodesFrom();
			scan_dir(nodesFrom[0]);  // scan to the left of m
			m.rod().mpath.reverse(); // the leftmost member needs to be on index 0
			m.rod().mpath.push(m);   // add self in between
			m.rod().mpath_m = m.rod().mpath.length;
			scan_dir(nodesFrom[1]);  // scan to the right of m

			m.rod().mpath_w = w;

			m.nodesTo().each(function(i, ele)
			{
				// Add each child to mpath children:
				m.rod().mpath_c.push(ele);
				// Push each child onto the pstack (parent stack):
				ele.rod().gen = gen + 1;
				pstack.push(ele);
			});
		}

		// Main DFS
		(function()
		{
			var stack = [];

			var node0 = nodes[0];
			if (!node0.isM() && node0.hasM()) node0 = node0.nodesTo()[0];
			node0.rod().gen = 0;
			stack.push(node0);

			while (stack.length)
			{
				var n = stack.pop();
				if (n.rod().mark_dfs) continue;
				n.rod().mark_dfs = true;

				var gen = n.rod().gen;
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
					offset = offsets[gen];
					n.rod().x = offset;
					scan_mpath(n, stack);
					offsets[gen] = offset + n.rod().mpath_w + hdist;
					gens[gen].push(n);
				} else if (n.hasM())
				{
					// Member of M-Path
					// Just push nearest M:
					var m = n.nodesTo()[0];
					m.rod().gen = gen;
					stack.push(m);
				} else
				{
					// Leaf
					offset = offsets[gen];
					offsets[gen] = offset + n.outerWidth() + hdist;
					gens[gen].push(n);
					var m = n.nodesFrom()[0];
					if (m)
					{
						m.rod().gen = gen - 1;
						stack.push(m);
					}
					n.rod({ x: offset, w: 1 });
				}
			}
		})();

		// Helper for baryGen,
		// returns an array of nodes to use for barycenter heuristic for each node in a gen
		function baryNodes(node)
		{
			if (node.isM())
			{
				return node.rod().mpath_p.concat(node.rod().mpath_c);
			} else
			{
				var from = node.nodesFrom();
				return from.length ? [from[0]] : [];
			}
		}

		// baryGen determines x value for each element in a generation
		// by a barycenter heuristic often used to layout DAG dependency trees
		function baryGen(gen)
		{
			// 1. Determine bary values:
			for (var i = 0; i < gen.length; i++)
			{
				var node = gen[i];
				var barynodes = baryNodes(node);
				var bary = 0;
				var n;

				for (n = 0; n < barynodes.length; n++)
				{
					bary += barynodes[n].rod().x;
				}

				if (n > 0)
				{
					bary /= n;
					node.rod().x = bary;
					if (node.isM())
					{
						var members = node.rod().mpath;
						for (var j = 0; j < members.length; j++) members[j].rod().x = bary;
					}
				}
			}

			// 2. Sort the gen according to the bary value (stored in x):
			gen.sort(function(a, b) { return a.rod().x - b.rod().x; });

			// 3. Resolve collisions:
			var col_open = false;
			var collision, col_minx, col_wdith;

			function collision_layout()
			{
				// Helper function, lays out nodes that are members of a collision group
				var center = (collision[0].rod().x + collision[collision.length-1].rod().x) / 2;
				var cx = center - col_wdith / 2;
				if (cx < col_minx) cx = col_minx;
				var log_nodes = '';
				var log_cx = cx;
				for (var j = 0; j < collision.length; j++)
				{
					log_nodes += collision[j].id() + ' ';
					cx += collision[j].pathWidth() / 2;
					collision[j].rod().x = cx;
					cx += collision[j].pathWidth() / 2 + hdist;
				}
				col_open = false;
			}

			var lastx = gen[0].rod().x + gen[0].pathWidth() / 2 + hdist;
			for (var i = 1; i < gen.length; i++)
			{
				var n = gen[i];
				lastx += n.pathWidth() / 2;    // add half the width of this n so that we can compare with n.x

				if (!col_open)
				{
					if (n.rod().x < lastx)
					{
						// new collision begins
						collision = [];
						col_open = true;
						col_minx = i == 1 ? Number.NEGATIVE_INFINITY : gen[i-2].rod().x + gen[i-2].pathWidth() + hdist;
						col_wdith = gen[i-1].pathWidth() + hdist + n.pathWidth();
						collision.push(gen[i-1]);
						collision.push(n);
					}
				} else
				{
					if (n.rod().x >= lastx)
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

				if (n.rod().x > lastx) lastx = n.rod().x;
				lastx += n.pathWidth() / 2 + hdist;
			}
			if (col_open)
			{
				// last collision remains open, lay it out:
				collision_layout();
			}

			// 4. Layout m-paths:
			function mpath_layout(m, a, b)
			{
				// Helper function, lays out member of mpath in order from index a to b
				// also computes sum of quadratic distances for optimal order estimation
				var inc = (a < b) - (a > b);
				var cx = m.rod().x - m.rod().mpath_w / 2;
				var mbs = m.rod().mpath;
				var sum = 0;
				for (var i = a; i != b + inc; i += inc)
				{
					cx += mbs[i].outerWidth() / 2;
					mbs[i].rod().x = cx;
					cx += mbs[i].outerWidth() / 2 + mdist;
					if (!mbs[i].isM())
					{
						mbs[i].nodesFrom().each(function(i, ele)
						{
							var dist = mbs[i].rod().x - ele.rod().x;
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
					var mbs = n.rod().mpath;
					var mx = n.rod().x;  // backup m's x coordinate, because it gets overwritten by layout
					var l2r = mpath_layout(n, 0, mbs.length - 1);
					n.rod().x = mx;
					var r2l = mpath_layout(n, mbs.length - 1, 0);
					if (l2r < r2l)
					{
						// The former was better, let's bring it back:
						n.rod().x = mx;
						mpath_layout(n, 0, mbs.length - 1);
					}
				}
			}
		}

		// Performs baryGens in top-to-bottom-to-top manner
		function baryGens(i)
		{
			if (i > max_gen) return;
			baryGen(gens[i], true);
			baryGens(i + 1);
			baryGen(gens[i], false);
		}

		// Let's perform a couple of rounds of baryGens
		for (var i = 0; i < options.baryScans; i++)
		{
			baryGens(min_gen);
		}



		// Determine y values based on gens and heights,
		// also determin graph dimensions:
		var y = 0;
		var xmin = Number.POSITIVE_INFINITY;
		var xmax = Number.NEGATIVE_INFINITY;
		function y_dims(node)
		{
			node.rod().y = y;
			if (node.rod().x < xmin) xmin = node.rod().x;
			if (node.rod().x > xmax) xmax = node.rod().x;
		}
		for (var i = min_gen; i <= max_gen; i++)
		{
			y += heights[i] / 2;
			for (var j = 0; j < gens[i].length; j++)
			{
				if (gens[i][j].isM())
				{
					var mbs = gens[i][j].rod().mpath;
					for (var k = 0; k < mbs.length; k++) y_dims(mbs[k]);
				} else y_dims(gens[i][j]);
			}
			y += heights[i] / 2 + options.vdist;
		}
		y -= options.vdist;

		nodes.positions(function(i, ele)
		{
			return { x: ele.rod().x, y: ele.rod().y };
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
