/**
 * 用于执行一个模块/类/普通对象方法
 * 统一异常管理,转交给errorHandler
 * 统一的执行时间记录, 由log模块输出
 * 
 * @author qijun.weiqj
 */
define('Executor', ['jQuery', 'Class', 'Log'],

function($, Class, Log) {

var log = new Log('may:Executor'),
	proxy = function() {};
	
return new Class({

	init: function(options) {
		options = options || {};
		this._error = options.error || may.error;
		this._userload = options.load;
	},

	/**
	 * execute(function, context, args)
	 * execute(function, null, args)
	 * execute(function, args);
	 *
	 * execute(context, name, args)
	 * execute(context, args);	// name = 'init'
	 * 
	 * execute(module, context|name, args) 
	 *		-> execute(load(module), context, args);
	 */
	execute: function(method, context, args) {
		// execute(module|function|context, args)
		if (args === undefined && $.isArray(context)) {
			args = context;
			context = null;
		}

		var type = typeof method;

		// execute(function, context, args)
		if (type === 'function') {
			this._call(context, method, args);
		
		// execute(module, context|name, args)
		} else if (type === 'string') {
			this._load(method, function(o) {
				self.execute(o, context, args);
			});
		} else if (method) {
			// execute(context, name, args);
			context = method[typeof context === 'string' ? context : 'init'];
			if (typeof context === 'function') {
				this._call(method, context, args);
			} else {
				this._error('parameters error');
			}
		} else {
			this._error('parameters error');
		}
	},

	_call: function(o, method, args) {
		var time = null,
			guid = this._guid++;
		try {
			if (log.isEnabled('info')) {
				time = (new Date()).getTime();
				log.info('[' + guid + '] start');
			}
			if (o === true) {
				proxy.prototype = method.prototype;
				o = new proxy();
			}
			args = args || [];
			method.apply(o, args);
			if (log.isEnabled('info')) {
				time = (new Date()).getTime() - time;
				log.info('[' + guid + '] cost ' + time + ' ms');
			}
		} catch (e) {
			this._error(e);
		}
	},

	_load: function(module, success) {
		var self = this,
			// 首先从以名字空间中取，如a.b.c -> window['a']['b']['c']
			o = this._get(module);
		if (o) {
			success(o);
		} else if (this._userload) {
			// 如果有load方法，则使用load来载入模块
			this._userload(module, success, function() {
				self._error('load module [' + module + '] fail');
			});
		} else {
			log.error('can not resolve module [' + module + ']');
		}
	},

	_get: function(module) {
		var parts = module.split('.'),
			o = window;
		for (var i = 0, c = parts.length; i < c; i++) {
			o = o[parts[i]];
			if (!o) {
				return;
			}
		}
		return o;
	},

	_guid: 1
	
});
		
});
