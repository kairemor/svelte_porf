
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Components/Navbar/Navbar.svelte generated by Svelte v3.20.1 */

    const file = "src/Components/Navbar/Navbar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (35:12) {#each navlists as nav}
    function create_each_block(ctx) {
    	let li;
    	let a;
    	let t0_value = /*nav*/ ctx[2].label + "";
    	let t0;
    	let a_href_value;
    	let t1;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "class", "nav-link");
    			attr_dev(a, "href", a_href_value = /*nav*/ ctx[2].url);
    			add_location(a, file, 36, 16, 1294);
    			attr_dev(li, "class", "nav-item");
    			add_location(li, file, 35, 14, 1256);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(li, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*navlists*/ 1 && t0_value !== (t0_value = /*nav*/ ctx[2].label + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*navlists*/ 1 && a_href_value !== (a_href_value = /*nav*/ ctx[2].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(35:12) {#each navlists as nav}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let header_1;
    	let div2;
    	let nav;
    	let div1;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let img0_alt_value;
    	let t0;
    	let a1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let button;
    	let span0;
    	let t2;
    	let span1;
    	let t3;
    	let span2;
    	let t4;
    	let div0;
    	let ul;
    	let each_value = /*navlists*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			header_1 = element("header");
    			div2 = element("div");
    			nav = element("nav");
    			div1 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t0 = space();
    			a1 = element("a");
    			img1 = element("img");
    			t1 = space();
    			button = element("button");
    			span0 = element("span");
    			t2 = space();
    			span1 = element("span");
    			t3 = space();
    			span2 = element("span");
    			t4 = space();
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (img0.src !== (img0_src_value = /*header*/ ctx[1].img)) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", img0_alt_value = /*header*/ ctx[1].alt);
    			add_location(img0, file, 12, 10, 405);
    			attr_dev(a0, "class", "navbar-brand logo_h");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file, 11, 8, 354);
    			if (img1.src !== (img1_src_value = "img/logo2.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file, 15, 10, 528);
    			attr_dev(a1, "class", "navbar-brand logo_inner_page");
    			attr_dev(a1, "href", "/");
    			add_location(a1, file, 14, 8, 468);
    			attr_dev(span0, "class", "icon-bar");
    			add_location(span0, file, 25, 10, 863);
    			attr_dev(span1, "class", "icon-bar");
    			add_location(span1, file, 26, 10, 899);
    			attr_dev(span2, "class", "icon-bar");
    			add_location(span2, file, 27, 10, 935);
    			attr_dev(button, "class", "navbar-toggler");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "data-toggle", "collapse");
    			attr_dev(button, "data-target", "#navbarSupportedContent");
    			attr_dev(button, "aria-controls", "navbarSupportedContent");
    			attr_dev(button, "aria-expanded", "false");
    			attr_dev(button, "aria-label", "Toggle navigation");
    			add_location(button, file, 17, 8, 584);
    			attr_dev(ul, "class", "nav navbar-nav menu_nav");
    			add_location(ul, file, 33, 10, 1169);
    			attr_dev(div0, "class", "collapse navbar-collapse offset");
    			attr_dev(div0, "id", "navbarSupportedContent");
    			add_location(div0, file, 30, 8, 1065);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file, 9, 6, 250);
    			attr_dev(nav, "class", "navbar navbar-expand-lg navbar-light");
    			add_location(nav, file, 8, 4, 193);
    			attr_dev(div2, "class", "main_menu");
    			add_location(div2, file, 7, 2, 165);
    			attr_dev(header_1, "class", "header_area");
    			add_location(header_1, file, 6, 0, 134);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header_1, anchor);
    			append_dev(header_1, div2);
    			append_dev(div2, nav);
    			append_dev(nav, div1);
    			append_dev(div1, a0);
    			append_dev(a0, img0);
    			append_dev(div1, t0);
    			append_dev(div1, a1);
    			append_dev(a1, img1);
    			append_dev(div1, t1);
    			append_dev(div1, button);
    			append_dev(button, span0);
    			append_dev(button, t2);
    			append_dev(button, span1);
    			append_dev(button, t3);
    			append_dev(button, span2);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*header*/ 2 && img0.src !== (img0_src_value = /*header*/ ctx[1].img)) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*header*/ 2 && img0_alt_value !== (img0_alt_value = /*header*/ ctx[1].alt)) {
    				attr_dev(img0, "alt", img0_alt_value);
    			}

    			if (dirty & /*navlists*/ 1) {
    				each_value = /*navlists*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header_1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { navlists = [] } = $$props;
    	let { header = {} } = $$props;
    	const writable_props = ["navlists", "header"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", $$slots, []);

    	$$self.$set = $$props => {
    		if ("navlists" in $$props) $$invalidate(0, navlists = $$props.navlists);
    		if ("header" in $$props) $$invalidate(1, header = $$props.header);
    	};

    	$$self.$capture_state = () => ({ navlists, header });

    	$$self.$inject_state = $$props => {
    		if ("navlists" in $$props) $$invalidate(0, navlists = $$props.navlists);
    		if ("header" in $$props) $$invalidate(1, header = $$props.header);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [navlists, header];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { navlists: 0, header: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get navlists() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set navlists(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get header() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set header(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Banner/Banner.svelte generated by Svelte v3.20.1 */

    const file$1 = "src/Components/Banner/Banner.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (16:14) {#each skills as social}
    function create_each_block$1(ctx) {
    	let span;
    	let i;
    	let i_class_value;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t = space();
    			attr_dev(i, "class", i_class_value = /*social*/ ctx[2].icon);
    			attr_dev(i, "size", "7x");
    			add_location(i, file$1, 17, 18, 625);
    			add_location(span, file$1, 16, 16, 600);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skills*/ 2 && i_class_value !== (i_class_value = /*social*/ ctx[2].icon)) {
    				attr_dev(i, "class", i_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(16:14) {#each skills as social}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let section;
    	let div7;
    	let div6;
    	let div5;
    	let div2;
    	let div1;
    	let h1;
    	let t0_value = /*BANNER*/ ctx[0].header + "";
    	let t0;
    	let t1;
    	let h5;
    	let t2_value = /*BANNER*/ ctx[0].description + "";
    	let t2;
    	let t3;
    	let div0;
    	let t4;
    	let div4;
    	let div3;
    	let img;
    	let img_src_value;
    	let each_value = /*skills*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			h5 = element("h5");
    			t2 = text(t2_value);
    			t3 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			div4 = element("div");
    			div3 = element("div");
    			img = element("img");
    			attr_dev(h1, "class", "text-uppercase");
    			add_location(h1, file$1, 12, 12, 388);
    			attr_dev(h5, "class", "text-uppercase");
    			add_location(h5, file$1, 13, 12, 448);
    			attr_dev(div0, "class", "social_icons my-5");
    			add_location(div0, file$1, 14, 12, 513);
    			attr_dev(div1, "class", "banner_content");
    			add_location(div1, file$1, 11, 10, 347);
    			attr_dev(div2, "class", "col-lg-6");
    			add_location(div2, file$1, 10, 8, 314);
    			attr_dev(img, "class", "img-fluid");
    			if (img.src !== (img_src_value = "img/banner/home-right.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 28, 12, 949);
    			attr_dev(div3, "class", "home_right_img");
    			add_location(div3, file$1, 27, 10, 908);
    			attr_dev(div4, "class", "col-lg-4");
    			add_location(div4, file$1, 26, 8, 875);
    			attr_dev(div5, "class", "row align-items-center justify-content-between");
    			add_location(div5, file$1, 9, 6, 245);
    			attr_dev(div6, "class", "container");
    			add_location(div6, file$1, 8, 4, 215);
    			attr_dev(div7, "class", "banner_inner");
    			add_location(div7, file$1, 7, 2, 184);
    			attr_dev(section, "id", "home");
    			attr_dev(section, "class", "home_banner_area");
    			add_location(section, file$1, 6, 0, 137);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t0);
    			append_dev(div1, t1);
    			append_dev(div1, h5);
    			append_dev(h5, t2);
    			append_dev(div1, t3);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, img);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*BANNER*/ 1 && t0_value !== (t0_value = /*BANNER*/ ctx[0].header + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*BANNER*/ 1 && t2_value !== (t2_value = /*BANNER*/ ctx[0].description + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*skills*/ 2) {
    				each_value = /*skills*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { BANNER = {} } = $$props;
    	let { skills = [] } = $$props;
    	const writable_props = ["BANNER", "skills"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Banner> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Banner", $$slots, []);

    	$$self.$set = $$props => {
    		if ("BANNER" in $$props) $$invalidate(0, BANNER = $$props.BANNER);
    		if ("skills" in $$props) $$invalidate(1, skills = $$props.skills);
    	};

    	$$self.$capture_state = () => ({ BANNER, skills });

    	$$self.$inject_state = $$props => {
    		if ("BANNER" in $$props) $$invalidate(0, BANNER = $$props.BANNER);
    		if ("skills" in $$props) $$invalidate(1, skills = $$props.skills);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [BANNER, skills];
    }

    class Banner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { BANNER: 0, skills: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Banner",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get BANNER() {
    		throw new Error("<Banner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set BANNER(value) {
    		throw new Error("<Banner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get skills() {
    		throw new Error("<Banner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skills(value) {
    		throw new Error("<Banner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Banner/Statistique.svelte generated by Svelte v3.20.1 */

    const file$2 = "src/Components/Banner/Statistique.svelte";

    function create_fragment$2(ctx) {
    	let section;
    	let div7;
    	let div6;
    	let div1;
    	let div0;
    	let h30;
    	let span0;
    	let t1;
    	let t2;
    	let p0;
    	let t4;
    	let div3;
    	let div2;
    	let h31;
    	let span1;
    	let t6;
    	let t7;
    	let p1;
    	let t9;
    	let div5;
    	let div4;
    	let h32;
    	let span2;
    	let t11;
    	let t12;
    	let p2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div7 = element("div");
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			span0 = element("span");
    			span0.textContent = "15";
    			t1 = text("\n            k+");
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Happy Customer";
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			h31 = element("h3");
    			span1 = element("span");
    			span1.textContent = "12";
    			t6 = text("\n            k+");
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "Ticket Solved";
    			t9 = space();
    			div5 = element("div");
    			div4 = element("div");
    			h32 = element("h3");
    			span2 = element("span");
    			span2.textContent = "9";
    			t11 = text("\n            /10");
    			t12 = space();
    			p2 = element("p");
    			p2.textContent = "Average Rating";
    			attr_dev(span0, "class", "counter");
    			add_location(span0, file$2, 11, 12, 318);
    			add_location(h30, file$2, 10, 10, 301);
    			add_location(p0, file$2, 14, 10, 391);
    			attr_dev(div0, "class", "statistics_item");
    			add_location(div0, file$2, 9, 8, 261);
    			attr_dev(div1, "class", "col-lg-2 col-md-3");
    			add_location(div1, file$2, 8, 6, 221);
    			attr_dev(span1, "class", "counter");
    			add_location(span1, file$2, 20, 12, 544);
    			add_location(h31, file$2, 19, 10, 527);
    			add_location(p1, file$2, 23, 10, 617);
    			attr_dev(div2, "class", "statistics_item");
    			add_location(div2, file$2, 18, 8, 487);
    			attr_dev(div3, "class", "col-lg-2 col-md-3");
    			add_location(div3, file$2, 17, 6, 447);
    			attr_dev(span2, "class", "counter");
    			add_location(span2, file$2, 29, 12, 769);
    			add_location(h32, file$2, 28, 10, 752);
    			add_location(p2, file$2, 32, 10, 842);
    			attr_dev(div4, "class", "statistics_item");
    			add_location(div4, file$2, 27, 8, 712);
    			attr_dev(div5, "class", "col-lg-2 col-md-3");
    			add_location(div5, file$2, 26, 6, 672);
    			attr_dev(div6, "class", "row justify-content-lg-start justify-content-center");
    			add_location(div6, file$2, 7, 4, 149);
    			attr_dev(div7, "class", "container");
    			add_location(div7, file$2, 6, 2, 121);
    			attr_dev(section, "class", "statistics_area");
    			add_location(section, file$2, 5, 0, 85);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h30);
    			append_dev(h30, span0);
    			append_dev(h30, t1);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(div6, t4);
    			append_dev(div6, div3);
    			append_dev(div3, div2);
    			append_dev(div2, h31);
    			append_dev(h31, span1);
    			append_dev(h31, t6);
    			append_dev(div2, t7);
    			append_dev(div2, p1);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, h32);
    			append_dev(h32, span2);
    			append_dev(h32, t11);
    			append_dev(div4, t12);
    			append_dev(div4, p2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Statistique> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Statistique", $$slots, []);
    	return [];
    }

    class Statistique extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Statistique",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Components/AboutUs/AboutUs.svelte generated by Svelte v3.20.1 */

    const file$3 = "src/Components/AboutUs/AboutUs.svelte";

    function create_fragment$3(ctx) {
    	let section;
    	let div5;
    	let div4;
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div3;
    	let div2;
    	let p0;
    	let t1_value = /*ABOUT*/ ctx[0].header + "";
    	let t1;
    	let t2;
    	let span0;
    	let t3;
    	let h2;
    	let t4_value = /*ABOUT*/ ctx[0].title + "";
    	let t4;
    	let t5;
    	let p1;
    	let t6_value = /*ABOUT*/ ctx[0].content + "";
    	let t6;
    	let t7;
    	let a;
    	let span1;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div5 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			p0 = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			span0 = element("span");
    			t3 = space();
    			h2 = element("h2");
    			t4 = text(t4_value);
    			t5 = space();
    			p1 = element("p");
    			t6 = text(t6_value);
    			t7 = space();
    			a = element("a");
    			span1 = element("span");
    			span1.textContent = "Download CV";
    			attr_dev(img, "class", "");
    			if (img.src !== (img_src_value = "img/about-us.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$3, 10, 10, 322);
    			attr_dev(div0, "class", "about_img");
    			add_location(div0, file$3, 9, 8, 288);
    			attr_dev(div1, "class", "col-lg-5");
    			add_location(div1, file$3, 8, 6, 257);
    			add_location(span0, file$3, 18, 12, 552);
    			attr_dev(p0, "class", "top_text");
    			add_location(p0, file$3, 16, 10, 492);
    			add_location(h2, file$3, 20, 10, 586);
    			add_location(p1, file$3, 21, 10, 619);
    			add_location(span1, file$3, 23, 12, 702);
    			attr_dev(a, "class", "primary_btn");
    			attr_dev(a, "href", "/my_cv");
    			add_location(a, file$3, 22, 10, 652);
    			attr_dev(div2, "class", "main_title text-left");
    			add_location(div2, file$3, 15, 8, 447);
    			attr_dev(div3, "class", "offset-lg-1 col-lg-5");
    			add_location(div3, file$3, 14, 6, 404);
    			attr_dev(div4, "class", "row justify-content-start align-items-center");
    			add_location(div4, file$3, 7, 4, 192);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$3, 6, 2, 164);
    			attr_dev(section, "id", "about-us");
    			attr_dev(section, "class", "about_area section_gap");
    			add_location(section, file$3, 5, 0, 107);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(p0, t1);
    			append_dev(p0, t2);
    			append_dev(p0, span0);
    			append_dev(div2, t3);
    			append_dev(div2, h2);
    			append_dev(h2, t4);
    			append_dev(div2, t5);
    			append_dev(div2, p1);
    			append_dev(p1, t6);
    			append_dev(div2, t7);
    			append_dev(div2, a);
    			append_dev(a, span1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*ABOUT*/ 1 && t1_value !== (t1_value = /*ABOUT*/ ctx[0].header + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*ABOUT*/ 1 && t4_value !== (t4_value = /*ABOUT*/ ctx[0].title + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*ABOUT*/ 1 && t6_value !== (t6_value = /*ABOUT*/ ctx[0].content + "")) set_data_dev(t6, t6_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { ABOUT = {} } = $$props;
    	const writable_props = ["ABOUT"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AboutUs> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("AboutUs", $$slots, []);

    	$$self.$set = $$props => {
    		if ("ABOUT" in $$props) $$invalidate(0, ABOUT = $$props.ABOUT);
    	};

    	$$self.$capture_state = () => ({ ABOUT });

    	$$self.$inject_state = $$props => {
    		if ("ABOUT" in $$props) $$invalidate(0, ABOUT = $$props.ABOUT);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ABOUT];
    }

    class AboutUs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { ABOUT: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AboutUs",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get ABOUT() {
    		throw new Error("<AboutUs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ABOUT(value) {
    		throw new Error("<AboutUs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Service/Service.svelte generated by Svelte v3.20.1 */

    const file$4 = "src/Components/Service/Service.svelte";

    function create_fragment$4(ctx) {
    	let section;
    	let div10;
    	let div2;
    	let div1;
    	let div0;
    	let p0;
    	let t0;
    	let span;
    	let t1;
    	let h2;
    	let t2;
    	let br;
    	let t3;
    	let t4;
    	let div9;
    	let div4;
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t5;
    	let h40;
    	let t7;
    	let p1;
    	let t9;
    	let a0;
    	let t11;
    	let div6;
    	let div5;
    	let img1;
    	let img1_src_value;
    	let t12;
    	let h41;
    	let t14;
    	let p2;
    	let t16;
    	let a1;
    	let t18;
    	let div8;
    	let div7;
    	let img2;
    	let img2_src_value;
    	let t19;
    	let h42;
    	let t21;
    	let p3;
    	let t23;
    	let a2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div10 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("My Service\n            ");
    			span = element("span");
    			t1 = space();
    			h2 = element("h2");
    			t2 = text("What Service I\n            ");
    			br = element("br");
    			t3 = text("\n            Offer For You");
    			t4 = space();
    			div9 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			img0 = element("img");
    			t5 = space();
    			h40 = element("h4");
    			h40.textContent = "Web Development";
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "Fruit saw for brought fish forth had ave is man a that their Two he\n            is dominion evening their Fruit saw for brought fish forth";
    			t9 = space();
    			a0 = element("a");
    			a0.textContent = "Learn More";
    			t11 = space();
    			div6 = element("div");
    			div5 = element("div");
    			img1 = element("img");
    			t12 = space();
    			h41 = element("h4");
    			h41.textContent = "Mobile Development";
    			t14 = space();
    			p2 = element("p");
    			p2.textContent = "Fruit saw for brought fish forth had ave is man a that their Two he\n            is dominion evening their Fruit saw for brought fish forth";
    			t16 = space();
    			a1 = element("a");
    			a1.textContent = "Learn More";
    			t18 = space();
    			div8 = element("div");
    			div7 = element("div");
    			img2 = element("img");
    			t19 = space();
    			h42 = element("h4");
    			h42.textContent = "Big Data and AI";
    			t21 = space();
    			p3 = element("p");
    			p3.textContent = "Fruit saw for brought fish forth had ave is man a that their Two he\n            is dominion evening their Fruit saw for brought fish forth";
    			t23 = space();
    			a2 = element("a");
    			a2.textContent = "Learn More";
    			add_location(span, file$4, 8, 12, 285);
    			attr_dev(p0, "class", "top_text");
    			add_location(p0, file$4, 6, 10, 229);
    			add_location(br, file$4, 12, 12, 363);
    			add_location(h2, file$4, 10, 10, 319);
    			attr_dev(div0, "class", "main_title");
    			add_location(div0, file$4, 5, 8, 194);
    			attr_dev(div1, "class", "col-lg-12");
    			add_location(div1, file$4, 4, 6, 162);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$4, 3, 4, 138);
    			if (img0.src !== (img0_src_value = "img/services/s1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$4, 22, 10, 570);
    			add_location(h40, file$4, 23, 10, 621);
    			add_location(p1, file$4, 24, 10, 656);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "primary_btn2 mt-35");
    			add_location(a0, file$4, 28, 10, 836);
    			attr_dev(div3, "class", "service_item");
    			add_location(div3, file$4, 21, 8, 533);
    			attr_dev(div4, "class", "col-lg-4 col-md-6 mb-4 mb-lg-0");
    			add_location(div4, file$4, 20, 6, 480);
    			if (img1.src !== (img1_src_value = "img/services/s2.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$4, 34, 10, 1015);
    			add_location(h41, file$4, 35, 10, 1066);
    			add_location(p2, file$4, 36, 10, 1104);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "class", "primary_btn2 mt-35");
    			add_location(a1, file$4, 40, 10, 1284);
    			attr_dev(div5, "class", "service_item");
    			add_location(div5, file$4, 33, 8, 978);
    			attr_dev(div6, "class", "col-lg-4 col-md-6 mb-4 mb-lg-0");
    			add_location(div6, file$4, 32, 6, 925);
    			if (img2.src !== (img2_src_value = "img/services/s3.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$4, 46, 10, 1463);
    			add_location(h42, file$4, 47, 10, 1514);
    			add_location(p3, file$4, 48, 10, 1549);
    			attr_dev(a2, "href", "/");
    			attr_dev(a2, "class", "primary_btn2 mt-35");
    			add_location(a2, file$4, 52, 10, 1729);
    			attr_dev(div7, "class", "service_item");
    			add_location(div7, file$4, 45, 8, 1426);
    			attr_dev(div8, "class", "col-lg-4 col-md-6 mb-4 mb-lg-0");
    			add_location(div8, file$4, 44, 6, 1373);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$4, 19, 4, 456);
    			attr_dev(div10, "class", "container");
    			add_location(div10, file$4, 2, 2, 110);
    			attr_dev(section, "id", "services");
    			attr_dev(section, "class", "services_area");
    			add_location(section, file$4, 1, 0, 62);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div10);
    			append_dev(div10, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(p0, span);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(h2, t2);
    			append_dev(h2, br);
    			append_dev(h2, t3);
    			append_dev(div10, t4);
    			append_dev(div10, div9);
    			append_dev(div9, div4);
    			append_dev(div4, div3);
    			append_dev(div3, img0);
    			append_dev(div3, t5);
    			append_dev(div3, h40);
    			append_dev(div3, t7);
    			append_dev(div3, p1);
    			append_dev(div3, t9);
    			append_dev(div3, a0);
    			append_dev(div9, t11);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div5, img1);
    			append_dev(div5, t12);
    			append_dev(div5, h41);
    			append_dev(div5, t14);
    			append_dev(div5, p2);
    			append_dev(div5, t16);
    			append_dev(div5, a1);
    			append_dev(div9, t18);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, img2);
    			append_dev(div7, t19);
    			append_dev(div7, h42);
    			append_dev(div7, t21);
    			append_dev(div7, p3);
    			append_dev(div7, t23);
    			append_dev(div7, a2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Service> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Service", $$slots, []);
    	return [];
    }

    class Service extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Service",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/Components/Project/Project.svelte generated by Svelte v3.20.1 */

    const file$5 = "src/Components/Project/Project.svelte";

    function create_fragment$5(ctx) {
    	let section;
    	let div22;
    	let div2;
    	let div1;
    	let div0;
    	let p0;
    	let t0;
    	let span0;
    	let t1;
    	let h2;
    	let t2;
    	let br;
    	let t3;
    	let t4;
    	let div21;
    	let div8;
    	let div7;
    	let div4;
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t5;
    	let div6;
    	let div5;
    	let h40;
    	let t7;
    	let p1;
    	let small0;
    	let t9;
    	let p2;
    	let t11;
    	let ul0;
    	let li0;
    	let span1;
    	let i0;
    	let t12;
    	let li1;
    	let span2;
    	let i1;
    	let t13;
    	let li2;
    	let span3;
    	let i2;
    	let t14;
    	let li3;
    	let span4;
    	let i3;
    	let t15;
    	let li4;
    	let span5;
    	let i4;
    	let t16;
    	let div14;
    	let div13;
    	let div10;
    	let div9;
    	let img1;
    	let img1_src_value;
    	let t17;
    	let div12;
    	let div11;
    	let h41;
    	let t19;
    	let p3;
    	let small1;
    	let t21;
    	let p4;
    	let t23;
    	let ul1;
    	let li5;
    	let span6;
    	let i5;
    	let t24;
    	let li6;
    	let span7;
    	let i6;
    	let t25;
    	let li7;
    	let span8;
    	let i7;
    	let t26;
    	let li8;
    	let span9;
    	let i8;
    	let t27;
    	let li9;
    	let span10;
    	let i9;
    	let t28;
    	let div20;
    	let div19;
    	let div16;
    	let div15;
    	let img2;
    	let img2_src_value;
    	let t29;
    	let div18;
    	let div17;
    	let h42;
    	let t31;
    	let p5;
    	let small2;
    	let t33;
    	let p6;
    	let t35;
    	let ul2;
    	let li10;
    	let span11;
    	let i10;
    	let t36;
    	let li11;
    	let span12;
    	let i11;
    	let t37;
    	let li12;
    	let span13;
    	let i12;
    	let t38;
    	let li13;
    	let span14;
    	let i13;
    	let t39;
    	let li14;
    	let span15;
    	let i14;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div22 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("Our Tesitmonial\n            ");
    			span0 = element("span");
    			t1 = space();
    			h2 = element("h2");
    			t2 = text("Honourable Client Says\n            ");
    			br = element("br");
    			t3 = text("\n            About Me");
    			t4 = space();
    			div21 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			img0 = element("img");
    			t5 = space();
    			div6 = element("div");
    			div5 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Roser Henrique";
    			t7 = space();
    			p1 = element("p");
    			small0 = element("small");
    			small0.textContent = "Project Manager, Apple";
    			t9 = space();
    			p2 = element("p");
    			p2.textContent = "Waters can not replenish hath fly and be to brought isn't very\n                days behold without land every above lights us fruitful wherein\n                divide it him fowl moving may beginning subdue fly waters can't\n                replenish hath fly and be to brought isn't very days behold";
    			t11 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			span1 = element("span");
    			i0 = element("i");
    			t12 = space();
    			li1 = element("li");
    			span2 = element("span");
    			i1 = element("i");
    			t13 = space();
    			li2 = element("li");
    			span3 = element("span");
    			i2 = element("i");
    			t14 = space();
    			li3 = element("li");
    			span4 = element("span");
    			i3 = element("i");
    			t15 = space();
    			li4 = element("li");
    			span5 = element("span");
    			i4 = element("i");
    			t16 = space();
    			div14 = element("div");
    			div13 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			img1 = element("img");
    			t17 = space();
    			div12 = element("div");
    			div11 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Roser Henrique";
    			t19 = space();
    			p3 = element("p");
    			small1 = element("small");
    			small1.textContent = "Project Manager, Apple";
    			t21 = space();
    			p4 = element("p");
    			p4.textContent = "Waters can not replenish hath fly and be to brought isn't very\n                days behold without land every above lights us fruitful wherein\n                divide it him fowl moving may beginning subdue fly waters can't\n                replenish hath fly and be to brought isn't very days behold";
    			t23 = space();
    			ul1 = element("ul");
    			li5 = element("li");
    			span6 = element("span");
    			i5 = element("i");
    			t24 = space();
    			li6 = element("li");
    			span7 = element("span");
    			i6 = element("i");
    			t25 = space();
    			li7 = element("li");
    			span8 = element("span");
    			i7 = element("i");
    			t26 = space();
    			li8 = element("li");
    			span9 = element("span");
    			i8 = element("i");
    			t27 = space();
    			li9 = element("li");
    			span10 = element("span");
    			i9 = element("i");
    			t28 = space();
    			div20 = element("div");
    			div19 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			img2 = element("img");
    			t29 = space();
    			div18 = element("div");
    			div17 = element("div");
    			h42 = element("h4");
    			h42.textContent = "Roser Henrique";
    			t31 = space();
    			p5 = element("p");
    			small2 = element("small");
    			small2.textContent = "Project Manager, Apple";
    			t33 = space();
    			p6 = element("p");
    			p6.textContent = "Waters can not replenish hath fly and be to brought isn't very\n                days behold without land every above lights us fruitful wherein\n                divide it him fowl moving may beginning subdue fly waters can't\n                replenish hath fly and be to brought isn't very days behold";
    			t35 = space();
    			ul2 = element("ul");
    			li10 = element("li");
    			span11 = element("span");
    			i10 = element("i");
    			t36 = space();
    			li11 = element("li");
    			span12 = element("span");
    			i11 = element("i");
    			t37 = space();
    			li12 = element("li");
    			span13 = element("span");
    			i12 = element("i");
    			t38 = space();
    			li13 = element("li");
    			span14 = element("span");
    			i13 = element("i");
    			t39 = space();
    			li14 = element("li");
    			span15 = element("span");
    			i14 = element("i");
    			add_location(span0, file$5, 8, 12, 282);
    			attr_dev(p0, "class", "top_text");
    			add_location(p0, file$5, 6, 10, 221);
    			add_location(br, file$5, 12, 12, 368);
    			add_location(h2, file$5, 10, 10, 316);
    			attr_dev(div0, "class", "main_title");
    			add_location(div0, file$5, 5, 8, 186);
    			attr_dev(div1, "class", "col-lg-12");
    			add_location(div1, file$5, 4, 6, 154);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$5, 3, 4, 130);
    			if (img0.src !== (img0_src_value = "img/testimonials/testimonial1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$5, 24, 14, 672);
    			attr_dev(div3, "class", "testi-img mb-4 mb-lg-0");
    			add_location(div3, file$5, 23, 12, 621);
    			attr_dev(div4, "class", "col-lg-6");
    			add_location(div4, file$5, 22, 10, 586);
    			add_location(h40, file$5, 29, 14, 848);
    			add_location(small0, file$5, 31, 16, 906);
    			add_location(p1, file$5, 30, 14, 886);
    			add_location(p2, file$5, 33, 14, 977);
    			attr_dev(i0, "class", "fas fa-star");
    			add_location(i0, file$5, 42, 20, 1425);
    			add_location(span1, file$5, 41, 18, 1398);
    			add_location(li0, file$5, 40, 16, 1375);
    			attr_dev(i1, "class", "fas fa-star");
    			add_location(i1, file$5, 47, 20, 1565);
    			add_location(span2, file$5, 46, 18, 1538);
    			add_location(li1, file$5, 45, 16, 1515);
    			attr_dev(i2, "class", "fas fa-star");
    			add_location(i2, file$5, 52, 20, 1705);
    			add_location(span3, file$5, 51, 18, 1678);
    			add_location(li2, file$5, 50, 16, 1655);
    			attr_dev(i3, "class", "fas fa-star");
    			add_location(i3, file$5, 57, 20, 1845);
    			add_location(span4, file$5, 56, 18, 1818);
    			add_location(li3, file$5, 55, 16, 1795);
    			attr_dev(i4, "class", "fas fa-star");
    			add_location(i4, file$5, 62, 20, 2001);
    			add_location(span5, file$5, 61, 18, 1974);
    			attr_dev(li4, "class", "disable");
    			add_location(li4, file$5, 60, 16, 1935);
    			attr_dev(ul0, "class", "star_rating mt-4");
    			add_location(ul0, file$5, 39, 14, 1329);
    			attr_dev(div5, "class", "testi-right");
    			add_location(div5, file$5, 28, 12, 808);
    			attr_dev(div6, "class", "col-lg-6");
    			add_location(div6, file$5, 27, 10, 773);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$5, 21, 8, 558);
    			attr_dev(div8, "class", "testimonial-item");
    			add_location(div8, file$5, 20, 6, 519);
    			if (img1.src !== (img1_src_value = "img/testimonials/testimonial1.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$5, 75, 14, 2319);
    			attr_dev(div9, "class", "testi-img mb-4 mb-lg-0");
    			add_location(div9, file$5, 74, 12, 2268);
    			attr_dev(div10, "class", "col-lg-6");
    			add_location(div10, file$5, 73, 10, 2233);
    			add_location(h41, file$5, 80, 14, 2495);
    			add_location(small1, file$5, 82, 16, 2553);
    			add_location(p3, file$5, 81, 14, 2533);
    			add_location(p4, file$5, 85, 14, 2625);
    			attr_dev(i5, "class", "fas fa-star");
    			add_location(i5, file$5, 94, 20, 3073);
    			add_location(span6, file$5, 93, 18, 3046);
    			add_location(li5, file$5, 92, 16, 3023);
    			attr_dev(i6, "class", "fas fa-star");
    			add_location(i6, file$5, 99, 20, 3213);
    			add_location(span7, file$5, 98, 18, 3186);
    			add_location(li6, file$5, 97, 16, 3163);
    			attr_dev(i7, "class", "fas fa-star");
    			add_location(i7, file$5, 104, 20, 3353);
    			add_location(span8, file$5, 103, 18, 3326);
    			add_location(li7, file$5, 102, 16, 3303);
    			attr_dev(i8, "class", "fas fa-star");
    			add_location(i8, file$5, 109, 20, 3493);
    			add_location(span9, file$5, 108, 18, 3466);
    			add_location(li8, file$5, 107, 16, 3443);
    			attr_dev(i9, "class", "fas fa-star");
    			add_location(i9, file$5, 114, 20, 3649);
    			add_location(span10, file$5, 113, 18, 3622);
    			attr_dev(li9, "class", "disable");
    			add_location(li9, file$5, 112, 16, 3583);
    			attr_dev(ul1, "class", "star_rating mt-3");
    			add_location(ul1, file$5, 91, 14, 2977);
    			attr_dev(div11, "class", "testi-right");
    			add_location(div11, file$5, 79, 12, 2455);
    			attr_dev(div12, "class", "col-lg-6");
    			add_location(div12, file$5, 78, 10, 2420);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$5, 72, 8, 2205);
    			attr_dev(div14, "class", "testimonial-item");
    			add_location(div14, file$5, 71, 6, 2166);
    			if (img2.src !== (img2_src_value = "img/testimonials/testimonial1.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$5, 127, 14, 3967);
    			attr_dev(div15, "class", "testi-img mb-4 mb-lg-0");
    			add_location(div15, file$5, 126, 12, 3916);
    			attr_dev(div16, "class", "col-lg-6");
    			add_location(div16, file$5, 125, 10, 3881);
    			add_location(h42, file$5, 132, 14, 4143);
    			add_location(small2, file$5, 134, 16, 4201);
    			add_location(p5, file$5, 133, 14, 4181);
    			add_location(p6, file$5, 137, 14, 4273);
    			attr_dev(i10, "class", "fas fa-star");
    			add_location(i10, file$5, 146, 20, 4721);
    			add_location(span11, file$5, 145, 18, 4694);
    			add_location(li10, file$5, 144, 16, 4671);
    			attr_dev(i11, "class", "fas fa-star");
    			add_location(i11, file$5, 151, 20, 4861);
    			add_location(span12, file$5, 150, 18, 4834);
    			add_location(li11, file$5, 149, 16, 4811);
    			attr_dev(i12, "class", "fas fa-star");
    			add_location(i12, file$5, 156, 20, 5001);
    			add_location(span13, file$5, 155, 18, 4974);
    			add_location(li12, file$5, 154, 16, 4951);
    			attr_dev(i13, "class", "fas fa-star");
    			add_location(i13, file$5, 161, 20, 5141);
    			add_location(span14, file$5, 160, 18, 5114);
    			add_location(li13, file$5, 159, 16, 5091);
    			attr_dev(i14, "class", "fas fa-star");
    			add_location(i14, file$5, 166, 20, 5297);
    			add_location(span15, file$5, 165, 18, 5270);
    			attr_dev(li14, "class", "disable");
    			add_location(li14, file$5, 164, 16, 5231);
    			attr_dev(ul2, "class", "star_rating mt-3");
    			add_location(ul2, file$5, 143, 14, 4625);
    			attr_dev(div17, "class", "testi-right");
    			add_location(div17, file$5, 131, 12, 4103);
    			attr_dev(div18, "class", "col-lg-6");
    			add_location(div18, file$5, 130, 10, 4068);
    			attr_dev(div19, "class", "row");
    			add_location(div19, file$5, 124, 8, 3853);
    			attr_dev(div20, "class", "testimonial-item");
    			add_location(div20, file$5, 123, 6, 3814);
    			attr_dev(div21, "class", "owl-carousel owl-theme testimonial-slider ");
    			add_location(div21, file$5, 19, 4, 456);
    			attr_dev(div22, "class", "container");
    			add_location(div22, file$5, 2, 2, 102);
    			attr_dev(section, "class", "testimonial_area");
    			add_location(section, file$5, 1, 0, 65);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div22);
    			append_dev(div22, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(p0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(h2, t2);
    			append_dev(h2, br);
    			append_dev(h2, t3);
    			append_dev(div22, t4);
    			append_dev(div22, div21);
    			append_dev(div21, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div4);
    			append_dev(div4, div3);
    			append_dev(div3, img0);
    			append_dev(div7, t5);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, h40);
    			append_dev(div5, t7);
    			append_dev(div5, p1);
    			append_dev(p1, small0);
    			append_dev(div5, t9);
    			append_dev(div5, p2);
    			append_dev(div5, t11);
    			append_dev(div5, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, span1);
    			append_dev(span1, i0);
    			append_dev(ul0, t12);
    			append_dev(ul0, li1);
    			append_dev(li1, span2);
    			append_dev(span2, i1);
    			append_dev(ul0, t13);
    			append_dev(ul0, li2);
    			append_dev(li2, span3);
    			append_dev(span3, i2);
    			append_dev(ul0, t14);
    			append_dev(ul0, li3);
    			append_dev(li3, span4);
    			append_dev(span4, i3);
    			append_dev(ul0, t15);
    			append_dev(ul0, li4);
    			append_dev(li4, span5);
    			append_dev(span5, i4);
    			append_dev(div21, t16);
    			append_dev(div21, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div10);
    			append_dev(div10, div9);
    			append_dev(div9, img1);
    			append_dev(div13, t17);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, h41);
    			append_dev(div11, t19);
    			append_dev(div11, p3);
    			append_dev(p3, small1);
    			append_dev(div11, t21);
    			append_dev(div11, p4);
    			append_dev(div11, t23);
    			append_dev(div11, ul1);
    			append_dev(ul1, li5);
    			append_dev(li5, span6);
    			append_dev(span6, i5);
    			append_dev(ul1, t24);
    			append_dev(ul1, li6);
    			append_dev(li6, span7);
    			append_dev(span7, i6);
    			append_dev(ul1, t25);
    			append_dev(ul1, li7);
    			append_dev(li7, span8);
    			append_dev(span8, i7);
    			append_dev(ul1, t26);
    			append_dev(ul1, li8);
    			append_dev(li8, span9);
    			append_dev(span9, i8);
    			append_dev(ul1, t27);
    			append_dev(ul1, li9);
    			append_dev(li9, span10);
    			append_dev(span10, i9);
    			append_dev(div21, t28);
    			append_dev(div21, div20);
    			append_dev(div20, div19);
    			append_dev(div19, div16);
    			append_dev(div16, div15);
    			append_dev(div15, img2);
    			append_dev(div19, t29);
    			append_dev(div19, div18);
    			append_dev(div18, div17);
    			append_dev(div17, h42);
    			append_dev(div17, t31);
    			append_dev(div17, p5);
    			append_dev(p5, small2);
    			append_dev(div17, t33);
    			append_dev(div17, p6);
    			append_dev(div17, t35);
    			append_dev(div17, ul2);
    			append_dev(ul2, li10);
    			append_dev(li10, span11);
    			append_dev(span11, i10);
    			append_dev(ul2, t36);
    			append_dev(ul2, li11);
    			append_dev(li11, span12);
    			append_dev(span12, i11);
    			append_dev(ul2, t37);
    			append_dev(ul2, li12);
    			append_dev(li12, span13);
    			append_dev(span13, i12);
    			append_dev(ul2, t38);
    			append_dev(ul2, li13);
    			append_dev(li13, span14);
    			append_dev(span14, i13);
    			append_dev(ul2, t39);
    			append_dev(ul2, li14);
    			append_dev(li14, span15);
    			append_dev(span15, i14);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Project> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Project", $$slots, []);
    	return [];
    }

    class Project extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Project",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/Components/Footer/Footer.svelte generated by Svelte v3.20.1 */

    const file$6 = "src/Components/Footer/Footer.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (22:20) {#each navlists as nav}
    function create_each_block_1(ctx) {
    	let li;
    	let a;
    	let t0_value = /*nav*/ ctx[5].label + "";
    	let t0;
    	let a_href_value;
    	let t1;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "class", "nav-link text-white");
    			attr_dev(a, "href", a_href_value = /*nav*/ ctx[5].url);
    			add_location(a, file$6, 23, 24, 831);
    			attr_dev(li, "class", "nav-item");
    			add_location(li, file$6, 22, 22, 785);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(li, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*navlists*/ 1 && t0_value !== (t0_value = /*nav*/ ctx[5].label + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*navlists*/ 1 && a_href_value !== (a_href_value = /*nav*/ ctx[5].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(22:20) {#each navlists as nav}",
    		ctx
    	});

    	return block;
    }

    // (35:12) {#each socials as social}
    function create_each_block$2(ctx) {
    	let a;
    	let i;
    	let i_class_value;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			i = element("i");
    			attr_dev(i, "class", i_class_value = /*social*/ ctx[2].icon);
    			add_location(i, file$6, 36, 16, 1246);
    			attr_dev(a, "href", a_href_value = /*social*/ ctx[2].url);
    			add_location(a, file$6, 35, 14, 1208);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, i);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*socials*/ 2 && i_class_value !== (i_class_value = /*social*/ ctx[2].icon)) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (dirty & /*socials*/ 2 && a_href_value !== (a_href_value = /*social*/ ctx[2].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(35:12) {#each socials as social}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let footer;
    	let div8;
    	let div6;
    	let div5;
    	let div4;
    	let div2;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let nav;
    	let div0;
    	let ul;
    	let t1;
    	let div3;
    	let t2;
    	let a1;
    	let i0;
    	let t3;
    	let a2;
    	let i1;
    	let t4;
    	let a3;
    	let i2;
    	let t5;
    	let a4;
    	let i3;
    	let t6;
    	let div7;
    	let p;
    	let t7;
    	let script;
    	let t9;
    	let i4;
    	let t10;
    	let a5;
    	let each_value_1 = /*navlists*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*socials*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div8 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			nav = element("nav");
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			a1 = element("a");
    			i0 = element("i");
    			t3 = space();
    			a2 = element("a");
    			i1 = element("i");
    			t4 = space();
    			a3 = element("a");
    			i2 = element("i");
    			t5 = space();
    			a4 = element("a");
    			i3 = element("i");
    			t6 = space();
    			div7 = element("div");
    			p = element("p");
    			t7 = text("Copyright ©\n        ");
    			script = element("script");
    			script.textContent = "document.write(new Date().getFullYear());";
    			t9 = text("\n        All rights reserved | This is made with\n        ");
    			i4 = element("i");
    			t10 = text("\n        by\n        ");
    			a5 = element("a");
    			a5.textContent = "Colorlib";
    			if (img.src !== (img_src_value = "img/logo2.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$6, 13, 14, 378);
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$6, 12, 12, 351);
    			attr_dev(ul, "class", "nav navbar-nav menu_nav mx-auto");
    			add_location(ul, file$6, 20, 18, 674);
    			attr_dev(div0, "class", "collapse navbar-collapse offset");
    			add_location(div0, file$6, 19, 16, 610);
    			attr_dev(nav, "class", "navbar navbar-expand-lg navbar-light\n                justify-content-center");
    			add_location(nav, file$6, 16, 14, 488);
    			attr_dev(div1, "class", "d-lg-block d-none");
    			add_location(div1, file$6, 15, 12, 442);
    			attr_dev(div2, "class", "footer_logo");
    			add_location(div2, file$6, 11, 10, 313);
    			attr_dev(i0, "class", "fab fa-facebook-f");
    			add_location(i0, file$6, 40, 14, 1350);
    			attr_dev(a1, "href", "/");
    			add_location(a1, file$6, 39, 12, 1323);
    			attr_dev(i1, "class", "fab fa-twitter");
    			add_location(i1, file$6, 43, 14, 1438);
    			attr_dev(a2, "href", "/");
    			add_location(a2, file$6, 42, 12, 1411);
    			attr_dev(i2, "class", "fab fa-skype");
    			add_location(i2, file$6, 46, 14, 1523);
    			attr_dev(a3, "href", "/");
    			add_location(a3, file$6, 45, 12, 1496);
    			attr_dev(i3, "class", "fab fa-pinterest-p");
    			add_location(i3, file$6, 49, 14, 1606);
    			attr_dev(a4, "href", "/");
    			add_location(a4, file$6, 48, 12, 1579);
    			attr_dev(div3, "class", "footer_social mt-lg-0 mt-4");
    			add_location(div3, file$6, 33, 10, 1115);
    			attr_dev(div4, "class", "footer_top flex-column");
    			add_location(div4, file$6, 10, 8, 266);
    			attr_dev(div5, "class", "col-lg-12");
    			add_location(div5, file$6, 9, 6, 234);
    			attr_dev(div6, "class", "row justify-content-center");
    			add_location(div6, file$6, 8, 4, 187);
    			add_location(script, file$6, 59, 8, 1948);
    			attr_dev(i4, "class", "fa fa-heart");
    			attr_dev(i4, "aria-hidden", "true");
    			add_location(i4, file$6, 63, 8, 2083);
    			attr_dev(a5, "href", "https://colorlib.com");
    			attr_dev(a5, "target", "_blank");
    			add_location(a5, file$6, 65, 8, 2147);
    			attr_dev(p, "class", "col-lg-8 col-sm-12 footer-text");
    			add_location(p, file$6, 56, 6, 1777);
    			attr_dev(div7, "class", "row footer_bottom justify-content-center");
    			add_location(div7, file$6, 55, 4, 1716);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file$6, 7, 2, 159);
    			attr_dev(footer, "class", "footer_area");
    			add_location(footer, file$6, 6, 0, 128);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div8);
    			append_dev(div8, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, a0);
    			append_dev(a0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, nav);
    			append_dev(nav, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul, null);
    			}

    			append_dev(div4, t1);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			append_dev(div3, t2);
    			append_dev(div3, a1);
    			append_dev(a1, i0);
    			append_dev(div3, t3);
    			append_dev(div3, a2);
    			append_dev(a2, i1);
    			append_dev(div3, t4);
    			append_dev(div3, a3);
    			append_dev(a3, i2);
    			append_dev(div3, t5);
    			append_dev(div3, a4);
    			append_dev(a4, i3);
    			append_dev(div8, t6);
    			append_dev(div8, div7);
    			append_dev(div7, p);
    			append_dev(p, t7);
    			append_dev(p, script);
    			append_dev(p, t9);
    			append_dev(p, i4);
    			append_dev(p, t10);
    			append_dev(p, a5);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*navlists*/ 1) {
    				each_value_1 = /*navlists*/ ctx[0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*socials*/ 2) {
    				each_value = /*socials*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { navlists = [] } = $$props;
    	let { socials = [] } = $$props;
    	const writable_props = ["navlists", "socials"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Footer", $$slots, []);

    	$$self.$set = $$props => {
    		if ("navlists" in $$props) $$invalidate(0, navlists = $$props.navlists);
    		if ("socials" in $$props) $$invalidate(1, socials = $$props.socials);
    	};

    	$$self.$capture_state = () => ({ navlists, socials });

    	$$self.$inject_state = $$props => {
    		if ("navlists" in $$props) $$invalidate(0, navlists = $$props.navlists);
    		if ("socials" in $$props) $$invalidate(1, socials = $$props.socials);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [navlists, socials];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { navlists: 0, socials: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get navlists() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set navlists(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get socials() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set socials(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    const twOpts = {
    	duration: 1000,
    	easing: cubicOut
    };

    function serieStore(serie, thresholds) {

    	const s = tweened({
    		offset: 0,
    		prevOffset: 0,
    		color: serie.color
    	}, {
    		...twOpts,
    		interpolate: (startVal, targetVal) => t => {
    			const val = {
    				offset: (targetVal.offset - startVal.offset) * t,
    				prevOffset: (targetVal.prevOffset - startVal.prevOffset) * t,
    				color: targetVal.color
    			};

    			return val;
    		}
    	});

    	s.setPerc = (perc, startOffset) => {

    		let color = serie.color;

    		if(thresholds && thresholds.length >0 ) {
    			const thres = thresholds.find((colInfo, idx) => (perc <= colInfo.till || idx == thresholds.length - 1));

    			if(thres)
    				color = thres.color;
    		}

    		s.set({
    			prevOffset: startOffset,
    			offset: startOffset + perc,
    			color: color
    		});
    	};

    	return s;
    }
    function valueStore(initVal, forceContent) {

    	let valStore;

    	if(!forceContent) {

    		const valueStore = tweened(initVal, twOpts);

    		valStore = derived(
    			valueStore,
    			$valueStore => $valueStore.map(s => Math.round(s) + '%').join(' + ')
    		);

    		valStore.set = v => {
    			return valueStore.set(v);
    		};
    	}
    	else {
    		valStore = readable(forceContent);
    	}

    	return valStore;
    }

    /* node_modules/@okrad/svelte-progressbar/src/Arc.svelte generated by Svelte v3.20.1 */

    const file$7 = "node_modules/@okrad/svelte-progressbar/src/Arc.svelte";

    // (49:0) {:else}
    function create_else_block(ctx) {
    	let path;
    	let path_d_value;
    	let path_stroke_value;
    	let path_class_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", path_d_value = describeArc(50, 50, /*serie*/ ctx[1].radius, 0, 100));
    			attr_dev(path, "fill", "transparent");
    			attr_dev(path, "stroke", path_stroke_value = /*$store*/ ctx[3].color);
    			attr_dev(path, "stroke-width", /*thickness*/ ctx[0]);
    			attr_dev(path, "class", path_class_value = "pb-arc " + /*serie*/ ctx[1].cls);
    			add_location(path, file$7, 49, 1, 1276);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*serie*/ 2 && path_d_value !== (path_d_value = describeArc(50, 50, /*serie*/ ctx[1].radius, 0, 100))) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty & /*$store*/ 8 && path_stroke_value !== (path_stroke_value = /*$store*/ ctx[3].color)) {
    				attr_dev(path, "stroke", path_stroke_value);
    			}

    			if (dirty & /*thickness*/ 1) {
    				attr_dev(path, "stroke-width", /*thickness*/ ctx[0]);
    			}

    			if (dirty & /*serie*/ 2 && path_class_value !== (path_class_value = "pb-arc " + /*serie*/ ctx[1].cls)) {
    				attr_dev(path, "class", path_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(49:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (47:0) {#if !bg}
    function create_if_block(ctx) {
    	let path;
    	let path_d_value;
    	let path_stroke_value;
    	let path_class_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", path_d_value = describeArc(50, 50, /*serie*/ ctx[1].radius, /*$store*/ ctx[3].prevOffset, /*$store*/ ctx[3].offset));
    			attr_dev(path, "fill", "transparent");
    			attr_dev(path, "stroke", path_stroke_value = /*$store*/ ctx[3].color);
    			attr_dev(path, "stroke-width", /*thickness*/ ctx[0]);
    			attr_dev(path, "class", path_class_value = "pb-arc " + /*serie*/ ctx[1].cls);
    			add_location(path, file$7, 47, 1, 1088);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*serie, $store*/ 10 && path_d_value !== (path_d_value = describeArc(50, 50, /*serie*/ ctx[1].radius, /*$store*/ ctx[3].prevOffset, /*$store*/ ctx[3].offset))) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty & /*$store*/ 8 && path_stroke_value !== (path_stroke_value = /*$store*/ ctx[3].color)) {
    				attr_dev(path, "stroke", path_stroke_value);
    			}

    			if (dirty & /*thickness*/ 1) {
    				attr_dev(path, "stroke-width", /*thickness*/ ctx[0]);
    			}

    			if (dirty & /*serie*/ 2 && path_class_value !== (path_class_value = "pb-arc " + /*serie*/ ctx[1].cls)) {
    				attr_dev(path, "class", path_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(47:0) {#if !bg}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (!/*bg*/ ctx[2]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    	angleInDegrees = angleInDegrees % 360;
    	const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;

    	return {
    		x: centerX + radius * Math.cos(angleInRadians),
    		y: centerY + radius * Math.sin(angleInRadians)
    	};
    }

    function describeArc(x, y, radius, startPerc, endPerc) {
    	if (endPerc > 100) endPerc = 100;
    	const startAngle = startPerc / 100 * 360;
    	let endAngle = endPerc / 100 * 360;

    	//Avoid overlapping of start and end positions...
    	if (endAngle == 360) endAngle = 359.9999;

    	const start = polarToCartesian(x, y, radius, endAngle);
    	const end = polarToCartesian(x, y, radius, startAngle);
    	const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    	return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $store;
    	let { serie } = $$props;
    	let { thickness } = $$props;
    	let { bg = false } = $$props;
    	const store = serie.store;
    	validate_store(store, "store");
    	component_subscribe($$self, store, value => $$invalidate(3, $store = value));
    	if (!thickness) thickness = 2;
    	const writable_props = ["serie", "thickness", "bg"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Arc> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Arc", $$slots, []);

    	$$self.$set = $$props => {
    		if ("serie" in $$props) $$invalidate(1, serie = $$props.serie);
    		if ("thickness" in $$props) $$invalidate(0, thickness = $$props.thickness);
    		if ("bg" in $$props) $$invalidate(2, bg = $$props.bg);
    	};

    	$$self.$capture_state = () => ({
    		serie,
    		thickness,
    		bg,
    		store,
    		polarToCartesian,
    		describeArc,
    		$store
    	});

    	$$self.$inject_state = $$props => {
    		if ("serie" in $$props) $$invalidate(1, serie = $$props.serie);
    		if ("thickness" in $$props) $$invalidate(0, thickness = $$props.thickness);
    		if ("bg" in $$props) $$invalidate(2, bg = $$props.bg);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [thickness, serie, bg, $store, store];
    }

    class Arc extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { serie: 1, thickness: 0, bg: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Arc",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*serie*/ ctx[1] === undefined && !("serie" in props)) {
    			console.warn("<Arc> was created without expected prop 'serie'");
    		}

    		if (/*thickness*/ ctx[0] === undefined && !("thickness" in props)) {
    			console.warn("<Arc> was created without expected prop 'thickness'");
    		}
    	}

    	get serie() {
    		throw new Error("<Arc>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set serie(value) {
    		throw new Error("<Arc>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get thickness() {
    		throw new Error("<Arc>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set thickness(value) {
    		throw new Error("<Arc>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bg() {
    		throw new Error("<Arc>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bg(value) {
    		throw new Error("<Arc>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/@okrad/svelte-progressbar/src/RadialProgressBar.svelte generated by Svelte v3.20.1 */
    const file$8 = "node_modules/@okrad/svelte-progressbar/src/RadialProgressBar.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (57:1) {#if showProgressValue}
    function create_if_block_2(ctx) {
    	let defs;
    	let mask;
    	let circle;
    	let circle_r_value;
    	let current;

    	const arc = new Arc({
    			props: {
    				serie: /*maskSerie*/ ctx[9],
    				thickness: /*thickness*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			defs = svg_element("defs");
    			mask = svg_element("mask");
    			create_component(arc.$$.fragment);
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", "50");
    			attr_dev(circle, "cy", "50");
    			attr_dev(circle, "r", circle_r_value = 50 - /*thickness*/ ctx[4]);
    			attr_dev(circle, "fill", "#fff");
    			add_location(circle, file$8, 60, 4, 1855);
    			attr_dev(mask, "id", /*maskId*/ ctx[11]);
    			attr_dev(mask, "x", "0");
    			attr_dev(mask, "y", "0");
    			attr_dev(mask, "width", "100");
    			attr_dev(mask, "height", "100%");
    			add_location(mask, file$8, 58, 3, 1750);
    			add_location(defs, file$8, 57, 2, 1740);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, defs, anchor);
    			append_dev(defs, mask);
    			mount_component(arc, mask, null);
    			append_dev(mask, circle);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const arc_changes = {};
    			if (dirty & /*maskSerie*/ 512) arc_changes.serie = /*maskSerie*/ ctx[9];
    			if (dirty & /*thickness*/ 16) arc_changes.thickness = /*thickness*/ ctx[4];
    			arc.$set(arc_changes);

    			if (!current || dirty & /*thickness*/ 16 && circle_r_value !== (circle_r_value = 50 - /*thickness*/ ctx[4])) {
    				attr_dev(circle, "r", circle_r_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(arc.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(arc.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(defs);
    			destroy_component(arc);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(57:1) {#if showProgressValue}",
    		ctx
    	});

    	return block;
    }

    // (67:2) {#if addBackground}
    function create_if_block_1(ctx) {
    	let circle;
    	let circle_r_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", "50");
    			attr_dev(circle, "cy", "50");
    			attr_dev(circle, "r", circle_r_value = /*serie*/ ctx[15].radius);
    			attr_dev(circle, "fill", "transparent");
    			attr_dev(circle, "stroke-width", /*thickness*/ ctx[4]);
    			attr_dev(circle, "stroke", /*bgColor*/ ctx[7]);
    			add_location(circle, file$8, 67, 3, 1994);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*series*/ 8 && circle_r_value !== (circle_r_value = /*serie*/ ctx[15].radius)) {
    				attr_dev(circle, "r", circle_r_value);
    			}

    			if (dirty & /*thickness*/ 16) {
    				attr_dev(circle, "stroke-width", /*thickness*/ ctx[4]);
    			}

    			if (dirty & /*bgColor*/ 128) {
    				attr_dev(circle, "stroke", /*bgColor*/ ctx[7]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(67:2) {#if addBackground}",
    		ctx
    	});

    	return block;
    }

    // (66:1) {#each series as serie}
    function create_each_block$3(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*addBackground*/ ctx[6] && create_if_block_1(ctx);

    	const arc = new Arc({
    			props: {
    				serie: /*serie*/ ctx[15],
    				thickness: /*thickness*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			create_component(arc.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			mount_component(arc, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*addBackground*/ ctx[6]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const arc_changes = {};
    			if (dirty & /*series*/ 8) arc_changes.serie = /*serie*/ ctx[15];
    			if (dirty & /*thickness*/ 16) arc_changes.thickness = /*thickness*/ ctx[4];
    			arc.$set(arc_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(arc.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(arc.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			destroy_component(arc, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(66:1) {#each series as serie}",
    		ctx
    	});

    	return block;
    }

    // (72:1) {#if showProgressValue}
    function create_if_block$1(ctx) {
    	let text0;
    	let t0;
    	let text0_font_size_value;
    	let text1;
    	let t1;
    	let text1_mask_value;
    	let text1_font_size_value;

    	const block = {
    		c: function create() {
    			text0 = svg_element("text");
    			t0 = text(/*$valStore*/ ctx[10]);
    			text1 = svg_element("text");
    			t1 = text(/*$valStore*/ ctx[10]);
    			attr_dev(text0, "class", "progress-value progress-value-inverted svelte-16nt78z");
    			attr_dev(text0, "text-anchor", "middle");
    			attr_dev(text0, "dominant-baseline", "central");
    			attr_dev(text0, "x", "50%");
    			attr_dev(text0, "y", "50%");
    			attr_dev(text0, "font-size", text0_font_size_value = "" + (/*textSize*/ ctx[2] + "%"));
    			add_location(text0, file$8, 72, 2, 2178);
    			attr_dev(text1, "mask", text1_mask_value = "url(#" + /*maskId*/ ctx[11] + ")");
    			attr_dev(text1, "class", "progress-value");
    			attr_dev(text1, "text-anchor", "middle");
    			attr_dev(text1, "dominant-baseline", "central");
    			attr_dev(text1, "x", "50%");
    			attr_dev(text1, "y", "50%");
    			attr_dev(text1, "font-size", text1_font_size_value = "" + (/*textSize*/ ctx[2] + "%"));
    			add_location(text1, file$8, 73, 2, 2341);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text0, anchor);
    			append_dev(text0, t0);
    			insert_dev(target, text1, anchor);
    			append_dev(text1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$valStore*/ 1024) set_data_dev(t0, /*$valStore*/ ctx[10]);

    			if (dirty & /*textSize*/ 4 && text0_font_size_value !== (text0_font_size_value = "" + (/*textSize*/ ctx[2] + "%"))) {
    				attr_dev(text0, "font-size", text0_font_size_value);
    			}

    			if (dirty & /*$valStore*/ 1024) set_data_dev(t1, /*$valStore*/ ctx[10]);

    			if (dirty & /*textSize*/ 4 && text1_font_size_value !== (text1_font_size_value = "" + (/*textSize*/ ctx[2] + "%"))) {
    				attr_dev(text1, "font-size", text1_font_size_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text0);
    			if (detaching) detach_dev(text1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(72:1) {#if showProgressValue}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let svg;
    	let if_block0_anchor;
    	let each_1_anchor;
    	let svg_viewBox_value;
    	let current;
    	let if_block0 = /*showProgressValue*/ ctx[5] && create_if_block_2(ctx);
    	let each_value = /*series*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block1 = /*showProgressValue*/ ctx[5] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			if (if_block1) if_block1.c();
    			attr_dev(svg, "class", "progressbar progressbar-radial");
    			attr_dev(svg, "viewBox", svg_viewBox_value = "0 0 100 " + /*height*/ ctx[1]);
    			attr_dev(svg, "width", /*width*/ ctx[0]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$8, 55, 0, 1590);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			if (if_block0) if_block0.m(svg, null);
    			append_dev(svg, if_block0_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append_dev(svg, each_1_anchor);
    			if (if_block1) if_block1.m(svg, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showProgressValue*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(svg, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*series, thickness, bgColor, addBackground*/ 216) {
    				each_value = /*series*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(svg, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*showProgressValue*/ ctx[5]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(svg, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty & /*height*/ 2 && svg_viewBox_value !== (svg_viewBox_value = "0 0 100 " + /*height*/ ctx[1])) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (!current || dirty & /*width*/ 1) {
    				attr_dev(svg, "width", /*width*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $valStore,
    		$$unsubscribe_valStore = noop,
    		$$subscribe_valStore = () => ($$unsubscribe_valStore(), $$unsubscribe_valStore = subscribe(valStore, $$value => $$invalidate(10, $valStore = $$value)), valStore);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_valStore());
    	let { series = [] } = $$props;
    	let { thickness = 5 } = $$props;
    	let { width = null } = $$props;
    	let { height = null } = $$props;
    	let { textSize = null } = $$props;
    	let { showProgressValue = true } = $$props;
    	let { stackSeries = true } = $$props;
    	let { margin = 0 } = $$props;
    	let { addBackground = true } = $$props;
    	let { bgColor = "#e5e5e5" } = $$props;
    	let { valStore } = $$props;
    	validate_store(valStore, "valStore");
    	$$subscribe_valStore();
    	const ts = new Date().getTime();
    	const maskId = "tx_mask_" + ts + Math.floor(Math.random() * 999);

    	if (width == null) //Default width when not specified
    	width = 75;

    	if (height == null) //Default height when not specified
    	height = 100;

    	if (textSize == null) textSize = 150;

    	const maskSerie = {
    		radius: 50 - thickness / 2,
    		color: "#fff"
    	};

    	maskSerie.store = serieStore(maskSerie, []);

    	series.forEach((s, idx) => {
    		if (!stackSeries) s.radius = 50 - (idx + 1) * thickness - (idx > 0 ? margin : 0); else s.radius = 50 - thickness / 2;
    	});

    	const writable_props = [
    		"series",
    		"thickness",
    		"width",
    		"height",
    		"textSize",
    		"showProgressValue",
    		"stackSeries",
    		"margin",
    		"addBackground",
    		"bgColor",
    		"valStore"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<RadialProgressBar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("RadialProgressBar", $$slots, []);

    	$$self.$set = $$props => {
    		if ("series" in $$props) $$invalidate(3, series = $$props.series);
    		if ("thickness" in $$props) $$invalidate(4, thickness = $$props.thickness);
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("textSize" in $$props) $$invalidate(2, textSize = $$props.textSize);
    		if ("showProgressValue" in $$props) $$invalidate(5, showProgressValue = $$props.showProgressValue);
    		if ("stackSeries" in $$props) $$invalidate(12, stackSeries = $$props.stackSeries);
    		if ("margin" in $$props) $$invalidate(13, margin = $$props.margin);
    		if ("addBackground" in $$props) $$invalidate(6, addBackground = $$props.addBackground);
    		if ("bgColor" in $$props) $$invalidate(7, bgColor = $$props.bgColor);
    		if ("valStore" in $$props) $$subscribe_valStore($$invalidate(8, valStore = $$props.valStore));
    	};

    	$$self.$capture_state = () => ({
    		Arc,
    		serieStore,
    		series,
    		thickness,
    		width,
    		height,
    		textSize,
    		showProgressValue,
    		stackSeries,
    		margin,
    		addBackground,
    		bgColor,
    		valStore,
    		ts,
    		maskId,
    		maskSerie,
    		$valStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("series" in $$props) $$invalidate(3, series = $$props.series);
    		if ("thickness" in $$props) $$invalidate(4, thickness = $$props.thickness);
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("textSize" in $$props) $$invalidate(2, textSize = $$props.textSize);
    		if ("showProgressValue" in $$props) $$invalidate(5, showProgressValue = $$props.showProgressValue);
    		if ("stackSeries" in $$props) $$invalidate(12, stackSeries = $$props.stackSeries);
    		if ("margin" in $$props) $$invalidate(13, margin = $$props.margin);
    		if ("addBackground" in $$props) $$invalidate(6, addBackground = $$props.addBackground);
    		if ("bgColor" in $$props) $$invalidate(7, bgColor = $$props.bgColor);
    		if ("valStore" in $$props) $$subscribe_valStore($$invalidate(8, valStore = $$props.valStore));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*maskSerie, series*/ 520) {
    			 {
    				maskSerie.store.setPerc(series.reduce((a, s) => a + s.perc < 100 ? a + s.perc : 100, 0), 0);
    			}
    		}
    	};

    	return [
    		width,
    		height,
    		textSize,
    		series,
    		thickness,
    		showProgressValue,
    		addBackground,
    		bgColor,
    		valStore,
    		maskSerie,
    		$valStore,
    		maskId,
    		stackSeries,
    		margin
    	];
    }

    class RadialProgressBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			series: 3,
    			thickness: 4,
    			width: 0,
    			height: 1,
    			textSize: 2,
    			showProgressValue: 5,
    			stackSeries: 12,
    			margin: 13,
    			addBackground: 6,
    			bgColor: 7,
    			valStore: 8
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RadialProgressBar",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*valStore*/ ctx[8] === undefined && !("valStore" in props)) {
    			console.warn("<RadialProgressBar> was created without expected prop 'valStore'");
    		}
    	}

    	get series() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set series(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get thickness() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set thickness(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get textSize() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set textSize(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showProgressValue() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showProgressValue(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get stackSeries() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stackSeries(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get margin() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set margin(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addBackground() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addBackground(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valStore() {
    		throw new Error("<RadialProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valStore(value) {
    		throw new Error("<RadialProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/@okrad/svelte-progressbar/src/Stop.svelte generated by Svelte v3.20.1 */

    const file$9 = "node_modules/@okrad/svelte-progressbar/src/Stop.svelte";

    function create_fragment$9(ctx) {
    	let stop0;
    	let stop0_offset_value;
    	let stop0_stop_color_value;
    	let stop0_class_value;
    	let t;
    	let stop1;
    	let stop1_offset_value;
    	let stop1_stop_color_value;
    	let stop1_class_value;

    	const block = {
    		c: function create() {
    			stop0 = svg_element("stop");
    			t = space();
    			stop1 = svg_element("stop");
    			attr_dev(stop0, "offset", stop0_offset_value = "" + (Math.round(/*$store*/ ctx[2].prevOffset * 100 / /*$overallPerc*/ ctx[3]) + "%"));
    			attr_dev(stop0, "stop-color", stop0_stop_color_value = /*$store*/ ctx[2].color);
    			attr_dev(stop0, "class", stop0_class_value = /*serie*/ ctx[0].cls);
    			add_location(stop0, file$9, 7, 0, 93);
    			attr_dev(stop1, "offset", stop1_offset_value = "" + (Math.round(/*$store*/ ctx[2].offset * 100 / /*$overallPerc*/ ctx[3]) + "%"));
    			attr_dev(stop1, "stop-color", stop1_stop_color_value = /*$store*/ ctx[2].color);
    			attr_dev(stop1, "class", stop1_class_value = /*serie*/ ctx[0].cls);
    			add_location(stop1, file$9, 8, 0, 212);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, stop0, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, stop1, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$store, $overallPerc*/ 12 && stop0_offset_value !== (stop0_offset_value = "" + (Math.round(/*$store*/ ctx[2].prevOffset * 100 / /*$overallPerc*/ ctx[3]) + "%"))) {
    				attr_dev(stop0, "offset", stop0_offset_value);
    			}

    			if (dirty & /*$store*/ 4 && stop0_stop_color_value !== (stop0_stop_color_value = /*$store*/ ctx[2].color)) {
    				attr_dev(stop0, "stop-color", stop0_stop_color_value);
    			}

    			if (dirty & /*serie*/ 1 && stop0_class_value !== (stop0_class_value = /*serie*/ ctx[0].cls)) {
    				attr_dev(stop0, "class", stop0_class_value);
    			}

    			if (dirty & /*$store, $overallPerc*/ 12 && stop1_offset_value !== (stop1_offset_value = "" + (Math.round(/*$store*/ ctx[2].offset * 100 / /*$overallPerc*/ ctx[3]) + "%"))) {
    				attr_dev(stop1, "offset", stop1_offset_value);
    			}

    			if (dirty & /*$store*/ 4 && stop1_stop_color_value !== (stop1_stop_color_value = /*$store*/ ctx[2].color)) {
    				attr_dev(stop1, "stop-color", stop1_stop_color_value);
    			}

    			if (dirty & /*serie*/ 1 && stop1_class_value !== (stop1_class_value = /*serie*/ ctx[0].cls)) {
    				attr_dev(stop1, "class", stop1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(stop0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(stop1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $store;

    	let $overallPerc,
    		$$unsubscribe_overallPerc = noop,
    		$$subscribe_overallPerc = () => ($$unsubscribe_overallPerc(), $$unsubscribe_overallPerc = subscribe(overallPerc, $$value => $$invalidate(3, $overallPerc = $$value)), overallPerc);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_overallPerc());
    	let { serie } = $$props;
    	let { overallPerc } = $$props;
    	validate_store(overallPerc, "overallPerc");
    	$$subscribe_overallPerc();
    	const store = serie.store;
    	validate_store(store, "store");
    	component_subscribe($$self, store, value => $$invalidate(2, $store = value));
    	const writable_props = ["serie", "overallPerc"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Stop> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Stop", $$slots, []);

    	$$self.$set = $$props => {
    		if ("serie" in $$props) $$invalidate(0, serie = $$props.serie);
    		if ("overallPerc" in $$props) $$subscribe_overallPerc($$invalidate(1, overallPerc = $$props.overallPerc));
    	};

    	$$self.$capture_state = () => ({
    		serie,
    		overallPerc,
    		store,
    		$store,
    		$overallPerc
    	});

    	$$self.$inject_state = $$props => {
    		if ("serie" in $$props) $$invalidate(0, serie = $$props.serie);
    		if ("overallPerc" in $$props) $$subscribe_overallPerc($$invalidate(1, overallPerc = $$props.overallPerc));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [serie, overallPerc, $store, $overallPerc, store];
    }

    class Stop extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { serie: 0, overallPerc: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Stop",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*serie*/ ctx[0] === undefined && !("serie" in props)) {
    			console.warn("<Stop> was created without expected prop 'serie'");
    		}

    		if (/*overallPerc*/ ctx[1] === undefined && !("overallPerc" in props)) {
    			console.warn("<Stop> was created without expected prop 'overallPerc'");
    		}
    	}

    	get serie() {
    		throw new Error("<Stop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set serie(value) {
    		throw new Error("<Stop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get overallPerc() {
    		throw new Error("<Stop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set overallPerc(value) {
    		throw new Error("<Stop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/@okrad/svelte-progressbar/src/LinearProgressBar.svelte generated by Svelte v3.20.1 */
    const file$a = "node_modules/@okrad/svelte-progressbar/src/LinearProgressBar.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (84:3) {#each series as serie}
    function create_each_block$4(ctx) {
    	let current;

    	const stop = new Stop({
    			props: {
    				serie: /*serie*/ ctx[20],
    				overallPerc: /*overallPerc*/ ctx[17]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(stop.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(stop, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const stop_changes = {};
    			if (dirty & /*series*/ 32) stop_changes.serie = /*serie*/ ctx[20];
    			stop.$set(stop_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(stop.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(stop.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(stop, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(84:3) {#each series as serie}",
    		ctx
    	});

    	return block;
    }

    // (88:2) {#if style == 'default' && showProgressValue}
    function create_if_block_5(ctx) {
    	let mask;
    	let rect;
    	let rect_width_value;
    	let rect_x_value;

    	const block = {
    		c: function create() {
    			mask = svg_element("mask");
    			rect = svg_element("rect");
    			attr_dev(rect, "width", rect_width_value = "" + (100 - /*$overallPerc*/ ctx[13] + "%"));
    			attr_dev(rect, "height", "100%");
    			attr_dev(rect, "x", rect_x_value = "" + (/*$overallPerc*/ ctx[13] + "%"));
    			attr_dev(rect, "y", "0");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$a, 89, 4, 2792);
    			attr_dev(mask, "id", /*maskId*/ ctx[15]);
    			attr_dev(mask, "x", "0");
    			attr_dev(mask, "y", "0");
    			attr_dev(mask, "width", "100");
    			attr_dev(mask, "height", "100%");
    			add_location(mask, file$a, 88, 3, 2729);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, mask, anchor);
    			append_dev(mask, rect);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$overallPerc*/ 8192 && rect_width_value !== (rect_width_value = "" + (100 - /*$overallPerc*/ ctx[13] + "%"))) {
    				attr_dev(rect, "width", rect_width_value);
    			}

    			if (dirty & /*$overallPerc*/ 8192 && rect_x_value !== (rect_x_value = "" + (/*$overallPerc*/ ctx[13] + "%"))) {
    				attr_dev(rect, "x", rect_x_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(mask);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(88:2) {#if style == 'default' && showProgressValue}",
    		ctx
    	});

    	return block;
    }

    // (103:1) {:else}
    function create_else_block$1(ctx) {
    	let rect;
    	let rect_width_value;
    	let rect_fill_value;
    	let if_block1_anchor;
    	let if_block0 = /*addBackground*/ ctx[8] && create_if_block_4(ctx);
    	let if_block1 = /*showProgressValue*/ ctx[7] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			rect = svg_element("rect");
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(rect, "width", rect_width_value = "" + (/*$overallPerc*/ ctx[13] + "%"));
    			attr_dev(rect, "height", "100%");
    			attr_dev(rect, "rx", /*rx*/ ctx[0]);
    			attr_dev(rect, "ry", /*ry*/ ctx[1]);
    			attr_dev(rect, "y", "0");
    			attr_dev(rect, "fill", rect_fill_value = "url(#" + /*grId*/ ctx[16] + ")");
    			add_location(rect, file$a, 106, 2, 3424);
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, rect, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*addBackground*/ ctx[8]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(rect.parentNode, rect);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*$overallPerc*/ 8192 && rect_width_value !== (rect_width_value = "" + (/*$overallPerc*/ ctx[13] + "%"))) {
    				attr_dev(rect, "width", rect_width_value);
    			}

    			if (dirty & /*rx*/ 1) {
    				attr_dev(rect, "rx", /*rx*/ ctx[0]);
    			}

    			if (dirty & /*ry*/ 2) {
    				attr_dev(rect, "ry", /*ry*/ ctx[1]);
    			}

    			if (/*showProgressValue*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(rect);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(103:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (95:1) {#if style == 'thin'}
    function create_if_block$2(ctx) {
    	let rect;
    	let rect_width_value;
    	let rect_fill_value;
    	let if_block1_anchor;
    	let if_block0 = /*addBackground*/ ctx[8] && create_if_block_2$1(ctx);
    	let if_block1 = /*showProgressValue*/ ctx[7] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			rect = svg_element("rect");
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(rect, "width", rect_width_value = "" + (/*$overallPerc*/ ctx[13] + "%"));
    			attr_dev(rect, "height", "100%");
    			attr_dev(rect, "x", "0");
    			attr_dev(rect, "y", "0");
    			attr_dev(rect, "fill", rect_fill_value = "url(#" + /*grId*/ ctx[16] + ")");
    			add_location(rect, file$a, 98, 2, 3057);
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, rect, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*addBackground*/ ctx[8]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					if_block0.m(rect.parentNode, rect);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*$overallPerc*/ 8192 && rect_width_value !== (rect_width_value = "" + (/*$overallPerc*/ ctx[13] + "%"))) {
    				attr_dev(rect, "width", rect_width_value);
    			}

    			if (/*showProgressValue*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(rect);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(95:1) {#if style == 'thin'}",
    		ctx
    	});

    	return block;
    }

    // (104:2) {#if addBackground}
    function create_if_block_4(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100%");
    			attr_dev(rect, "rx", /*rx*/ ctx[0]);
    			attr_dev(rect, "ry", /*ry*/ ctx[1]);
    			attr_dev(rect, "y", "0");
    			attr_dev(rect, "fill", /*bgColor*/ ctx[9]);
    			attr_dev(rect, "class", "progress-bg svelte-12t2ek0");
    			add_location(rect, file$a, 104, 3, 3323);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rx*/ 1) {
    				attr_dev(rect, "rx", /*rx*/ ctx[0]);
    			}

    			if (dirty & /*ry*/ 2) {
    				attr_dev(rect, "ry", /*ry*/ ctx[1]);
    			}

    			if (dirty & /*bgColor*/ 512) {
    				attr_dev(rect, "fill", /*bgColor*/ ctx[9]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(104:2) {#if addBackground}",
    		ctx
    	});

    	return block;
    }

    // (108:2) {#if showProgressValue}
    function create_if_block_3(ctx) {
    	let text0;
    	let t0;
    	let text0_font_size_value;
    	let text1;
    	let t1;
    	let text1_mask_value;
    	let text1_font_size_value;

    	const block = {
    		c: function create() {
    			text0 = svg_element("text");
    			t0 = text(/*$valStore*/ ctx[14]);
    			text1 = svg_element("text");
    			t1 = text(/*$valStore*/ ctx[14]);
    			attr_dev(text0, "class", "progress-value progress-value-inverted svelte-12t2ek0");
    			attr_dev(text0, "text-anchor", "middle");
    			attr_dev(text0, "dominant-baseline", /*dominantBaseline*/ ctx[11]);
    			attr_dev(text0, "dy", /*dy*/ ctx[12]);
    			attr_dev(text0, "x", "50%");
    			attr_dev(text0, "y", "50%");
    			attr_dev(text0, "font-size", text0_font_size_value = "" + (/*textSize*/ ctx[4] + "%"));
    			add_location(text0, file$a, 108, 3, 3541);
    			attr_dev(text1, "mask", text1_mask_value = "url(#" + /*maskId*/ ctx[15] + ")");
    			attr_dev(text1, "class", "progress-value");
    			attr_dev(text1, "text-anchor", "middle");
    			attr_dev(text1, "dominant-baseline", /*dominantBaseline*/ ctx[11]);
    			attr_dev(text1, "dy", /*dy*/ ctx[12]);
    			attr_dev(text1, "x", "50%");
    			attr_dev(text1, "y", "50%");
    			attr_dev(text1, "font-size", text1_font_size_value = "" + (/*textSize*/ ctx[4] + "%"));
    			add_location(text1, file$a, 109, 3, 3721);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text0, anchor);
    			append_dev(text0, t0);
    			insert_dev(target, text1, anchor);
    			append_dev(text1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$valStore*/ 16384) set_data_dev(t0, /*$valStore*/ ctx[14]);

    			if (dirty & /*dominantBaseline*/ 2048) {
    				attr_dev(text0, "dominant-baseline", /*dominantBaseline*/ ctx[11]);
    			}

    			if (dirty & /*dy*/ 4096) {
    				attr_dev(text0, "dy", /*dy*/ ctx[12]);
    			}

    			if (dirty & /*textSize*/ 16 && text0_font_size_value !== (text0_font_size_value = "" + (/*textSize*/ ctx[4] + "%"))) {
    				attr_dev(text0, "font-size", text0_font_size_value);
    			}

    			if (dirty & /*$valStore*/ 16384) set_data_dev(t1, /*$valStore*/ ctx[14]);

    			if (dirty & /*dominantBaseline*/ 2048) {
    				attr_dev(text1, "dominant-baseline", /*dominantBaseline*/ ctx[11]);
    			}

    			if (dirty & /*dy*/ 4096) {
    				attr_dev(text1, "dy", /*dy*/ ctx[12]);
    			}

    			if (dirty & /*textSize*/ 16 && text1_font_size_value !== (text1_font_size_value = "" + (/*textSize*/ ctx[4] + "%"))) {
    				attr_dev(text1, "font-size", text1_font_size_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text0);
    			if (detaching) detach_dev(text1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(108:2) {#if showProgressValue}",
    		ctx
    	});

    	return block;
    }

    // (96:2) {#if addBackground}
    function create_if_block_2$1(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100%");
    			attr_dev(rect, "x", "0");
    			attr_dev(rect, "y", "0");
    			attr_dev(rect, "fill", /*bgColor*/ ctx[9]);
    			attr_dev(rect, "class", "progress-bg svelte-12t2ek0");
    			add_location(rect, file$a, 96, 3, 2960);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*bgColor*/ 512) {
    				attr_dev(rect, "fill", /*bgColor*/ ctx[9]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(96:2) {#if addBackground}",
    		ctx
    	});

    	return block;
    }

    // (100:2) {#if showProgressValue}
    function create_if_block_1$1(ctx) {
    	let text_1;
    	let t;
    	let text_1_font_size_value;

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(/*$valStore*/ ctx[14]);
    			attr_dev(text_1, "class", "progress-value");
    			attr_dev(text_1, "text-anchor", "middle");
    			attr_dev(text_1, "x", "50%");
    			attr_dev(text_1, "y", "-100%");
    			attr_dev(text_1, "font-size", text_1_font_size_value = "" + (/*textSize*/ ctx[4] + "%"));
    			add_location(text_1, file$a, 100, 3, 3170);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$valStore*/ 16384) set_data_dev(t, /*$valStore*/ ctx[14]);

    			if (dirty & /*textSize*/ 16 && text_1_font_size_value !== (text_1_font_size_value = "" + (/*textSize*/ ctx[4] + "%"))) {
    				attr_dev(text_1, "font-size", text_1_font_size_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(100:2) {#if showProgressValue}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let svg;
    	let defs;
    	let linearGradient;
    	let svg_class_value;
    	let svg_viewBox_value;
    	let current;
    	let each_value = /*series*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block0 = /*style*/ ctx[6] == "default" && /*showProgressValue*/ ctx[7] && create_if_block_5(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*style*/ ctx[6] == "thin") return create_if_block$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			linearGradient = svg_element("linearGradient");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (if_block0) if_block0.c();
    			if_block1.c();
    			attr_dev(linearGradient, "id", /*grId*/ ctx[16]);
    			add_location(linearGradient, file$a, 82, 2, 2557);
    			add_location(defs, file$a, 81, 1, 2548);
    			attr_dev(svg, "class", svg_class_value = "progressbar progressbar-" + /*style*/ ctx[6] + " svelte-12t2ek0");
    			attr_dev(svg, "viewBox", svg_viewBox_value = "0 0 100 " + /*height*/ ctx[3]);
    			attr_dev(svg, "width", /*width*/ ctx[2]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$a, 80, 0, 2423);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, defs);
    			append_dev(defs, linearGradient);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(linearGradient, null);
    			}

    			if (if_block0) if_block0.m(defs, null);
    			if_block1.m(svg, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*series, overallPerc*/ 131104) {
    				each_value = /*series*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(linearGradient, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*style*/ ctx[6] == "default" && /*showProgressValue*/ ctx[7]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(defs, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(svg, null);
    				}
    			}

    			if (!current || dirty & /*style*/ 64 && svg_class_value !== (svg_class_value = "progressbar progressbar-" + /*style*/ ctx[6] + " svelte-12t2ek0")) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (!current || dirty & /*height*/ 8 && svg_viewBox_value !== (svg_viewBox_value = "0 0 100 " + /*height*/ ctx[3])) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (!current || dirty & /*width*/ 4) {
    				attr_dev(svg, "width", /*width*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const minOverallPerc = 0.001;

    function instance$a($$self, $$props, $$invalidate) {
    	let $overallPerc;

    	let $valStore,
    		$$unsubscribe_valStore = noop,
    		$$subscribe_valStore = () => ($$unsubscribe_valStore(), $$unsubscribe_valStore = subscribe(valStore, $$value => $$invalidate(14, $valStore = $$value)), valStore);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_valStore());
    	let { series = [] } = $$props;
    	let { style = "default" } = $$props;
    	let { rx = 2 } = $$props;
    	let { ry = 2 } = $$props;
    	let { width = null } = $$props;
    	let { height = null } = $$props;
    	let { textSize = null } = $$props;
    	let { showProgressValue = true } = $$props;
    	let { addBackground = true } = $$props;
    	let { bgColor = null } = $$props;
    	let { valStore } = $$props;
    	validate_store(valStore, "valStore");
    	$$subscribe_valStore();
    	const ts = new Date().getTime();
    	const maskId = "tx_mask_" + ts + Math.floor(Math.random() * 999);
    	const grId = "pb_gradient_" + ts + Math.floor(Math.random() * 999);

    	if (width == null) {
    		//Default width when not specified
    		width = 150;
    	}

    	if (height == null) {
    		//Default height when not specified
    		height = style == "thin" ? 1 : 14;
    	}

    	if (textSize == null) textSize = style == "thin" ? 40 : 70;
    	let ypos = 0;

    	if (style == "thin") {
    		rx = 0.2;
    		ry = 0.2;
    		ypos = 100 - height;
    	}

    	//Start with a number slightly greater than 0 to avoid divisions by zero when computing stops
    	const overallPerc = tweened(minOverallPerc, { duration: 1000, easing: cubicOut });

    	validate_store(overallPerc, "overallPerc");
    	component_subscribe($$self, overallPerc, value => $$invalidate(13, $overallPerc = value));
    	let dominantBaseline = "";
    	let dy = "0";

    	if (window.navigator.userAgent.indexOf("Trident") > -1 || window.navigator.userAgent.indexOf("Edge") > -1) {
    		//Ugly workaround needed only in legacy mode to adjust the vertical positioning of the value
    		//in IE/Edge (that don't support dominant-baseline)...
    		dy = "-.4em";
    	} else {
    		dominantBaseline = "central";
    	}

    	const writable_props = [
    		"series",
    		"style",
    		"rx",
    		"ry",
    		"width",
    		"height",
    		"textSize",
    		"showProgressValue",
    		"addBackground",
    		"bgColor",
    		"valStore"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LinearProgressBar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("LinearProgressBar", $$slots, []);

    	$$self.$set = $$props => {
    		if ("series" in $$props) $$invalidate(5, series = $$props.series);
    		if ("style" in $$props) $$invalidate(6, style = $$props.style);
    		if ("rx" in $$props) $$invalidate(0, rx = $$props.rx);
    		if ("ry" in $$props) $$invalidate(1, ry = $$props.ry);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("textSize" in $$props) $$invalidate(4, textSize = $$props.textSize);
    		if ("showProgressValue" in $$props) $$invalidate(7, showProgressValue = $$props.showProgressValue);
    		if ("addBackground" in $$props) $$invalidate(8, addBackground = $$props.addBackground);
    		if ("bgColor" in $$props) $$invalidate(9, bgColor = $$props.bgColor);
    		if ("valStore" in $$props) $$subscribe_valStore($$invalidate(10, valStore = $$props.valStore));
    	};

    	$$self.$capture_state = () => ({
    		tweened,
    		cubicOut,
    		getContext,
    		Stop,
    		series,
    		style,
    		rx,
    		ry,
    		width,
    		height,
    		textSize,
    		showProgressValue,
    		addBackground,
    		bgColor,
    		valStore,
    		minOverallPerc,
    		ts,
    		maskId,
    		grId,
    		ypos,
    		overallPerc,
    		dominantBaseline,
    		dy,
    		$overallPerc,
    		$valStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("series" in $$props) $$invalidate(5, series = $$props.series);
    		if ("style" in $$props) $$invalidate(6, style = $$props.style);
    		if ("rx" in $$props) $$invalidate(0, rx = $$props.rx);
    		if ("ry" in $$props) $$invalidate(1, ry = $$props.ry);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("textSize" in $$props) $$invalidate(4, textSize = $$props.textSize);
    		if ("showProgressValue" in $$props) $$invalidate(7, showProgressValue = $$props.showProgressValue);
    		if ("addBackground" in $$props) $$invalidate(8, addBackground = $$props.addBackground);
    		if ("bgColor" in $$props) $$invalidate(9, bgColor = $$props.bgColor);
    		if ("valStore" in $$props) $$subscribe_valStore($$invalidate(10, valStore = $$props.valStore));
    		if ("ypos" in $$props) ypos = $$props.ypos;
    		if ("dominantBaseline" in $$props) $$invalidate(11, dominantBaseline = $$props.dominantBaseline);
    		if ("dy" in $$props) $$invalidate(12, dy = $$props.dy);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*series*/ 32) {
    			 {
    				overallPerc.set(series.reduce((a, s) => a + s.perc < 100 ? a + s.perc : 100, minOverallPerc));
    			}
    		}
    	};

    	return [
    		rx,
    		ry,
    		width,
    		height,
    		textSize,
    		series,
    		style,
    		showProgressValue,
    		addBackground,
    		bgColor,
    		valStore,
    		dominantBaseline,
    		dy,
    		$overallPerc,
    		$valStore,
    		maskId,
    		grId,
    		overallPerc
    	];
    }

    class LinearProgressBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			series: 5,
    			style: 6,
    			rx: 0,
    			ry: 1,
    			width: 2,
    			height: 3,
    			textSize: 4,
    			showProgressValue: 7,
    			addBackground: 8,
    			bgColor: 9,
    			valStore: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LinearProgressBar",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*valStore*/ ctx[10] === undefined && !("valStore" in props)) {
    			console.warn("<LinearProgressBar> was created without expected prop 'valStore'");
    		}
    	}

    	get series() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set series(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rx() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rx(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ry() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ry(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get textSize() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set textSize(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showProgressValue() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showProgressValue(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addBackground() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addBackground(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valStore() {
    		throw new Error("<LinearProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valStore(value) {
    		throw new Error("<LinearProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/@okrad/svelte-progressbar/src/ProgressBar.svelte generated by Svelte v3.20.1 */

    // (84:0) {:else}
    function create_else_block$2(ctx) {
    	let current;

    	const linearprogressbar = new LinearProgressBar({
    			props: {
    				valStore: /*valStore*/ ctx[11],
    				series: /*series*/ ctx[1],
    				style: /*style*/ ctx[2],
    				addBackground: /*addBackground*/ ctx[9],
    				bgColor: /*bgColor*/ ctx[10],
    				width: /*width*/ ctx[0],
    				height: /*height*/ ctx[5],
    				textSize: /*textSize*/ ctx[6],
    				showProgressValue: /*showProgressValue*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(linearprogressbar.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(linearprogressbar, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const linearprogressbar_changes = {};
    			if (dirty & /*series*/ 2) linearprogressbar_changes.series = /*series*/ ctx[1];
    			if (dirty & /*style*/ 4) linearprogressbar_changes.style = /*style*/ ctx[2];
    			if (dirty & /*addBackground*/ 512) linearprogressbar_changes.addBackground = /*addBackground*/ ctx[9];
    			if (dirty & /*bgColor*/ 1024) linearprogressbar_changes.bgColor = /*bgColor*/ ctx[10];
    			if (dirty & /*width*/ 1) linearprogressbar_changes.width = /*width*/ ctx[0];
    			if (dirty & /*height*/ 32) linearprogressbar_changes.height = /*height*/ ctx[5];
    			if (dirty & /*textSize*/ 64) linearprogressbar_changes.textSize = /*textSize*/ ctx[6];
    			if (dirty & /*showProgressValue*/ 8) linearprogressbar_changes.showProgressValue = /*showProgressValue*/ ctx[3];
    			linearprogressbar.$set(linearprogressbar_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linearprogressbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linearprogressbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(linearprogressbar, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(84:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (82:0) {#if style == 'radial'}
    function create_if_block$3(ctx) {
    	let current;

    	const radialprogressbar = new RadialProgressBar({
    			props: {
    				valStore: /*valStore*/ ctx[11],
    				series: /*series*/ ctx[1],
    				stackSeries: /*stackSeries*/ ctx[7],
    				addBackground: /*addBackground*/ ctx[9],
    				bgColor: /*bgColor*/ ctx[10],
    				margin: /*margin*/ ctx[8],
    				style: /*style*/ ctx[2],
    				thickness: /*thickness*/ ctx[4],
    				width: /*width*/ ctx[0],
    				height: /*height*/ ctx[5],
    				textSize: /*textSize*/ ctx[6],
    				showProgressValue: /*showProgressValue*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(radialprogressbar.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(radialprogressbar, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const radialprogressbar_changes = {};
    			if (dirty & /*series*/ 2) radialprogressbar_changes.series = /*series*/ ctx[1];
    			if (dirty & /*stackSeries*/ 128) radialprogressbar_changes.stackSeries = /*stackSeries*/ ctx[7];
    			if (dirty & /*addBackground*/ 512) radialprogressbar_changes.addBackground = /*addBackground*/ ctx[9];
    			if (dirty & /*bgColor*/ 1024) radialprogressbar_changes.bgColor = /*bgColor*/ ctx[10];
    			if (dirty & /*margin*/ 256) radialprogressbar_changes.margin = /*margin*/ ctx[8];
    			if (dirty & /*style*/ 4) radialprogressbar_changes.style = /*style*/ ctx[2];
    			if (dirty & /*thickness*/ 16) radialprogressbar_changes.thickness = /*thickness*/ ctx[4];
    			if (dirty & /*width*/ 1) radialprogressbar_changes.width = /*width*/ ctx[0];
    			if (dirty & /*height*/ 32) radialprogressbar_changes.height = /*height*/ ctx[5];
    			if (dirty & /*textSize*/ 64) radialprogressbar_changes.textSize = /*textSize*/ ctx[6];
    			if (dirty & /*showProgressValue*/ 8) radialprogressbar_changes.showProgressValue = /*showProgressValue*/ ctx[3];
    			radialprogressbar.$set(radialprogressbar_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(radialprogressbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(radialprogressbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(radialprogressbar, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(82:0) {#if style == 'radial'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$3, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*style*/ ctx[2] == "radial") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $valStore;
    	let { style = "default" } = $$props; // [thin, radial]
    	let { showProgressValue = true } = $$props;
    	let { width = null } = $$props;
    	let { thickness = null } = $$props;
    	let { height = null } = $$props;
    	let { textSize = null } = $$props;
    	let { forceContent = null } = $$props;
    	let { stackSeries = true } = $$props;
    	let { margin = 0 } = $$props;
    	let { addBackground = true } = $$props;
    	let { bgColor = "#e5e5e5" } = $$props;
    	if (width == "auto") width = "100%";
    	let { thresholds = [] } = $$props;

    	if (thresholds.length > 0) {
    		//Sort thresholds to ensure proper comparison
    		thresholds.sort((t1, t2) => t1.threshold - t2.threshold);
    	}

    	let { colors = [] } = $$props;

    	if (colors.length == 0) {
    		colors = ["#FFC107", "#4CAF50", "#03A9F4"];
    	}

    	let { series = [] } = $$props;
    	if (!Array.isArray(series)) series = [series];

    	series = series.map((s, idx) => {
    		if (typeof s != "object") s = { perc: s };

    		if (!s.color) {
    			if (thresholds.length > 0 && thresholds[0].color) {
    				s.color = thresholds[0].color;
    			} else if (colors) {
    				s.color = colors[idx % colors.length];
    			}
    		}

    		s.store = serieStore(s, thresholds);
    		return s;
    	});

    	const valStore = valueStore(Array(series.length).fill(0), forceContent);
    	validate_store(valStore, "valStore");
    	component_subscribe($$self, valStore, value => $$invalidate(16, $valStore = value));

    	function updatePerc(perc, seriesIdx = 0) {
    		$$invalidate(1, series[seriesIdx].perc = perc, series);
    	}

    	const writable_props = [
    		"style",
    		"showProgressValue",
    		"width",
    		"thickness",
    		"height",
    		"textSize",
    		"forceContent",
    		"stackSeries",
    		"margin",
    		"addBackground",
    		"bgColor",
    		"thresholds",
    		"colors",
    		"series"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProgressBar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ProgressBar", $$slots, []);

    	$$self.$set = $$props => {
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("showProgressValue" in $$props) $$invalidate(3, showProgressValue = $$props.showProgressValue);
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("thickness" in $$props) $$invalidate(4, thickness = $$props.thickness);
    		if ("height" in $$props) $$invalidate(5, height = $$props.height);
    		if ("textSize" in $$props) $$invalidate(6, textSize = $$props.textSize);
    		if ("forceContent" in $$props) $$invalidate(13, forceContent = $$props.forceContent);
    		if ("stackSeries" in $$props) $$invalidate(7, stackSeries = $$props.stackSeries);
    		if ("margin" in $$props) $$invalidate(8, margin = $$props.margin);
    		if ("addBackground" in $$props) $$invalidate(9, addBackground = $$props.addBackground);
    		if ("bgColor" in $$props) $$invalidate(10, bgColor = $$props.bgColor);
    		if ("thresholds" in $$props) $$invalidate(14, thresholds = $$props.thresholds);
    		if ("colors" in $$props) $$invalidate(12, colors = $$props.colors);
    		if ("series" in $$props) $$invalidate(1, series = $$props.series);
    	};

    	$$self.$capture_state = () => ({
    		serieStore,
    		valueStore,
    		RadialProgressBar,
    		LinearProgressBar,
    		style,
    		showProgressValue,
    		width,
    		thickness,
    		height,
    		textSize,
    		forceContent,
    		stackSeries,
    		margin,
    		addBackground,
    		bgColor,
    		thresholds,
    		colors,
    		series,
    		valStore,
    		updatePerc,
    		$valStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("showProgressValue" in $$props) $$invalidate(3, showProgressValue = $$props.showProgressValue);
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("thickness" in $$props) $$invalidate(4, thickness = $$props.thickness);
    		if ("height" in $$props) $$invalidate(5, height = $$props.height);
    		if ("textSize" in $$props) $$invalidate(6, textSize = $$props.textSize);
    		if ("forceContent" in $$props) $$invalidate(13, forceContent = $$props.forceContent);
    		if ("stackSeries" in $$props) $$invalidate(7, stackSeries = $$props.stackSeries);
    		if ("margin" in $$props) $$invalidate(8, margin = $$props.margin);
    		if ("addBackground" in $$props) $$invalidate(9, addBackground = $$props.addBackground);
    		if ("bgColor" in $$props) $$invalidate(10, bgColor = $$props.bgColor);
    		if ("thresholds" in $$props) $$invalidate(14, thresholds = $$props.thresholds);
    		if ("colors" in $$props) $$invalidate(12, colors = $$props.colors);
    		if ("series" in $$props) $$invalidate(1, series = $$props.series);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*series, stackSeries*/ 130) {
    			 {
    				set_store_value(valStore, $valStore = series.map(s => s.perc));
    				let startOffset = 0;

    				series.forEach((s, idx) => {
    					s.store.setPerc(s.perc, startOffset);
    					if (stackSeries) startOffset += s.perc;
    				});
    			}
    		}
    	};

    	return [
    		width,
    		series,
    		style,
    		showProgressValue,
    		thickness,
    		height,
    		textSize,
    		stackSeries,
    		margin,
    		addBackground,
    		bgColor,
    		valStore,
    		colors,
    		forceContent,
    		thresholds,
    		updatePerc
    	];
    }

    class ProgressBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			style: 2,
    			showProgressValue: 3,
    			width: 0,
    			thickness: 4,
    			height: 5,
    			textSize: 6,
    			forceContent: 13,
    			stackSeries: 7,
    			margin: 8,
    			addBackground: 9,
    			bgColor: 10,
    			thresholds: 14,
    			colors: 12,
    			series: 1,
    			updatePerc: 15
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProgressBar",
    			options,
    			id: create_fragment$b.name
    		});
    	}

    	get style() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showProgressValue() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showProgressValue(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get thickness() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set thickness(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get textSize() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set textSize(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get forceContent() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set forceContent(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get stackSeries() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stackSeries(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get margin() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set margin(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addBackground() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addBackground(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get thresholds() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set thresholds(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colors() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colors(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get series() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set series(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get updatePerc() {
    		return this.$$.ctx[15];
    	}

    	set updatePerc(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Skills/Skills.svelte generated by Svelte v3.20.1 */
    const file$b = "src/Components/Skills/Skills.svelte";

    function create_fragment$c(ctx) {
    	let section;
    	let div4;
    	let div3;
    	let div2;
    	let div0;
    	let p;
    	let t0;
    	let span;
    	let t1;
    	let h2;
    	let t3;
    	let div1;
    	let t4;
    	let t5;
    	let t6;
    	let iframe;
    	let iframe_title_value;
    	let iframe_src_value;
    	let current;

    	const progressbar0 = new ProgressBar({
    			props: {
    				class: "text-gray-700 text-center bg-gray-400 px-4 py-2 m-2 mx-5",
    				series: 34,
    				color: "red"
    			},
    			$$inline: true
    		});

    	const progressbar1 = new ProgressBar({
    			props: {
    				class: "text-gray-700 text-center bg-gray-400 px-4 py-2 m-2",
    				series: 54
    			},
    			$$inline: true
    		});

    	const progressbar2 = new ProgressBar({
    			props: {
    				class: "text-gray-700 text-center bg-gray-400 px-4 py-2 m-2",
    				series: 32
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			section = element("section");
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			p = element("p");
    			t0 = text("My Skills\n            ");
    			span = element("span");
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "My Skills";
    			t3 = space();
    			div1 = element("div");
    			create_component(progressbar0.$$.fragment);
    			t4 = space();
    			create_component(progressbar1.$$.fragment);
    			t5 = space();
    			create_component(progressbar2.$$.fragment);
    			t6 = space();
    			iframe = element("iframe");
    			add_location(span, file$b, 13, 12, 297);
    			attr_dev(p, "class", "top_text");
    			add_location(p, file$b, 11, 10, 242);
    			add_location(h2, file$b, 15, 10, 331);
    			attr_dev(div0, "class", "main_title");
    			add_location(div0, file$b, 10, 8, 207);
    			attr_dev(iframe, "title", iframe_title_value = "Covid19");
    			if (iframe.src !== (iframe_src_value = "http://covid19kashmoard.us-west-2.elasticbeanstalk.com/")) attr_dev(iframe, "src", iframe_src_value);
    			add_location(iframe, file$b, 29, 10, 809);
    			attr_dev(div1, "class", "flex flex-row");
    			add_location(div1, file$b, 17, 8, 373);
    			attr_dev(div2, "class", "col-lg-12");
    			add_location(div2, file$b, 9, 6, 175);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$b, 8, 4, 151);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file$b, 7, 2, 123);
    			add_location(section, file$b, 6, 0, 111);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, p);
    			append_dev(p, t0);
    			append_dev(p, span);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			mount_component(progressbar0, div1, null);
    			append_dev(div1, t4);
    			mount_component(progressbar1, div1, null);
    			append_dev(div1, t5);
    			mount_component(progressbar2, div1, null);
    			append_dev(div1, t6);
    			append_dev(div1, iframe);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(progressbar0.$$.fragment, local);
    			transition_in(progressbar1.$$.fragment, local);
    			transition_in(progressbar2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(progressbar0.$$.fragment, local);
    			transition_out(progressbar1.$$.fragment, local);
    			transition_out(progressbar2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(progressbar0);
    			destroy_component(progressbar1);
    			destroy_component(progressbar2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Skills> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Skills", $$slots, []);
    	$$self.$capture_state = () => ({ ProgressBar });
    	return [];
    }

    class Skills extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skills",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/Components/Porfolio/Porfolio.svelte generated by Svelte v3.20.1 */

    const file$c = "src/Components/Porfolio/Porfolio.svelte";

    function create_fragment$d(ctx) {
    	let section;
    	let div31;
    	let div2;
    	let div1;
    	let div0;
    	let p0;
    	let t0;
    	let span;
    	let t1;
    	let h2;
    	let t2;
    	let br;
    	let t3;
    	let t4;
    	let div3;
    	let ul;
    	let li0;
    	let t6;
    	let li1;
    	let t8;
    	let li2;
    	let t10;
    	let li3;
    	let t12;
    	let li4;
    	let t14;
    	let div30;
    	let div29;
    	let div4;
    	let t15;
    	let div8;
    	let div7;
    	let img0;
    	let img0_src_value;
    	let t16;
    	let div5;
    	let t17;
    	let div6;
    	let h40;
    	let a0;
    	let t19;
    	let p1;
    	let t21;
    	let div12;
    	let div11;
    	let img1;
    	let img1_src_value;
    	let t22;
    	let div9;
    	let t23;
    	let div10;
    	let h41;
    	let a1;
    	let t25;
    	let p2;
    	let t27;
    	let div16;
    	let div15;
    	let img2;
    	let img2_src_value;
    	let t28;
    	let div13;
    	let t29;
    	let div14;
    	let h42;
    	let a2;
    	let t31;
    	let p3;
    	let t33;
    	let div20;
    	let div19;
    	let img3;
    	let img3_src_value;
    	let t34;
    	let div17;
    	let t35;
    	let div18;
    	let h43;
    	let a3;
    	let t37;
    	let p4;
    	let t39;
    	let div24;
    	let div23;
    	let img4;
    	let img4_src_value;
    	let t40;
    	let div21;
    	let t41;
    	let div22;
    	let h44;
    	let a4;
    	let t43;
    	let p5;
    	let t45;
    	let div28;
    	let div27;
    	let img5;
    	let img5_src_value;
    	let t46;
    	let div25;
    	let t47;
    	let div26;
    	let h45;
    	let a5;
    	let t49;
    	let p6;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div31 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("Our Portfolio\n            ");
    			span = element("span");
    			t1 = space();
    			h2 = element("h2");
    			t2 = text("Check Our Recent\n            ");
    			br = element("br");
    			t3 = text("\n            Client Work");
    			t4 = space();
    			div3 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "all";
    			t6 = space();
    			li1 = element("li");
    			li1.textContent = "popular";
    			t8 = space();
    			li2 = element("li");
    			li2.textContent = "latest";
    			t10 = space();
    			li3 = element("li");
    			li3.textContent = "following";
    			t12 = space();
    			li4 = element("li");
    			li4.textContent = "upcoming";
    			t14 = space();
    			div30 = element("div");
    			div29 = element("div");
    			div4 = element("div");
    			t15 = space();
    			div8 = element("div");
    			div7 = element("div");
    			img0 = element("img");
    			t16 = space();
    			div5 = element("div");
    			t17 = space();
    			div6 = element("div");
    			h40 = element("h4");
    			a0 = element("a");
    			a0.textContent = "Lens Mockup Design";
    			t19 = space();
    			p1 = element("p");
    			p1.textContent = "Art, Illustration";
    			t21 = space();
    			div12 = element("div");
    			div11 = element("div");
    			img1 = element("img");
    			t22 = space();
    			div9 = element("div");
    			t23 = space();
    			div10 = element("div");
    			h41 = element("h4");
    			a1 = element("a");
    			a1.textContent = "Lens Mockup Design";
    			t25 = space();
    			p2 = element("p");
    			p2.textContent = "Art, Illustration";
    			t27 = space();
    			div16 = element("div");
    			div15 = element("div");
    			img2 = element("img");
    			t28 = space();
    			div13 = element("div");
    			t29 = space();
    			div14 = element("div");
    			h42 = element("h4");
    			a2 = element("a");
    			a2.textContent = "Lens Mockup Design";
    			t31 = space();
    			p3 = element("p");
    			p3.textContent = "Art, Illustration";
    			t33 = space();
    			div20 = element("div");
    			div19 = element("div");
    			img3 = element("img");
    			t34 = space();
    			div17 = element("div");
    			t35 = space();
    			div18 = element("div");
    			h43 = element("h4");
    			a3 = element("a");
    			a3.textContent = "Lens Mockup Design";
    			t37 = space();
    			p4 = element("p");
    			p4.textContent = "Art, Illustration";
    			t39 = space();
    			div24 = element("div");
    			div23 = element("div");
    			img4 = element("img");
    			t40 = space();
    			div21 = element("div");
    			t41 = space();
    			div22 = element("div");
    			h44 = element("h4");
    			a4 = element("a");
    			a4.textContent = "Lens Mockup Design";
    			t43 = space();
    			p5 = element("p");
    			p5.textContent = "Art, Illustration";
    			t45 = space();
    			div28 = element("div");
    			div27 = element("div");
    			img5 = element("img");
    			t46 = space();
    			div25 = element("div");
    			t47 = space();
    			div26 = element("div");
    			h45 = element("h4");
    			a5 = element("a");
    			a5.textContent = "Lens Mockup Design";
    			t49 = space();
    			p6 = element("p");
    			p6.textContent = "Art, Illustration";
    			add_location(span, file$c, 7, 12, 228);
    			attr_dev(p0, "class", "top_text");
    			add_location(p0, file$c, 5, 10, 169);
    			add_location(br, file$c, 11, 12, 308);
    			add_location(h2, file$c, 9, 10, 262);
    			attr_dev(div0, "class", "main_title");
    			add_location(div0, file$c, 4, 8, 134);
    			attr_dev(div1, "class", "col-lg-12");
    			add_location(div1, file$c, 3, 6, 102);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$c, 2, 4, 78);
    			attr_dev(li0, "class", "active");
    			attr_dev(li0, "data-filter", "*");
    			add_location(li0, file$c, 20, 8, 457);
    			attr_dev(li1, "data-filter", ".popular");
    			add_location(li1, file$c, 21, 8, 509);
    			attr_dev(li2, "data-filter", ".latest");
    			add_location(li2, file$c, 22, 8, 557);
    			attr_dev(li3, "data-filter", ".following");
    			add_location(li3, file$c, 23, 8, 603);
    			attr_dev(li4, "data-filter", ".upcoming");
    			add_location(li4, file$c, 24, 8, 655);
    			add_location(ul, file$c, 19, 6, 444);
    			attr_dev(div3, "class", "filters portfolio-filter");
    			add_location(div3, file$c, 18, 4, 399);
    			attr_dev(div4, "class", "grid-sizer col-md-3 col-lg-3");
    			add_location(div4, file$c, 30, 8, 802);
    			attr_dev(img0, "class", "img-fluid w-100");
    			if (img0.src !== (img0_src_value = "img/portfolio/p1.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$c, 33, 12, 954);
    			attr_dev(div5, "class", "overlay");
    			add_location(div5, file$c, 34, 12, 1032);
    			attr_dev(a0, "href", "portfolio-details.html");
    			add_location(a0, file$c, 37, 16, 1128);
    			add_location(h40, file$c, 36, 14, 1107);
    			add_location(p1, file$c, 39, 14, 1218);
    			attr_dev(div6, "class", "short_info");
    			add_location(div6, file$c, 35, 12, 1068);
    			attr_dev(div7, "class", "single_portfolio");
    			add_location(div7, file$c, 32, 10, 911);
    			attr_dev(div8, "class", "col-lg-6 col-md-6 all following");
    			add_location(div8, file$c, 31, 8, 855);
    			attr_dev(img1, "class", "img-fluid w-100");
    			if (img1.src !== (img1_src_value = "img/portfolio/p4.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$c, 46, 12, 1416);
    			attr_dev(div9, "class", "overlay");
    			add_location(div9, file$c, 47, 12, 1494);
    			attr_dev(a1, "href", "portfolio-details.html");
    			add_location(a1, file$c, 50, 16, 1590);
    			add_location(h41, file$c, 49, 14, 1569);
    			add_location(p2, file$c, 52, 14, 1680);
    			attr_dev(div10, "class", "short_info");
    			add_location(div10, file$c, 48, 12, 1530);
    			attr_dev(div11, "class", "single_portfolio");
    			add_location(div11, file$c, 45, 10, 1373);
    			attr_dev(div12, "class", "col-lg-6 col-md-6 all latest popular upcoming");
    			add_location(div12, file$c, 44, 8, 1303);
    			attr_dev(img2, "class", "img-fluid w-100");
    			if (img2.src !== (img2_src_value = "img/portfolio/p2.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$c, 59, 12, 1871);
    			attr_dev(div13, "class", "overlay");
    			add_location(div13, file$c, 60, 12, 1949);
    			attr_dev(a2, "href", "portfolio-details.html");
    			add_location(a2, file$c, 63, 16, 2045);
    			add_location(h42, file$c, 62, 14, 2024);
    			add_location(p3, file$c, 65, 14, 2135);
    			attr_dev(div14, "class", "short_info");
    			add_location(div14, file$c, 61, 12, 1985);
    			attr_dev(div15, "class", "single_portfolio");
    			add_location(div15, file$c, 58, 10, 1828);
    			attr_dev(div16, "class", "col-lg-3 col-md-6 all latest following");
    			add_location(div16, file$c, 57, 8, 1765);
    			attr_dev(img3, "class", "img-fluid w-100");
    			if (img3.src !== (img3_src_value = "img/portfolio/p3.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$c, 72, 12, 2325);
    			attr_dev(div17, "class", "overlay");
    			add_location(div17, file$c, 73, 12, 2403);
    			attr_dev(a3, "href", "portfolio-details.html");
    			add_location(a3, file$c, 76, 16, 2499);
    			add_location(h43, file$c, 75, 14, 2478);
    			add_location(p4, file$c, 78, 14, 2589);
    			attr_dev(div18, "class", "short_info");
    			add_location(div18, file$c, 74, 12, 2439);
    			attr_dev(div19, "class", "single_portfolio");
    			add_location(div19, file$c, 71, 10, 2282);
    			attr_dev(div20, "class", "col-lg-3 col-md-6 all latest upcoming");
    			add_location(div20, file$c, 70, 8, 2220);
    			attr_dev(img4, "class", "img-fluid w-100");
    			if (img4.src !== (img4_src_value = "img/portfolio/p6.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$c, 85, 12, 2771);
    			attr_dev(div21, "class", "overlay");
    			add_location(div21, file$c, 86, 12, 2849);
    			attr_dev(a4, "href", "portfolio-details.html");
    			add_location(a4, file$c, 89, 16, 2945);
    			add_location(h44, file$c, 88, 14, 2924);
    			add_location(p5, file$c, 91, 14, 3035);
    			attr_dev(div22, "class", "short_info");
    			add_location(div22, file$c, 87, 12, 2885);
    			attr_dev(div23, "class", "single_portfolio");
    			add_location(div23, file$c, 84, 10, 2728);
    			attr_dev(div24, "class", "col-lg-6 col-md-6 all popular");
    			add_location(div24, file$c, 83, 8, 2674);
    			attr_dev(img5, "class", "img-fluid w-100");
    			if (img5.src !== (img5_src_value = "img/portfolio/p5.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$c, 98, 12, 3234);
    			attr_dev(div25, "class", "overlay");
    			add_location(div25, file$c, 99, 12, 3312);
    			attr_dev(a5, "href", "portfolio-details.html");
    			add_location(a5, file$c, 102, 16, 3408);
    			add_location(h45, file$c, 101, 14, 3387);
    			add_location(p6, file$c, 104, 14, 3498);
    			attr_dev(div26, "class", "short_info");
    			add_location(div26, file$c, 100, 12, 3348);
    			attr_dev(div27, "class", "single_portfolio");
    			add_location(div27, file$c, 97, 10, 3191);
    			attr_dev(div28, "class", "col-lg-6 col-md-6 all popular latest following");
    			add_location(div28, file$c, 96, 8, 3120);
    			attr_dev(div29, "class", "row portfolio-grid");
    			add_location(div29, file$c, 29, 6, 761);
    			attr_dev(div30, "class", "filters-content");
    			add_location(div30, file$c, 28, 4, 725);
    			attr_dev(div31, "class", "container");
    			add_location(div31, file$c, 1, 2, 50);
    			attr_dev(section, "class", "portfolio_area");
    			attr_dev(section, "id", "portfolio");
    			add_location(section, file$c, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div31);
    			append_dev(div31, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(p0, span);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(h2, t2);
    			append_dev(h2, br);
    			append_dev(h2, t3);
    			append_dev(div31, t4);
    			append_dev(div31, div3);
    			append_dev(div3, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t6);
    			append_dev(ul, li1);
    			append_dev(ul, t8);
    			append_dev(ul, li2);
    			append_dev(ul, t10);
    			append_dev(ul, li3);
    			append_dev(ul, t12);
    			append_dev(ul, li4);
    			append_dev(div31, t14);
    			append_dev(div31, div30);
    			append_dev(div30, div29);
    			append_dev(div29, div4);
    			append_dev(div29, t15);
    			append_dev(div29, div8);
    			append_dev(div8, div7);
    			append_dev(div7, img0);
    			append_dev(div7, t16);
    			append_dev(div7, div5);
    			append_dev(div7, t17);
    			append_dev(div7, div6);
    			append_dev(div6, h40);
    			append_dev(h40, a0);
    			append_dev(div6, t19);
    			append_dev(div6, p1);
    			append_dev(div29, t21);
    			append_dev(div29, div12);
    			append_dev(div12, div11);
    			append_dev(div11, img1);
    			append_dev(div11, t22);
    			append_dev(div11, div9);
    			append_dev(div11, t23);
    			append_dev(div11, div10);
    			append_dev(div10, h41);
    			append_dev(h41, a1);
    			append_dev(div10, t25);
    			append_dev(div10, p2);
    			append_dev(div29, t27);
    			append_dev(div29, div16);
    			append_dev(div16, div15);
    			append_dev(div15, img2);
    			append_dev(div15, t28);
    			append_dev(div15, div13);
    			append_dev(div15, t29);
    			append_dev(div15, div14);
    			append_dev(div14, h42);
    			append_dev(h42, a2);
    			append_dev(div14, t31);
    			append_dev(div14, p3);
    			append_dev(div29, t33);
    			append_dev(div29, div20);
    			append_dev(div20, div19);
    			append_dev(div19, img3);
    			append_dev(div19, t34);
    			append_dev(div19, div17);
    			append_dev(div19, t35);
    			append_dev(div19, div18);
    			append_dev(div18, h43);
    			append_dev(h43, a3);
    			append_dev(div18, t37);
    			append_dev(div18, p4);
    			append_dev(div29, t39);
    			append_dev(div29, div24);
    			append_dev(div24, div23);
    			append_dev(div23, img4);
    			append_dev(div23, t40);
    			append_dev(div23, div21);
    			append_dev(div23, t41);
    			append_dev(div23, div22);
    			append_dev(div22, h44);
    			append_dev(h44, a4);
    			append_dev(div22, t43);
    			append_dev(div22, p5);
    			append_dev(div29, t45);
    			append_dev(div29, div28);
    			append_dev(div28, div27);
    			append_dev(div27, img5);
    			append_dev(div27, t46);
    			append_dev(div27, div25);
    			append_dev(div27, t47);
    			append_dev(div27, div26);
    			append_dev(div26, h45);
    			append_dev(h45, a5);
    			append_dev(div26, t49);
    			append_dev(div26, p6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Porfolio> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Porfolio", $$slots, []);
    	return [];
    }

    class Porfolio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Porfolio",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/Components/Contact/Contact.svelte generated by Svelte v3.20.1 */

    const file$d = "src/Components/Contact/Contact.svelte";

    function create_fragment$e(ctx) {
    	let section;
    	let div24;
    	let div2;
    	let div1;
    	let div0;
    	let p0;
    	let t0;
    	let span0;
    	let t1;
    	let h20;
    	let t3;
    	let div3;
    	let script0;
    	let t5;
    	let script1;
    	let script1_src_value;
    	let t6;
    	let div23;
    	let div4;
    	let h21;
    	let t8;
    	let div15;
    	let form;
    	let div13;
    	let div6;
    	let div5;
    	let textarea;
    	let t9;
    	let div8;
    	let div7;
    	let input0;
    	let t10;
    	let div10;
    	let div9;
    	let input1;
    	let t11;
    	let div12;
    	let div11;
    	let input2;
    	let t12;
    	let div14;
    	let button;
    	let t14;
    	let div22;
    	let div17;
    	let span1;
    	let i0;
    	let t15;
    	let div16;
    	let h30;
    	let t17;
    	let p1;
    	let t19;
    	let div19;
    	let span2;
    	let i1;
    	let t20;
    	let div18;
    	let h31;
    	let a0;
    	let t22;
    	let p2;
    	let t24;
    	let div21;
    	let span3;
    	let i2;
    	let t25;
    	let div20;
    	let h32;
    	let a1;
    	let t27;
    	let p3;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div24 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("Contact Us\n            ");
    			span0 = element("span");
    			t1 = space();
    			h20 = element("h2");
    			h20.textContent = "Send me a message";
    			t3 = space();
    			div3 = element("div");
    			script0 = element("script");
    			script0.textContent = "function initMap() {\n          var uluru = { lat: -25.363, lng: 131.044 };\n          var grayStyles = [\n            {\n              featureType: \"all\",\n              stylers: [{ saturation: -90 }, { lightness: 50 }]\n            },\n            { elementType: \"labels.text.fill\", stylers: [{ color: \"#A3A3A3\" }] }\n          ];\n          var map = new google.maps.Map(document.getElementById(\"map\"), {\n            center: { lat: -31.197, lng: 150.744 },\n            zoom: 9,\n            styles: grayStyles,\n            scrollwheel: false\n          });\n        }";
    			t5 = space();
    			script1 = element("script");
    			t6 = space();
    			div23 = element("div");
    			div4 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Get in Touch";
    			t8 = space();
    			div15 = element("div");
    			form = element("form");
    			div13 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			textarea = element("textarea");
    			t9 = space();
    			div8 = element("div");
    			div7 = element("div");
    			input0 = element("input");
    			t10 = space();
    			div10 = element("div");
    			div9 = element("div");
    			input1 = element("input");
    			t11 = space();
    			div12 = element("div");
    			div11 = element("div");
    			input2 = element("input");
    			t12 = space();
    			div14 = element("div");
    			button = element("button");
    			button.textContent = "Send Message";
    			t14 = space();
    			div22 = element("div");
    			div17 = element("div");
    			span1 = element("span");
    			i0 = element("i");
    			t15 = space();
    			div16 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Khombole Thies Senegal.";
    			t17 = space();
    			p1 = element("p");
    			p1.textContent = "Quartier hanene";
    			t19 = space();
    			div19 = element("div");
    			span2 = element("span");
    			i1 = element("i");
    			t20 = space();
    			div18 = element("div");
    			h31 = element("h3");
    			a0 = element("a");
    			a0.textContent = "00 (221) 77 399 90 04";
    			t22 = space();
    			p2 = element("p");
    			p2.textContent = "Mon to Fri 9am to 6pm";
    			t24 = space();
    			div21 = element("div");
    			span3 = element("span");
    			i2 = element("i");
    			t25 = space();
    			div20 = element("div");
    			h32 = element("h3");
    			a1 = element("a");
    			a1.textContent = "kairemor@gmail.com";
    			t27 = space();
    			p3 = element("p");
    			p3.textContent = "Send us your query anytime!";
    			add_location(span0, file$d, 7, 12, 216);
    			attr_dev(p0, "class", "top_text");
    			add_location(p0, file$d, 5, 10, 160);
    			add_location(h20, file$d, 9, 10, 250);
    			attr_dev(div0, "class", "main_title");
    			add_location(div0, file$d, 4, 8, 125);
    			attr_dev(div1, "class", "col-lg-12");
    			add_location(div1, file$d, 3, 6, 93);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$d, 2, 4, 69);
    			add_location(script0, file$d, 15, 6, 423);
    			if (script1.src !== (script1_src_value = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDpfS1oRGreGSBU5HHjMmQ3o5NLw7VdJ6I&callback=initMap")) attr_dev(script1, "src", script1_src_value);
    			add_location(script1, file$d, 33, 6, 1021);
    			attr_dev(div3, "class", "d-none d-sm-block mb-5 pb-4");
    			add_location(div3, file$d, 13, 4, 320);
    			attr_dev(h21, "class", "contact-title");
    			add_location(h21, file$d, 41, 8, 1231);
    			attr_dev(div4, "class", "col-12");
    			add_location(div4, file$d, 40, 6, 1202);
    			attr_dev(textarea, "class", "form-control w-100");
    			attr_dev(textarea, "name", "message");
    			attr_dev(textarea, "id", "message");
    			attr_dev(textarea, "cols", "30");
    			attr_dev(textarea, "rows", "9");
    			attr_dev(textarea, "placeholder", "Enter Message");
    			add_location(textarea, file$d, 53, 16, 1629);
    			attr_dev(div5, "class", "form-group");
    			add_location(div5, file$d, 52, 14, 1588);
    			attr_dev(div6, "class", "col-12");
    			add_location(div6, file$d, 51, 12, 1553);
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "id", "name");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Enter your name");
    			add_location(input0, file$d, 64, 16, 1982);
    			attr_dev(div7, "class", "form-group");
    			add_location(div7, file$d, 63, 14, 1941);
    			attr_dev(div8, "class", "col-sm-6");
    			add_location(div8, file$d, 62, 12, 1904);
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "name", "email");
    			attr_dev(input1, "id", "email");
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "placeholder", "Enter email address");
    			add_location(input1, file$d, 74, 16, 2297);
    			attr_dev(div9, "class", "form-group");
    			add_location(div9, file$d, 73, 14, 2256);
    			attr_dev(div10, "class", "col-sm-6");
    			add_location(div10, file$d, 72, 12, 2219);
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "name", "subject");
    			attr_dev(input2, "id", "subject");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "Enter Subject");
    			add_location(input2, file$d, 84, 16, 2617);
    			attr_dev(div11, "class", "form-group");
    			add_location(div11, file$d, 83, 14, 2576);
    			attr_dev(div12, "class", "col-12");
    			add_location(div12, file$d, 82, 12, 2541);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$d, 50, 10, 1523);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "primary_btn button-contactForm");
    			add_location(button, file$d, 94, 12, 2918);
    			attr_dev(div14, "class", "form-group mt-lg-3");
    			add_location(div14, file$d, 93, 10, 2873);
    			attr_dev(form, "class", "form-contact contact_form");
    			attr_dev(form, "action", "contact_process.php");
    			attr_dev(form, "method", "post");
    			attr_dev(form, "id", "contactForm");
    			form.noValidate = "novalidate";
    			add_location(form, file$d, 44, 8, 1338);
    			attr_dev(div15, "class", "col-lg-8 mb-4 mb-lg-0");
    			add_location(div15, file$d, 43, 6, 1294);
    			attr_dev(i0, "class", "ti-home");
    			add_location(i0, file$d, 105, 12, 3203);
    			attr_dev(span1, "class", "contact-info__icon");
    			add_location(span1, file$d, 104, 10, 3157);
    			add_location(h30, file$d, 108, 12, 3290);
    			add_location(p1, file$d, 109, 12, 3335);
    			attr_dev(div16, "class", "media-body");
    			add_location(div16, file$d, 107, 10, 3253);
    			attr_dev(div17, "class", "media contact-info");
    			add_location(div17, file$d, 103, 8, 3114);
    			attr_dev(i1, "class", "ti-tablet");
    			add_location(i1, file$d, 114, 12, 3487);
    			attr_dev(span2, "class", "contact-info__icon");
    			add_location(span2, file$d, 113, 10, 3441);
    			attr_dev(a0, "href", "tel:00221773999004");
    			add_location(a0, file$d, 118, 14, 3595);
    			add_location(h31, file$d, 117, 12, 3576);
    			add_location(p2, file$d, 120, 12, 3680);
    			attr_dev(div18, "class", "media-body");
    			add_location(div18, file$d, 116, 10, 3539);
    			attr_dev(div19, "class", "media contact-info");
    			add_location(div19, file$d, 112, 8, 3398);
    			attr_dev(i2, "class", "ti-email");
    			add_location(i2, file$d, 125, 12, 3838);
    			attr_dev(span3, "class", "contact-info__icon");
    			add_location(span3, file$d, 124, 10, 3792);
    			attr_dev(a1, "href", "mailto:kairemor@gmail.com");
    			add_location(a1, file$d, 129, 14, 3945);
    			add_location(h32, file$d, 128, 12, 3926);
    			add_location(p3, file$d, 131, 12, 4034);
    			attr_dev(div20, "class", "media-body");
    			add_location(div20, file$d, 127, 10, 3889);
    			attr_dev(div21, "class", "media contact-info");
    			add_location(div21, file$d, 123, 8, 3749);
    			attr_dev(div22, "class", "col-lg-4");
    			add_location(div22, file$d, 102, 6, 3083);
    			attr_dev(div23, "class", "row");
    			add_location(div23, file$d, 39, 4, 1178);
    			attr_dev(div24, "class", "container");
    			add_location(div24, file$d, 1, 2, 41);
    			attr_dev(section, "id", "contact");
    			attr_dev(section, "class", "section");
    			add_location(section, file$d, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div24);
    			append_dev(div24, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(p0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, h20);
    			append_dev(div24, t3);
    			append_dev(div24, div3);
    			append_dev(div3, script0);
    			append_dev(div3, t5);
    			append_dev(div3, script1);
    			append_dev(div24, t6);
    			append_dev(div24, div23);
    			append_dev(div23, div4);
    			append_dev(div4, h21);
    			append_dev(div23, t8);
    			append_dev(div23, div15);
    			append_dev(div15, form);
    			append_dev(form, div13);
    			append_dev(div13, div6);
    			append_dev(div6, div5);
    			append_dev(div5, textarea);
    			append_dev(div13, t9);
    			append_dev(div13, div8);
    			append_dev(div8, div7);
    			append_dev(div7, input0);
    			append_dev(div13, t10);
    			append_dev(div13, div10);
    			append_dev(div10, div9);
    			append_dev(div9, input1);
    			append_dev(div13, t11);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, input2);
    			append_dev(form, t12);
    			append_dev(form, div14);
    			append_dev(div14, button);
    			append_dev(div23, t14);
    			append_dev(div23, div22);
    			append_dev(div22, div17);
    			append_dev(div17, span1);
    			append_dev(span1, i0);
    			append_dev(div17, t15);
    			append_dev(div17, div16);
    			append_dev(div16, h30);
    			append_dev(div16, t17);
    			append_dev(div16, p1);
    			append_dev(div22, t19);
    			append_dev(div22, div19);
    			append_dev(div19, span2);
    			append_dev(span2, i1);
    			append_dev(div19, t20);
    			append_dev(div19, div18);
    			append_dev(div18, h31);
    			append_dev(h31, a0);
    			append_dev(div18, t22);
    			append_dev(div18, p2);
    			append_dev(div22, t24);
    			append_dev(div22, div21);
    			append_dev(div21, span3);
    			append_dev(span3, i2);
    			append_dev(div21, t25);
    			append_dev(div21, div20);
    			append_dev(div20, h32);
    			append_dev(h32, a1);
    			append_dev(div20, t27);
    			append_dev(div20, p3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Contact", $$slots, []);
    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    const HEADER = {
      alt: "Kaire Mor",
      img: "img/LogoKm.png"
    };

    const NAVBAR_DATA = [{
        id: 1,
        url: "#home",
        label: "Home"
      },
      {
        id: 2,
        url: "#services",
        label: "Services"
      },
      {
        id: 3,
        url: "#about-us",
        label: "About us"
      },
      {
        id: 4,
        url: "#portfolio",
        label: "Projects"
      },
      {
        id: 5,
        url: "#contact",
        label: "Contacts"
      }
    ];
    const BANNER_DATA = {
      header: "Mor Kaire",
      description: "I'm a developer and data science enthusiast, student at computer science in Thies Polytechnic",
    };
    const SOCIAL_MEDIA = [{
        id: 1,
        url: "https://twitter.com/serignemorkaire",
        icon: "ti-twitter"
      },
      {
        id: 2,
        url: "https://facebook.com/kairemor",
        icon: "ti-facebook"
      },
      {
        id: 3,
        url: "https://github.com/kairemor",
        icon: "ti-github"
      },
      {
        id: 4,
        url: "https://www.linkedin.com/in/mor-kaire-54794b15b/",
        icon: "ti-linkedin"
      }
    ];

    const SKILLS = [{
        id: 1,
        icon: "fab fa-js"
      },
      {
        id: 2,
        icon: "fab fa-node-js"
      },
      {
        id: 3,
        icon: "fab fa-react"
      },
      {
        id: 4,
        icon: "fab fa-python"
      }
    ];
    const SERVICE_DATA = {
      header: "Our Services",
      ALL_SERVICES: "All Services",
      SERVICE_LIST: [{
          LABEL: "Search Engine Optimisation",
          DESCRIPTION: "To customise the content, technical functionality and scope of your website so that your pages show for a specific set of keyword at the top of a search engine list. In the end, the goal is to attract traffic to your website when they are searching for goods, services or business-related information.",
          URL: "images/service1.png"
        },
        {
          LABEL: "Content Marketing Strategy",
          DESCRIPTION: "It is tough but well worth the effort to create clever material that is not promotional in nature, but rather educates and inspires. It lets them see you as a reliable source of information by delivering content that is meaningful to your audience.",
          URL: "images/service2.png"
        },
        {
          LABEL: "Develop Social Media Strategy",
          DESCRIPTION: "Many People rely on social networks to discover, research, and educate themselves about a brand before engaging with that organization. The more your audience wants to engage with your content, the more likely it is that they will want to share it.",
          URL: "images/service3.png"
        }
      ]
    };

    const ABOUT_DATA = {
      header: "about me",
      title: "Development & Data Science ",
      image_url: "images/network.png",
      content: "My name is Mor Kaire I’m an engineering student in computer science and telecommunications in Polytechnic School of Thies .I’m anenthusiast in Software Development essentially in Web Development & mobile development. I like also doing search in machine learning and globally in the new computer science technologies to be aware in what is doing right now in this field"
    };
    const TESTIMONIAL_DATA = {
      header: "What clients say?",
      TESTIMONIAL_LIST: [{
          DESCRIPTION: "Nixalar has made a huge difference to our business with his good work and knowledge of SEO and business to business marketing techniques. Our search engine rankings are better than ever and we are getting more people contacting us thanks to Jomer’s knowledge and hard work.",
          IMAGE_URL: "images/user1.jpg",
          NAME: "Julia hawkins",
          DESIGNATION: "Co-founder at ABC"
        },
        {
          DESCRIPTION: "Nixalar and his team have provided us with a comprehensive, fast and well planned digital marketing strategy that has yielded great results in terms of content, SEO, Social Media. His team are a pleasure to work with, as well as being fast to respond and adapt to the needs of your brand.",
          IMAGE_URL: "images/user2.jpg",
          NAME: "John Smith",
          DESIGNATION: "Co-founder at xyz"
        }
      ]
    };

    const SOCIAL_DATA = {
      header: "Find us on social media",
      IMAGES_LIST: [
        "images/facebook-icon.png",
        "images/instagram-icon.png",
        "images/whatsapp-icon.png",
        "images/twitter-icon.png",
        "images/linkedin-icon.png",
        "images/snapchat-icon.png"
      ]
    };

    const FOOTER_DATA = {
      DESCRIPTION: "We are typically focused on result-based maketing in the digital world. Also, we evaluate your brand’s needs and develop a powerful strategy that maximizes profits.",
      CONTACT_DETAILS: {
        header: "Contact us",
        ADDRESS: "La trobe street docklands, Melbourne",
        MOBILE: "+1 61234567890",
        EMAIL: "nixalar@gmail.com"
      },
      SUBSCRIBE_NEWSLETTER: "Subscribe newsletter",
      SUBSCRIBE: "Subscribe"
    };

    const MOCK_DATA = {
      HEADER,
      NAVBAR_DATA,
      BANNER_DATA,
      SOCIAL_MEDIA,
      SERVICE_DATA,
      ABOUT_DATA,
      TESTIMONIAL_DATA,
      SOCIAL_DATA,
      FOOTER_DATA,
      SKILLS
    };

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file$e = "src/App.svelte";

    function create_fragment$f(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let current;

    	const navbar = new Navbar({
    			props: {
    				navlists: MOCK_DATA.NAVBAR_DATA,
    				headers: MOCK_DATA.HEADER
    			},
    			$$inline: true
    		});

    	const banner = new Banner({
    			props: {
    				BANNER: MOCK_DATA.BANNER_DATA,
    				skills: MOCK_DATA.SKILLS
    			},
    			$$inline: true
    		});

    	const aboutus = new AboutUs({
    			props: { ABOUT: MOCK_DATA.ABOUT_DATA },
    			$$inline: true
    		});

    	const service = new Service({ $$inline: true });
    	const porfolio = new Porfolio({ $$inline: true });
    	const contact = new Contact({ $$inline: true });

    	const footer = new Footer({
    			props: {
    				navlists: MOCK_DATA.NAVBAR_DATA,
    				socials: MOCK_DATA.SOCIAL_MEDIA
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			create_component(banner.$$.fragment);
    			t1 = space();
    			create_component(aboutus.$$.fragment);
    			t2 = space();
    			create_component(service.$$.fragment);
    			t3 = space();
    			create_component(porfolio.$$.fragment);
    			t4 = space();
    			create_component(contact.$$.fragment);
    			t5 = space();
    			create_component(footer.$$.fragment);
    			add_location(main, file$e, 52127, 0, 2864884);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t0);
    			mount_component(banner, main, null);
    			append_dev(main, t1);
    			mount_component(aboutus, main, null);
    			append_dev(main, t2);
    			mount_component(service, main, null);
    			append_dev(main, t3);
    			mount_component(porfolio, main, null);
    			append_dev(main, t4);
    			mount_component(contact, main, null);
    			append_dev(main, t5);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(banner.$$.fragment, local);
    			transition_in(aboutus.$$.fragment, local);
    			transition_in(service.$$.fragment, local);
    			transition_in(porfolio.$$.fragment, local);
    			transition_in(contact.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(banner.$$.fragment, local);
    			transition_out(aboutus.$$.fragment, local);
    			transition_out(service.$$.fragment, local);
    			transition_out(porfolio.$$.fragment, local);
    			transition_out(contact.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(banner);
    			destroy_component(aboutus);
    			destroy_component(service);
    			destroy_component(porfolio);
    			destroy_component(contact);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		Navbar,
    		Banner,
    		Statistique,
    		AboutUs,
    		Service,
    		Project,
    		Footer,
    		Skills,
    		Porfolio,
    		Contact,
    		DATA: MOCK_DATA
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
