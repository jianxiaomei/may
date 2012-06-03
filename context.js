/**
 * �����¼����ƹ���һ��ģ��
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
	 * ���ģ�鵽����
	 *
	 * @param {string} ����
	 * @param {function|object} ģ��
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
		
		// ���context��start, ��ֱ�ӽ���bind
		// ����domready֮��ע��ģ������
		this._started && this._start(name, item.events[event]);
	},

	/**
	 * ִ��������ģ��ĳ�ʼ��
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
	 * �󶨽ڵ��ģ��
	 * �������Ʋ�ѯ�ڵ㣬�ٽ����¼���
	 *
	 * @param {string} name ����
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
	 * ��ģ�鵽�ڵ�
	 */
	_bind: function(name, node, o, options) {
		var self = this,
			attach = this._attachment;

		this._log.info('bind event for ' + name + '[' + o.event + ']');
		attach.bind(node, o.event, o.module, options);
		o.times++;
	},

	/**
	 * ��node��ģ�����, �����¼���node
	 * @param node �ڵ�, �����ǳ���Ľڵ�, һ��Ϊdom�ڵ��jquery����
	 * @param type �¼�, Ĭ��Ϊdefault
	 * @param options ��ѡ�Ķ�������, ������attachment��bind����ʵ����ʹ��
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
	 * ȡ��ָ�����ƺ��¼���ģ��
	 * @param {string} name  ģ������
	 * @param {string} event �¼�����, Ĭ��Ϊdefault
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
	 * ȡ��ָ�����ƺ��¼���ģ��
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
