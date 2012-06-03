/**
 * ��jQuery��ģ���װ
 * ���toString֧���Է�����־��ӡ
 *
 * @author qijun.weiqj
*/
define('jQuery', function() {
	
jQuery.fn.toString = function() {
	var html = [];
	this.each(function() {
		var s = [],
			tag = this.tagName.toLowerCase(),
			id = this.id,
			className = this.className;
		s.push('<' + tag);
		id && s.push(' id="' + id + '"');
		className && s.push(' class="' + className + '"');
		s.push('>');
		html.push(s.join(''));
	});
	return '[' + html.join(', ') + ']';
};

return jQuery;

});
