/**
 * �ṩһ��ͳһ�Ҽ򵥵ķ�ʽ����Class
 *
 * @author qijun.weiqj
 */
define('Class', ['jQuery'], function($) {

/**
 * ��:
 *	 var Dialog = new Class({
 *		init: function() {
 *			...
 *		}
 *	 });
 *
 *	Ȼ���������ʹ�ã�
 *	
 *	 var dialog = new Dialog({ width: 400, height: 300 });
 */
var Class = function(parent, o) {
	// ʡ�Ե�һ������
	if (!o) {
		o = parent;
		parent = null;
	}
	var klass = function() {
			// ���Զ���initialize �� initΪ���캯��
			var init = this.initialize || this.init;
			init && init.apply(this, arguments);
		},
		proto = null;

	if (parent) {
		proxy.prototype = typeof parent === 'function' ? 
				parent.prototype : parent;
		proto = new proxy();
	} else {
		proto = {};
	}

	klass.prototype = $.extend(proto, o);
	return klass;
};

var proxy = function() {};

return Class;

});
