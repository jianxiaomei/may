/**
 * ����־ģ��
 *
 * ����Ҫʵ����IE�¿��Ը��ӷ����Ѻõ���ʾ��־�����ҷ������
 * �ṩ�����ݵķ�ʽ��������־
 *
 * ��Ȼ����ܺͺ�̨��ϣ��ѳ�����Ϣ��¼����̨���Է���ǰ���쳣�ļ��
 *
 * @author qijun.weiqj
 */
define('Log', ['jQuery', 'Class'], 

function($, Class) {

var Log = new Class({
	
	init: function(name) {
		this.name = name;
	},

	error: function(message) {
		this.log(message, 'error');
	},

	warn: function(message) {
		this.log(message, 'warn');
	},

	info: function(message) {
		this.log(message, 'info');
	},

	log: function(message, level) {
		simpleLog(message, level, this.name);
	},

	isEnabled: may.log.isEnabled
  
});
//~ Log

var body = null,
	list = [],
	search = window.location.search,
	logConsole = /\bdebug-log-console=true\b/.test(search),
	filter = (/\bdebug-log-filter=([^&]+)/.exec(search) || {})[1];


var prepare = function() {
	var container = $('<div class="debug-container"></div>').appendTo('body'),
		clear = $('<a class="clear" href="#">Clear</a>').appendTo(container);

	body = $('<div class="body"></div>').appendTo(container);

	clear.on('click', function(e) {
		e.preventDefault();
		body.empty();	
	});

	$.each(list, function(index, message) {
		body.append(message);
	});
};

logConsole && $(function() {
	prepare();	
});


var oriLog = may.log.handler;
var simpleLog = function(message, level, name) {
	level = level || 'info'

	if (!may.log.isEnabled(level)) {
		return;
	}
	
	if (filter && !checkFilter(message, level, name)) {
		return;
	}

	if (logConsole) {
		var node = $('<p class="debug debug-' + level + '"></p>');
		node.text((name ? '[' + name + '] ' : '') + message);
		
		if (body) {
			body.append(node);
		} else {
			list.push(node);
		}

	} else {
		oriLog(message, level, name);
	}

};

var checkFilter = function(message, level, name) {
	if (name && name.indexOf(filter) !== -1 ||
			level === filter ||
			message && message.indexOf(filter) !== -1) {
		return true;
	}
	return false;
};


may.log.handler = simpleLog;


return Log;
		

});


