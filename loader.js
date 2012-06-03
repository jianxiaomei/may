/**
 * 定义一种统一的方式来书写js 
 * 使用统一的方式管理模块的依赖，
 * 并提供异步加载机制
 * 类似于amd loader api，但提供更加实用的特性：如匿名模块马上进行初始化
 *
 * @author qijun.weiqj
 */
(function(window) {

var may = {
	version: '1.0'
};


// utility
var noop = function() {},
	toString = Object.prototype.toString,
	isArray = function(o) {
		return toString.apply(o) === '[object Array]'; 
	},
	extend = function(des, src) {
		for (var k in src) {
			var v = src[k];
			if (v !== null && v !== undefined) {
				des[k] = v;
			}
		}
		return des;
	};


/**
 * simple log support
 * may.log.handler can be overwrite by other module
 */
var logLevel = { none: 0, error: 1, warn: 2, info: 3, debug: 4 },
	isLogEnabled = function(level) {
		return logLevel[level] <= may.log.level;	
	};


may.log = function(msg, level, type) {
	return may.log.handler(msg, level, type);
};

may.log.handler =  window.console ? function(msg, level, type) {
	level = level || 'info';
	if (isLogEnabled(level)) {
		msg = (type ? '[' + type + '] ' : '') + msg;
		if (console[level]) {
			console[level](msg);
		} else if (console.log) {
			console.log(msg);
		}
	}
} : noop;

/**
 * log level
 *	support set log level in query string, 
 *	exp: '?debug=true' or '?may-log-level=error'
 */
var getLevel = function() {
	var search = window.location.search,
		level = /\bdebug=true\b/.test(search) ? 'debug' : false;
	level = level || (/debug-log-level=(\w+)\b/.exec(search) || {})[1] || 'error';
	return logLevel[level];
};

may.log.isEnabled = isLogEnabled;
may.log.level = getLevel();
may.isDebug = may.log.level === logLevel['debug'];


/**
 * error handler, can be overwrite by other module
 */
may.error = function(e) {
	e = typeof e === 'string' ? new Error(e) : e;
	throw e;
};


// used for loader
var log = function(msg, level) {
	return may.log(msg, level, 'may:Loader');
};

var assert = function(bool, message) {
	bool || may.error(message);
};


var cache = {},		// module cache
	EMPTY_DEPENDS = [],
	FAIL = {};

may._guid = 1;
may._current = null;

/**
 * define a module
 * unlike amd loader, anonymous module will require immediately
 */
var define = function(config, id, depends, factory) {
	var args = regularArgs(id, depends, factory),
		id = args.id,
		mods = config.modules;	

	if (mods[id]) {
		log(getId(config, id) + ' already configured, ignore', 'warn');
		return;
	} else {
		mods[id] = args;
	}

	// if id begin with !, that it is an anonymouse module, we require it immediately
	if (id.indexOf('!') === 0) {
		require(config, [id]);
	}
};

/**
 * define(id, depends, factory)
 * define(id, factory{not array})
 * define(id, depends{array})
 * define(depends{array}, factory)
 * define(factory{function})
 */
var regularArgs = function(id, depends, factory) {
	// define(a, b) -> define(a, [], b)
	if (factory === undefined && !isArray(depends)) {
		factory = depends;
		depends = EMPTY_DEPENDS;
	}

	if (typeof id === 'function') {
		factory = id;
		depends = EMPTY_DEPENDS;
		id = null;
	} else if (isArray(id)) {
		depends = id;
		id = null;
	}

	assert(isArray(depends), 'arguments error, depends should be an array');

	id = id || '!anonymous' + may._guid++; 

	return { id: id, depends: depends, factory: factory };
};

//~ define


var require = function(config, depends, callback) {
	depends = depends ? 
			isArray(depends) ? depends : [depends] :
			[];

	var list = [],
		i = 0,
		n = depends.length,
		depend = null,
		
		check = function() {
			for (var j = 0; j < n; j++) {
				if (!list[j]) {
					return;
				}
			}
			callback && callback.apply(null, list);
		},
		
		load = function(index) {
			var depend = depends[index];
			loadModule(config, depend, function(o) {
				assert(o !== FAIL, 'load ' + getId(config, depend) + ' error');
				list[index] = o;
				check();
			});
		};

	for (; i < n; i++) {
		load(i);
	}

	return list[0];		
};


var loadModule = function(config, id, callback) {
	if (id === 'require') {
		callback(config.require);
		return;
	}

	var alias = null,
		pos = null,
		o = null,
		otherConfig = null;

	if (config.alias && 
			(alias = config.alias[id])) {
		id = alias;
	}
	
	// may be require other project, exp may:class, offer:widget.Tabs
	// this feature can shorten module id
	pos = id.indexOf(':');
	if (pos !== -1 && 
			(otherConfig = cache[id.substr(0, pos)])) {
		return loadModule(otherConfig, id.substr(pos + 1), callback);
	}

	o = config.modules[id];
	if (o) {
		loadModuleFromDef(config, o, callback);
	} else {
		loadModuleFromScript(config, id, callback);
	}
};


var loadModuleFromDef = function(config, o, callback) {
	var id = o.id,
		longId = getId(config, id);

	if (o.load) {
		o.load++;
		log(longId + ' is loaded [' + o.load + ']');
		callback(o.data);
		return;
	}
	
	o.loadList = o.loadList || [];
	o.loadList.push(callback);
	if (o.loadList.length > 1) {
		return;
	}

	var depends = o.depends.length ? o.depends : ['require'];

	require(config, depends, function() {
		var factory = o.factory,
			loadList = o.loadList; 

		if (typeof factory === 'function') {
			factory = factory.apply(null, arguments);
			log('initialize ' + longId + ' complete!');
		}
		o.data = factory;
		log(longId + ' is loaded');

		for (var i = 0, c = loadList.length; i < c; i++) {
			loadList[i](factory);
		}
		
		o.load = loadList.length;
		o.loadList = null;
	});	
};


var rAbs = /^https?:\/\//,
	rFirst = /^([^\/]+)/,
	rLastSlash = /\/$/,
	loadList = {};

var loadModuleFromScript = function(config, id, callback) {
	var list = loadList[id] = loadList[id] || [],
		path = null,
		isAbsPath = false;

	list.push(callback);
	if (list.length > 1) {
		return;
	}
	
	if (rAbs.test(id)) {
		path = id;
		isAbsPath = true;
	} else {
		path = getPath(config, id);
	}

	log('load module from : ' + path);
	config.load(path, {
		success: function() {
			// if id is AbsPath, we define an module manually
			if (isAbsPath) {
				define(id, EMPTY_DEPENDS, noop);
			}

			var o = config.modules[id];
			if (!o) {
				log('load module error ' + getId(id));
				return;
			}

			o.async = true; 
			loadModuleFromDef(config, o, function(factory) {
				for (var i = 0, c = list.length; i < c; i++) {
					list[i](factory);
				}
			});
			delete loadList[id];
		},

		error: function() {
			log('file not found, load module error ' + getId(id));
		}

	});

};


var getId = function(config, id) {
	return config.id + ':' + id; 	
};

var getPath = function(config, id) {
	var base = config.baseUrl,
		pathes = config.pathes,
		first = null,
		path = null;

	id = id.replace(/\./g, '/')
		.replace(/([a-z])([A-Z])/g, function(s, m1, m2) {
			return m1 + '-'	+ m2;
		}).toLowerCase();

	if (pathes) {
		first = (rFirst.exec(id) || {})[1];
		if (first && 
				(path = pathes[first])) {
			id = id.replace(rFirst, path.replace(rLastSlash, ''));
		}
	}

	if (base) {
		id = base.replace(rLastSlash, '') + '/' + id;
	}

	return id + '.js';
};
//~ require


var config = function(cfg) {
	if (!cfg) {
		// clear current
		may._current = null;
		return;
	} 

	// set current
	if (typeof cfg === 'string') {
		log('set current loader: ' + cfg);
		may._current = cache[cfg];
		assert(may._current, 'config for ' + cfg + ' is not exist');
			return may._current.facade;
	} 

	// new config
	assert(cfg.id, 'please specify config id');
	assert(!cache[cfg.id], 'config for ' + cfg.id + ' is already exist');

	log('config loader ' + cfg.id);

	cfg = extend({
		load: loadResource
	}, cfg);

	cfg.require = function(depends, callback) {
		if (typeof depends === 'function') {
			callback = depends;
			depends = [];
		}
		return require(cfg, depends, callback);
	};

	cfg.define = function(id, depends, factory) {
		return define(cfg, id, depends, factory);
	};

	cfg.modules = {};

	cache[cfg.id] = cfg;

	// if current empty, set ccurrent
	if (!may._current) {
		log('set current loader ' + cfg.id);
		may._current = cfg;
	}
	may._current = may._current || cfg;
	
	cfg.facade = { define: cfg.define, require: cfg.require };

	return cfg.facade;
};


var globalDefine = function(id, depends, factory) {
	var config = may._current;
	assert(config, 'current config not exist');
	return config.define(id, depends, factory);
};

//~

//jQuery support
var loadScript = function(url, success, error) {
	var flag = false,
		timer = null;
	jQuery.ajax(url, { 
		dataType: 'script', 
		cache: true, 
		success: function() {
			if (flag) {
				return;
			}
			clearTimeout(timer);
			success();
		},
		error: function() {
			if (flag) {
				return;
			}
			clearTimeout(timer);
			error();
		}
	});

	timer = setTimeout(function() {
		flag = true;	
		error();
	}, 10000);
};
//~ loadScript

var loadCss = function(url, success, error) {
    var link = document.createElement('link'),
		timeout = false,
		timer = null,
		img = null;

	link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;

    document.getElementsByTagName('head')[0].appendChild(link);

    img = document.createElement('img');
	img.onerror = function() {
		if (timeout) {
			return;
		}
		clearTimeout(timer);
		log('load css success ' + url);
		success && success();
	}
    img.src = url;

	timer = setTimeout(function() {
		timeout = true;	
		log('load css timeout ' + url);
		error && error();
	}, 10000);

	return link;
};


var rCss = /\.css(\?[-\w]*)?$/;
var loadResource = function(url, options) {
	if (rCss.test(url)) {
		loadCss(url, options.success, options.error);
	} else {
		loadScript(url, options.success, options.error);
	}
};

//~

// define system loader

config({ id: 'url' }); // for wrap normal script
config({ id: 'may' });
config('may');	// set current loader

may.config = config;


// packing
var _may = window.may,
	_define = window.define;

// for debug
may._cache = cache;

may.noConflict = function(deep) {
	if (deep) {
		window.define = _define;
	}
	window.may = _may;
	return may;
};


window.may = may;
window.define = globalDefine;

// define an css loader
window.define('CssLoader', function() {
	return { load: loadCss };
});

})(window);
