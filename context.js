/**
 * 基于事件机制管理一组模块
 * @author qijun.weiqj
 */
define('Context', ['jQuery', 'Class', 'Log'], 

function($, Class, Log) {

var Context = new Class({

	init: function(name, attachment) {
		this.name = name;
		
		this._log = new Log(name);
		this._attachment = attachment;

		/*
		 * [
		 *		{
		 *			name: name,
		 *			events: {
		 *				'default': module,
		 *				'exposure': module
		 *			}
		 *		},
		 *		...
		 * ]
		 */
		this._modules = [];
		this._indices = {};
	},

	/**
	 * 添加模块到容器
	 *
	 * @param {string} 名称
	 * @param {function|object} 模块
	 */
	add: function(name, event, module) {
		// add(name, module)
		if (!module) {
			module = event;
			event = 'default';
		}

		var item = this._get(name);
		if (!item) {
			this._indices[name] = this._modules.length;
			item = { name: name, events: {} };
			this._modules.push(item);
		}
		
		if (item.events[event]) {
			this._log.warn(name + '['+ event + '] is already added');
			return;
		} 

		item.events[event] = {
			event: event,
			module: module,
			times: 0
		};

		this._log.info(name + '['+ event + '] is added');
		
		// 如果context已start, 则直接进行bind
		// 比如domready之后注册模块的情况
		this._started && this._start(name, item.events[event]);
	},

	/**
	 * 执行容器内模块的初始化
	 *
	 *	attachment.before -> not false
	 *
	 *		foreach module in context
	 *			foreach event in item
	 *				node = attachment.query(name, event)
	 *				attachment.bind(node, event, module)
	 *
	 *	attachment.after
	 */
	start: function() {
		var self = this,
			attach = this._attachment;

		this._log.info('starting...');
			
		if (attach.before && attach.before(this) === false) {
			this._log.info('before return false, break start');
			this._started = true;
			return;
		}

		$.each(this._modules, function(i, item) {
			$.each(item.events, function(event, o) {
				self._start(item.name, o);
			});
		});
		
		this._started = true;
		this._log.info('started');
	},

	/**
	 * 绑定节点和模块
	 * 根据名称查询节点，再进行事件绑定
	 *
	 * @param {string} name 名称
	 * @o {object}
	 *	- event
	 *	- module
	 *	- times
	 */
	_start: function(name, o) {
		var self = this,
			attach = this._attachment,
			node = attach.query ? attach.query(name, o.event) : name;

		if (!node) {
			this._log.info('no node query for context ' + name + '[' + o.event + ']');
			return;
		}

		this._bind(name, node, o);
	},

	/**
	 * 绑定模块到节点
	 */
	_bind: function(name, node, o, options) {
		var self = this,
			attach = this._attachment;

		this._log.info('bind event for ' + name + '[' + o.event + ']');
		attach.bind(node, o.event, o.module, options);
		o.times++;
	},

	/**
	 * 将node与模块关联, 即绑定事件到node
	 * @param node 节点, 可以是抽像的节点, 一般为dom节点或jquery对象
	 * @param type 事件, 默认为default
	 * @param options 可选的额外数据, 可以由attachment在bind方法实现中使用
	 */
	attach: function(node, event, options) {
		if (arguments.length === 2 && typeof event !== 'string') {
			options = event;
			event = null;
		}
		event = event || 'default';

		var attach = this._attachment,
			name = attach.resolve ? attach.resolve(node) : node,
			o = name ? this._get(name, event) : null;

		if (o) {
			this._bind(name, node, o, options);
			return true;
		} else {
			this._log.info('no context for node: ' + node);
			return false;
		}
	},

	/**
	 * 取得指定名称和事件的模块
	 * @param {string} name  模块名称
	 * @param {string} event 事件名称, 默认为default
	 */
	_get: function(name, event) {
		var index = this._indices[name],
			item = null;

		if (index === undefined) {
			return null;
		}

		item = this._modules[index];
		return event ? item.events[event] : item;
	},

	/**
	 * 取得指定名称和事件的模块
	 * @see _get
	 */
	get: function(name, event) {
		var o = this._get(name, event || 'default');
		return o ? o.module : null;
	}

});
//~


return Context;

		
});
