
/* jquery.form.js
-------------------------------------------------------------------------------------
 */

/*!
 * jQuery Form Plugin
 * version: 2.64 (25-FEB-2011)
 * @requires jQuery v1.3.2 or later
 *
 * Examples and documentation at: http://malsup.com/jquery/form/
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */
;(function($) {

/*
	Usage Note:
	-----------
	Do not use both ajaxSubmit and ajaxForm on the same form.  These
	functions are intended to be exclusive.  Use ajaxSubmit if you want
	to bind your own submit handler to the form.  For example,

	$(document).ready(function() {
		$('#myForm').bind('submit', function(e) {
			e.preventDefault(); // <-- important
			$(this).ajaxSubmit({
				target: '#output'
			});
		});
	});

	Use ajaxForm when you want the plugin to manage all the event binding
	for you.  For example,

	$(document).ready(function() {
		$('#myForm').ajaxForm({
			target: '#output'
		});
	});

	When using ajaxForm, the ajaxSubmit function will be invoked for you
	at the appropriate time.
*/

/**
 * ajaxSubmit() provides a mechanism for immediately submitting
 * an HTML form using AJAX.
 */
$.fn.ajaxSubmit = function(options) {
	// fast fail if nothing selected (http://dev.jquery.com/ticket/2752)
	if (!this.length) {
		log('ajaxSubmit: skipping submit process - no element selected');
		return this;
	}

	if (typeof options == 'function') {
		options = { success: options };
	}

	var action = this.attr('action');
	var url = (typeof action === 'string') ? $.trim(action) : '';
	if (url) {
		// clean url (don't include hash vaue)
		url = (url.match(/^([^#]+)/)||[])[1];
	}
	url = url || window.location.href || '';

	options = $.extend(true, {
		url:  url,
		type: this[0].getAttribute('method') || 'GET', // IE7 massage (see issue 57)
		iframeSrc: /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank'
	}, options);

	// hook for manipulating the form data before it is extracted;
	// convenient for use with rich editors like tinyMCE or FCKEditor
	var veto = {};
	this.trigger('form-pre-serialize', [this, options, veto]);
	if (veto.veto) {
		log('ajaxSubmit: submit vetoed via form-pre-serialize trigger');
		return this;
	}

	// provide opportunity to alter form data before it is serialized
	if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
		log('ajaxSubmit: submit aborted via beforeSerialize callback');
		return this;
	}

	var n,v,a = this.formToArray(options.semantic);
	if (options.data) {
		options.extraData = options.data;
		for (n in options.data) {
			if(options.data[n] instanceof Array) {
				for (var k in options.data[n]) {
					a.push( { name: n, value: options.data[n][k] } );
				}
			}
			else {
				v = options.data[n];
				v = $.isFunction(v) ? v() : v; // if value is fn, invoke it
				a.push( { name: n, value: v } );
			}
		}
	}

	// give pre-submit callback an opportunity to abort the submit
	if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
		log('ajaxSubmit: submit aborted via beforeSubmit callback');
		return this;
	}

	// fire vetoable 'validate' event
	this.trigger('form-submit-validate', [a, this, options, veto]);
	if (veto.veto) {
		log('ajaxSubmit: submit vetoed via form-submit-validate trigger');
		return this;
	}

	var q = $.param(a);

	if (options.type.toUpperCase() == 'GET') {
		options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + q;
		options.data = null;  // data is null for 'get'
	}
	else {
		options.data = q; // data is the query string for 'post'
	}

	var $form = this, callbacks = [];
	if (options.resetForm) {
		callbacks.push(function() { $form.resetForm(); });
	}
	if (options.clearForm) {
		callbacks.push(function() { $form.clearForm(); });
	}

	// perform a load on the target only if dataType is not provided
	if (!options.dataType && options.target) {
		var oldSuccess = options.success || function(){};
		callbacks.push(function(data) {
			var fn = options.replaceTarget ? 'replaceWith' : 'html';
			$(options.target)[fn](data).each(oldSuccess, arguments);
		});
	}
	else if (options.success) {
		callbacks.push(options.success);
	}

	options.success = function(data, status, xhr) { // jQuery 1.4+ passes xhr as 3rd arg
		var context = options.context || options;   // jQuery 1.4+ supports scope context
		for (var i=0, max=callbacks.length; i < max; i++) {
			callbacks[i].apply(context, [data, status, xhr || $form, $form]);
		}
	};

	// are there files to upload?
	var fileInputs = $('input:file', this).length > 0;
	var mp = 'multipart/form-data';
	var multipart = ($form.attr('enctype') == mp || $form.attr('encoding') == mp);

	// options.iframe allows user to force iframe mode
	// 06-NOV-09: now defaulting to iframe mode if file input is detected
   if (options.iframe !== false && (fileInputs || options.iframe || multipart)) {
	   // hack to fix Safari hang (thanks to Tim Molendijk for this)
	   // see:  http://groups.google.com/group/jquery-dev/browse_thread/thread/36395b7ab510dd5d
	   if (options.closeKeepAlive) {
		   $.get(options.closeKeepAlive, fileUpload);
		}
	   else {
		   fileUpload();
		}
   }
   else {
		$.ajax(options);
   }

	// fire 'notify' event
	this.trigger('form-submit-notify', [this, options]);
	return this;


	// private function for handling file uploads (hat tip to YAHOO!)
	function fileUpload() {
		var form = $form[0];

		if ($(':input[name=submit],:input[id=submit]', form).length) {
			// if there is an input with a name or id of 'submit' then we won't be
			// able to invoke the submit fn on the form (at least not x-browser)
			alert('Error: Form elements must not have name or id of "submit".');
			return;
		}

		var s = $.extend(true, {}, $.ajaxSettings, options);
		s.context = s.context || s;
		var id = 'jqFormIO' + (new Date().getTime()), fn = '_'+id;
		var $io = $('<iframe id="' + id + '" name="' + id + '" src="'+ s.iframeSrc +'" />');
		var io = $io[0];

		$io.css({ position: 'absolute', top: '-1000px', left: '-1000px' });

		var xhr = { // mock object
			aborted: 0,
			responseText: null,
			responseXML: null,
			status: 0,
			statusText: 'n/a',
			getAllResponseHeaders: function() {},
			getResponseHeader: function() {},
			setRequestHeader: function() {},
			abort: function() {
				this.aborted = 1;
				$io.attr('src', s.iframeSrc); // abort op in progress
			}
		};

		var g = s.global;
		// trigger ajax global events so that activity/block indicators work like normal
		if (g && ! $.active++) {
			$.event.trigger("ajaxStart");
		}
		if (g) {
			$.event.trigger("ajaxSend", [xhr, s]);
		}

		if (s.beforeSend && s.beforeSend.call(s.context, xhr, s) === false) {
			if (s.global) {
				$.active--;
			}
			return;
		}
		if (xhr.aborted) {
			return;
		}

		var timedOut = 0;

		// add submitting element to data if we know it
		var sub = form.clk;
		if (sub) {
			var n = sub.name;
			if (n && !sub.disabled) {
				s.extraData = s.extraData || {};
				s.extraData[n] = sub.value;
				if (sub.type == "image") {
					s.extraData[n+'.x'] = form.clk_x;
					s.extraData[n+'.y'] = form.clk_y;
				}
			}
		}

		// take a breath so that pending repaints get some cpu time before the upload starts
		function doSubmit() {
			// make sure form attrs are set
			var t = $form.attr('target'), a = $form.attr('action');

			// update form attrs in IE friendly way
			form.setAttribute('target',id);
			if (form.getAttribute('method') != 'POST') {
				form.setAttribute('method', 'POST');
			}
			if (form.getAttribute('action') != s.url) {
				form.setAttribute('action', s.url);
			}

			// ie borks in some cases when setting encoding
			if (! s.skipEncodingOverride) {
				$form.attr({
					encoding: 'multipart/form-data',
					enctype:  'multipart/form-data'
				});
			}

			// support timout
			if (s.timeout) {
				setTimeout(function() { timedOut = true; cb(); }, s.timeout);
			}

			// add "extra" data to form if provided in options
			var extraInputs = [];
			try {
				if (s.extraData) {
					for (var n in s.extraData) {
						extraInputs.push(
							$('<input type="hidden" name="'+n+'" value="'+s.extraData[n]+'" />')
								.appendTo(form)[0]);
					}
				}

				// add iframe to doc and submit the form
				$io.appendTo('body');
				io.attachEvent ? io.attachEvent('onload', cb) : io.addEventListener('load', cb, false);
				form.submit();
			}
			finally {
				// reset attrs and remove "extra" input elements
				form.setAttribute('action',a);
				if(t) {
					form.setAttribute('target', t);
				} else {
					$form.removeAttr('target');
				}
				$(extraInputs).remove();
			}
		}

		if (s.forceSync) {
			doSubmit();
		}
		else {
			setTimeout(doSubmit, 10); // this lets dom updates render
		}

		var data, doc, domCheckCount = 50;

		function cb() {
			doc = io.contentWindow ? io.contentWindow.document : io.contentDocument ? io.contentDocument : io.document;
			if (!doc || doc.location.href == s.iframeSrc) {
				// response not received yet
				return;
			}
			io.detachEvent ? io.detachEvent('onload', cb) : io.removeEventListener('load', cb, false);

			var ok = true;
			try {
				if (timedOut) {
					throw 'timeout';
				}

				var isXml = s.dataType == 'xml' || doc.XMLDocument || $.isXMLDoc(doc);
				log('isXml='+isXml);
				if (!isXml && window.opera && (doc.body == null || doc.body.innerHTML == '')) {
					if (--domCheckCount) {
						// in some browsers (Opera) the iframe DOM is not always traversable when
						// the onload callback fires, so we loop a bit to accommodate
						log('requeing onLoad callback, DOM not available');
						setTimeout(cb, 250);
						return;
					}
					// let this fall through because server response could be an empty document
					//log('Could not access iframe DOM after mutiple tries.');
					//throw 'DOMException: not available';
				}

				//log('response detected');
				xhr.responseText = doc.body ? doc.body.innerHTML : doc.documentElement ? doc.documentElement.innerHTML : null;
				xhr.responseXML = doc.XMLDocument ? doc.XMLDocument : doc;
				xhr.getResponseHeader = function(header){
					var headers = {'content-type': s.dataType};
					return headers[header];
				};

				var scr = /(json|script)/.test(s.dataType);
				if (scr || s.textarea) {
					// see if user embedded response in textarea
					var ta = doc.getElementsByTagName('textarea')[0];
					if (ta) {
						xhr.responseText = ta.value;
					}
					else if (scr) {
						// account for browsers injecting pre around json response
						var pre = doc.getElementsByTagName('pre')[0];
						var b = doc.getElementsByTagName('body')[0];
						if (pre) {
							xhr.responseText = pre.textContent;
						}
						else if (b) {
							xhr.responseText = b.innerHTML;
						}
					}
				}
				else if (s.dataType == 'xml' && !xhr.responseXML && xhr.responseText != null) {
					xhr.responseXML = toXml(xhr.responseText);
				}

				data = httpData(xhr, s.dataType, s);
			}
			catch(e){
				log('error caught:',e);
				ok = false;
				xhr.error = e;
				s.error && s.error.call(s.context, xhr, 'error', e);
				g && $.event.trigger("ajaxError", [xhr, s, e]);
			}

			if (xhr.aborted) {
				log('upload aborted');
				ok = false;
			}

			// ordering of these callbacks/triggers is odd, but that's how $.ajax does it
			if (ok) {
				s.success && s.success.call(s.context, data, 'success', xhr);
				g && $.event.trigger("ajaxSuccess", [xhr, s]);
			}

			g && $.event.trigger("ajaxComplete", [xhr, s]);

			if (g && ! --$.active) {
				$.event.trigger("ajaxStop");
			}

			s.complete && s.complete.call(s.context, xhr, ok ? 'success' : 'error');

			// clean up
			setTimeout(function() {
				$io.removeData('form-plugin-onload');
				$io.remove();
				xhr.responseXML = null;
			}, 100);
		}

		var toXml = $.parseXML || function(s, doc) { // use parseXML if available (jQuery 1.5+)
			if (window.ActiveXObject) {
				doc = new ActiveXObject('Microsoft.XMLDOM');
				doc.async = 'false';
				doc.loadXML(s);
			}
			else {
				doc = (new DOMParser()).parseFromString(s, 'text/xml');
			}
			return (doc && doc.documentElement && doc.documentElement.nodeName != 'parsererror') ? doc : null;
		};
		var parseJSON = $.parseJSON || function(s) {
			return window['eval']('(' + s + ')');
		};

		var httpData = function( xhr, type, s ) { // mostly lifted from jq1.4.4
			var ct = xhr.getResponseHeader('content-type') || '',
				xml = type === 'xml' || !type && ct.indexOf('xml') >= 0,
				data = xml ? xhr.responseXML : xhr.responseText;

			if (xml && data.documentElement.nodeName === 'parsererror') {
				$.error && $.error('parsererror');
			}
			if (s && s.dataFilter) {
				data = s.dataFilter(data, type);
			}
			if (typeof data === 'string') {
				if (type === 'json' || !type && ct.indexOf('json') >= 0) {
					data = parseJSON(data);
				} else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
					$.globalEval(data);
				}
			}
			return data;
		};
	}
};

/**
 * ajaxForm() provides a mechanism for fully automating form submission.
 *
 * The advantages of using this method instead of ajaxSubmit() are:
 *
 * 1: This method will include coordinates for <input type="image" /> elements (if the element
 *	is used to submit the form).
 * 2. This method will include the submit element's name/value data (for the element that was
 *	used to submit the form).
 * 3. This method binds the submit() method to the form for you.
 *
 * The options argument for ajaxForm works exactly as it does for ajaxSubmit.  ajaxForm merely
 * passes the options argument along after properly binding events for submit elements and
 * the form itself.
 */
$.fn.ajaxForm = function(options) {
	// in jQuery 1.3+ we can fix mistakes with the ready state
	if (this.length === 0) {
		var o = { s: this.selector, c: this.context };
		if (!$.isReady && o.s) {
			log('DOM not ready, queuing ajaxForm');
			$(function() {
				$(o.s,o.c).ajaxForm(options);
			});
			return this;
		}
		// is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
		log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));
		return this;
	}

	return this.ajaxFormUnbind().bind('submit.form-plugin', function(e) {
		if (!e.isDefaultPrevented()) { // if event has been canceled, don't proceed
			e.preventDefault();
			$(this).ajaxSubmit(options);
		}
	}).bind('click.form-plugin', function(e) {
		var target = e.target;
		var $el = $(target);
		if (!($el.is(":submit,input:image"))) {
			// is this a child element of the submit el?  (ex: a span within a button)
			var t = $el.closest(':submit');
			if (t.length == 0) {
				return;
			}
			target = t[0];
		}
		var form = this;
		form.clk = target;
		if (target.type == 'image') {
			if (e.offsetX != undefined) {
				form.clk_x = e.offsetX;
				form.clk_y = e.offsetY;
			} else if (typeof $.fn.offset == 'function') { // try to use dimensions plugin
				var offset = $el.offset();
				form.clk_x = e.pageX - offset.left;
				form.clk_y = e.pageY - offset.top;
			} else {
				form.clk_x = e.pageX - target.offsetLeft;
				form.clk_y = e.pageY - target.offsetTop;
			}
		}
		// clear form vars
		setTimeout(function() { form.clk = form.clk_x = form.clk_y = null; }, 100);
	});
};

// ajaxFormUnbind unbinds the event handlers that were bound by ajaxForm
$.fn.ajaxFormUnbind = function() {
	return this.unbind('submit.form-plugin click.form-plugin');
};

/**
 * formToArray() gathers form element data into an array of objects that can
 * be passed to any of the following ajax functions: $.get, $.post, or load.
 * Each object in the array has both a 'name' and 'value' property.  An example of
 * an array for a simple login form might be:
 *
 * [ { name: 'username', value: 'jresig' }, { name: 'password', value: 'secret' } ]
 *
 * It is this array that is passed to pre-submit callback functions provided to the
 * ajaxSubmit() and ajaxForm() methods.
 */
$.fn.formToArray = function(semantic) {
	var a = [];
	if (this.length === 0) {
		return a;
	}

	var form = this[0];
	var els = semantic ? form.getElementsByTagName('*') : form.elements;
	if (!els) {
		return a;
	}

	var i,j,n,v,el,max,jmax;
	for(i=0, max=els.length; i < max; i++) {
		el = els[i];
		n = el.name;
		if (!n) {
			continue;
		}

		if (semantic && form.clk && el.type == "image") {
			// handle image inputs on the fly when semantic == true
			if(!el.disabled && form.clk == el) {
				a.push({name: n, value: $(el).val()});
				a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
			}
			continue;
		}

		v = $.fieldValue(el, true);
		if (v && v.constructor == Array) {
			for(j=0, jmax=v.length; j < jmax; j++) {
				a.push({name: n, value: v[j]});
			}
		}
		else if (v !== null && typeof v != 'undefined') {
			a.push({name: n, value: v});
		}
	}

	if (!semantic && form.clk) {
		// input type=='image' are not found in elements array! handle it here
		var $input = $(form.clk), input = $input[0];
		n = input.name;
		if (n && !input.disabled && input.type == 'image') {
			a.push({name: n, value: $input.val()});
			a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
		}
	}
	return a;
};

/**
 * Serializes form data into a 'submittable' string. This method will return a string
 * in the format: name1=value1&amp;name2=value2
 */
$.fn.formSerialize = function(semantic) {
	//hand off to jQuery.param for proper encoding
	return $.param(this.formToArray(semantic));
};

/**
 * Serializes all field elements in the jQuery object into a query string.
 * This method will return a string in the format: name1=value1&amp;name2=value2
 */
$.fn.fieldSerialize = function(successful) {
	var a = [];
	this.each(function() {
		var n = this.name;
		if (!n) {
			return;
		}
		var v = $.fieldValue(this, successful);
		if (v && v.constructor == Array) {
			for (var i=0,max=v.length; i < max; i++) {
				a.push({name: n, value: v[i]});
			}
		}
		else if (v !== null && typeof v != 'undefined') {
			a.push({name: this.name, value: v});
		}
	});
	//hand off to jQuery.param for proper encoding
	return $.param(a);
};

/**
 * Returns the value(s) of the element in the matched set.  For example, consider the following form:
 *
 *  <form><fieldset>
 *	  <input name="A" type="text" />
 *	  <input name="A" type="text" />
 *	  <input name="B" type="checkbox" value="B1" />
 *	  <input name="B" type="checkbox" value="B2"/>
 *	  <input name="C" type="radio" value="C1" />
 *	  <input name="C" type="radio" value="C2" />
 *  </fieldset></form>
 *
 *  var v = $(':text').fieldValue();
 *  // if no values are entered into the text inputs
 *  v == ['','']
 *  // if values entered into the text inputs are 'foo' and 'bar'
 *  v == ['foo','bar']
 *
 *  var v = $(':checkbox').fieldValue();
 *  // if neither checkbox is checked
 *  v === undefined
 *  // if both checkboxes are checked
 *  v == ['B1', 'B2']
 *
 *  var v = $(':radio').fieldValue();
 *  // if neither radio is checked
 *  v === undefined
 *  // if first radio is checked
 *  v == ['C1']
 *
 * The successful argument controls whether or not the field element must be 'successful'
 * (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
 * The default value of the successful argument is true.  If this value is false the value(s)
 * for each element is returned.
 *
 * Note: This method *always* returns an array.  If no valid value can be determined the
 *	   array will be empty, otherwise it will contain one or more values.
 */
$.fn.fieldValue = function(successful) {
	for (var val=[], i=0, max=this.length; i < max; i++) {
		var el = this[i];
		var v = $.fieldValue(el, successful);
		if (v === null || typeof v == 'undefined' || (v.constructor == Array && !v.length)) {
			continue;
		}
		v.constructor == Array ? $.merge(val, v) : val.push(v);
	}
	return val;
};

/**
 * Returns the value of the field element.
 */
$.fieldValue = function(el, successful) {
	var n = el.name, t = el.type, tag = el.tagName.toLowerCase();
	if (successful === undefined) {
		successful = true;
	}

	if (successful && (!n || el.disabled || t == 'reset' || t == 'button' ||
		(t == 'checkbox' || t == 'radio') && !el.checked ||
		(t == 'submit' || t == 'image') && el.form && el.form.clk != el ||
		tag == 'select' && el.selectedIndex == -1)) {
			return null;
	}

	if (tag == 'select') {
		var index = el.selectedIndex;
		if (index < 0) {
			return null;
		}
		var a = [], ops = el.options;
		var one = (t == 'select-one');
		var max = (one ? index+1 : ops.length);
		for(var i=(one ? index : 0); i < max; i++) {
			var op = ops[i];
			if (op.selected) {
				var v = op.value;
				if (!v) { // extra pain for IE...
					v = (op.attributes && op.attributes['value'] && !(op.attributes['value'].specified)) ? op.text : op.value;
				}
				if (one) {
					return v;
				}
				a.push(v);
			}
		}
		return a;
	}
	return $(el).val();
};

/**
 * Clears the form data.  Takes the following actions on the form's input fields:
 *  - input text fields will have their 'value' property set to the empty string
 *  - select elements will have their 'selectedIndex' property set to -1
 *  - checkbox and radio inputs will have their 'checked' property set to false
 *  - inputs of type submit, button, reset, and hidden will *not* be effected
 *  - button elements will *not* be effected
 */
$.fn.clearForm = function() {
	return this.each(function() {
		$('input,select,textarea', this).clearFields();
	});
};

/**
 * Clears the selected form elements.
 */
$.fn.clearFields = $.fn.clearInputs = function() {
	return this.each(function() {
		var t = this.type, tag = this.tagName.toLowerCase();
		if (t == 'text' || t == 'password' || tag == 'textarea') {
			this.value = '';
		}
		else if (t == 'checkbox' || t == 'radio') {
			this.checked = false;
		}
		else if (tag == 'select') {
			this.selectedIndex = -1;
		}
	});
};

/**
 * Resets the form data.  Causes all form elements to be reset to their original value.
 */
$.fn.resetForm = function() {
	return this.each(function() {
		// guard against an input with the name of 'reset'
		// note that IE reports the reset function as an 'object'
		if (typeof this.reset == 'function' || (typeof this.reset == 'object' && !this.reset.nodeType)) {
			this.reset();
		}
	});
};

/**
 * Enables or disables any matching elements.
 */
$.fn.enable = function(b) {
	if (b === undefined) {
		b = true;
	}
	return this.each(function() {
		this.disabled = !b;
	});
};

/**
 * Checks/unchecks any matching checkboxes or radio buttons and
 * selects/deselects and matching option elements.
 */
$.fn.selected = function(select) {
	if (select === undefined) {
		select = true;
	}
	return this.each(function() {
		var t = this.type;
		if (t == 'checkbox' || t == 'radio') {
			this.checked = select;
		}
		else if (this.tagName.toLowerCase() == 'option') {
			var $sel = $(this).parent('select');
			if (select && $sel[0] && $sel[0].type == 'select-one') {
				// deselect all other options
				$sel.find('option').selected(false);
			}
			this.selected = select;
		}
	});
};

// helper fn for console logging
// set $.fn.ajaxSubmit.debug to true to enable debug logging
function log() {
	if ($.fn.ajaxSubmit.debug) {
		var msg = '[jquery.form] ' + Array.prototype.join.call(arguments,'');
		if (window.console && window.console.log) {
			window.console.log(msg);
		}
		else if (window.opera && window.opera.postError) {
			window.opera.postError(msg);
		}
	}
};

})(jQuery);

 /* imodal.js
-------------------------------------------------------------------------------------
 */

/*
 * Interspire Modal 1.0
 * (c) 2008 Interspire Pty. Ltd.
 *
 * Based on SimpleModal 1.1.1 - jQuery Plugin
 * http://www.ericmmartin.com/projects/simplemodal/
 * http://plugins.jquery.com/project/SimpleModal
 * http://code.google.com/p/simplemodal/
 *
 * Copyright (c) 2007 Eric Martin - http://ericmmartin.com
 *
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * Revision: $Id$
 *
 */
(function ($) {
	$.iModal = function(options) {
		return $.iModal.modal.init(options);
	};

	$.modal = function() {
	};

	$.modal.close = function () {
		return $.iModal.modal.close(true);
	};

	$.iModal.close = function () {
		return $.iModal.modal.close(true);
	};

	$.fn.iModal = function (options) {
		options = $.extend({}, {
			type: 'inline',
			inline: $(this).html()
		}, options);
		return $.iModal.modal.init(options);
	};

	$.iModal.defaults = {
		overlay: 40,
		overlayCss: {},
		containerCss: {},
		close: true,
		closeTitle: 'Close',
		closeTxt: false,
		onOpen: null,
		onShow: null,
		onClose: null,
		onBeforeClose: null,
		onAjaxError: null,
		type: 'string',
		width: '630',
		height: 'auto',
		buttons: '',
		title: '',
		method: 'get',
		top: '15%',
		scrollable: true
	};

	$.iModal.modal = {
		options: null,
		init: function(options) {
			// Can\'t have more than one modal window open at a time
			if($('#ModalContentContainer').length > 0) {
				return this;
			}
			this.options = $.extend({}, $.iModal.defaults, options);

			if(this.options.type == 'inline') {
				this.options.data = $(this.options.inline).html();
				$(this.options.inline).html('');
			}

			this.generateModal();
			return this;
		},

		checkHeight: function() {
			var winHeight,
					modalHeight,
					contentHeight;

			// make sure to calculate heights after all content loaded
			setTimeout(function () {
				winHeight = $(window).height();
				modalHeight = $("#ModalContentContainer").height();
				contentHeight = $("#ModalContent").height() || $.iModal.modal.options.contentHeight;

				if ((modalHeight > winHeight * .85) ||
					(($.iModal.modal.options.scrollable) && ((winHeight * .85) < $.iModal.modal.options.height))) {
					var diff = modalHeight - contentHeight;

					$("#ModalContent").css({
						overflow: 'auto',
						height: ((modalHeight - diff) * .75) + 'px'
					});

					$("#ModalContainer").css({
						height: (winHeight * .80) + 'px',
						bottom: 0,
						'overflow-y': 'scroll'
					});

					$(".ModalButtonRow").css('padding-right', '30px');
				}
			}, 1)
		},

		ajaxError: function(xhr, status, error)
		{
			this.hideLoader();
			if ($.isFunction(this.options.onAjaxError)) {
				this.options.onAjaxError.apply(this, [xhr, status, error]);
			}
		},

		createFrame: function(container, html)
		{
	    	var frame = $('<iframe />').width('100%').attr('frameBorder', '0').appendTo(container)[0];

			// Grab the frame's document object
	    	var frameDoc = frame.contentWindow ? frame.contentWindow.document : frame.contentDocument;
	    	frameDoc.open(); frameDoc.write(html); frameDoc.close();

			// Auto adjust the iframe's height to the height of the content
			$(frameDoc).ready(function(){
				var height = frameDoc.body.scrollHeight + 20;

				$(frame).height(height);
			});
		},

		displayModal: function(data)
		{
			if (typeof data == 'object' && typeof data.imodal == 'string') {
				// this allows imodal to recognise an object (json) response so long as the response contains an imodal
				// string property
				data = data.imodal;
			}

			this.hideLoader();
			modalContent = '';
			if(!$.browser.msie || $.browser.version >= 7) {
				modalContent = '<div id="ModalTopLeftCorner"></div><div id="ModalTopBorder"></div><div id="ModalTopRightCorner"></div><div id="ModalLeftBorder"></div><div id="ModalRightBorder"></div><div id="ModalBottomLeftCorner"></div><div id="ModalBottomRightCorner"></div><div id="ModalBottomBorder"></div>';
			}
			if(data.indexOf('ModalTitle')>0 && data.indexOf('ModalContent')>0){
				modalContent += '<div id="ModalContentContainer">'+data+'</div>';
			}else{
				buttons = '';
				if(this.options.buttons) {
					buttons = '<div class="ModalButtonRow">'+this.options.buttons+'</div>';
				}
				modalContent += '<div id="ModalContentContainer"><div class="ModalTitle">'+this.options.title+'</div><div class="ModalContent">'+data+ '</div>'+buttons+'</div>';
			}

			cssProperties = {
				position: 'fixed',
				zIndex: 3100,
				width: this.options.width+'px',
				height: this.options.height+'px'
			};

			if($.browser.msie && $.browser.version < 7) {
				cssProperties.position = 'absolute';
			}

			// If direction is rtl then we need to flip our margin positions
			if ($.browser.msie && $.browser.version <= 7 && $('body').css('direction') == 'rtl') {
				cssProperties.marginRight = (this.options.width/2)+'px';
			} else {
				cssProperties.marginLeft = '-'+(this.options.width/2)+'px';
			}

			cssProperties.top = this.options.top;

			var stupidity = $('<div>')
				.attr('id', 'ModalContainer')
				.addClass('modalContainer')
				.css(cssProperties)
				.hide()
				.appendTo('body')
				.html('<div class="modalData">'+modalContent+'</div>');


            if(this.options.className) {
                stupidity.addClass(this.options.className);
            }
			if($('#ModalContainer').find('.ModalButtonRow, #ModalButtonRow').length > 0) {
				$('#ModalContainer').addClass('ModalContentWithButtons');
			}
			if(this.options.close) {
				modal = this;
				$('<a/>')
					.addClass('modalClose')
					.attr('title', this.options.closeTitle)
					.appendTo('#ModalContainer')
					.click(function(e) {
						e.preventDefault();
						modal.close();
					})
				;
				$(document).bind('keypress', function(e) {
					if(e.keyCode == 27) {
						$('#ModalContainer .modalClose').click();
					}
				});

				if (this.options.closeTxt) {
					$('#ModalContainer .modalClose')
						.html(this.options.closeTitle)
						.css('backgroundPosition', '65px 0')
						.css('lineHeight', '15px')
						.css('textDecoration', 'none')
						.css('width', '60px')
						.css('paddingRight', '20px')
						.css('textAlign', 'right')
					;
					$('#ModalContainer .ModalTitle')
						.css('borderBottom', 'medium none')
						.css('backgroundColor', '#fff')
					;
					$('#ModalContainer #ModalTopBorder').css('backgroundImage', 'none');
				}
			}

			if($.isFunction(this.options.onOpen)) {
				this.options.onOpen.apply(this);
			}
			else {
				$('#ModalContainer').show();
				if($.isFunction(this.options.onShow)) {
					this.options.onShow.apply(this);
				}
			}

			if (this.options.scrollable) {
				var container = $("#ModalContent");
				container.css('overflow', 'auto');
				$(".ModalButtonRow").css('padding-top', '10px');

				this.checkHeight();
			}

			// make sure we can see the bottom part of the modal
			// if the window size is too short

			$(window)
				.resize(this.checkHeight)
				.scroll(this.checkHeight)
			;
		},

		showLoader: function()
		{
			$('<div/>')
				.attr('id', 'ModalLoadingIndicator')
				.appendTo('body');
			;
		},

		showOverlayLoader: function(){
			$('<div/>')
				.attr('id', 'ModalOverlay')
				.addClass('modalOverlay')
				.css({
					opacity: 40 / 100,
					height: '100%',
					width: '100%',
					position: 'fixed',
					left: 0,
					top: 0,
					zIndex: 3000
				})
				.appendTo('body')
			;

			$('<div/>')
				.attr('id', 'ModalLoadingIndicator')
				.appendTo('body');
			;
		},

		hideOverlayLoader: function(){
			$('#ModalLoadingIndicator').remove();
			$('.modalOverlay').remove();
		},

		hideLoader: function()
		{
			$('#ModalLoadingIndicator').remove();
		},

		generateModal: function()
		{
			$('<div/>')
				.attr('id', 'ModalOverlay')
				.addClass('modalOverlay')
				.css({
					opacity: this.options.overlay / 100,
					height: '100%',
					width: '100%',
					position: 'fixed',
					left: 0,
					top: 0,
					zIndex: 3000
				})
				.appendTo('body')
			;

			if($.browser.msie && $.browser.version < 7) {
				wHeight = $(document.body).height()+'px';
				wWidth = $(document.body).width()+'px';
				$('#ModalOverlay').css({
					position: 'absolute',
					height: wHeight,
					width: wWidth
				});
				$('<iframe/>')
					.attr('src', 'javascript:false;')
					.attr('id', 'ModalTempiFrame')
					.css({opacity: 0, position: 'absolute', width: wWidth, height: wHeight, zIndex: 1000, top: 0, left: 0})
					.appendTo('body')
				;
			}

			this.showLoader();
			if(this.options.type == 'ajax') {
				modal = this;
				data = {};
				if(this.options.urlData != undefined) {
					data = this.options.urlData;
				}
				var method = 'get';
				if (this.options.method) {
					method = this.options.method;
				}
				$.ajax({
					url: this.options.url,
					type: method,
					success: function(data) {
						modal.displayModal(data);
					},
					error: function(xhr, status, error) {
						modal.ajaxError(xhr, status, error);
					},
					data: data,
					type: this.options.method,
					global: false
				});
			}
			else if(this.options.type == 'iframe'){
				modal = this;
				data = {};
				if(this.options.urlData != undefined) {
					data = this.options.urlData;
				}
				var method = 'get';
				if (this.options.method) {
					method = this.options.method;
				}
				$.ajax({
					url: this.options.url,
					type: method,
					success: function(data) {
						modal.displayModal('');
						var f = modal.createFrame($('#ModalContentContainer .ModalContent'), data);
					},
					error: function(xhr, status, error) {
						modal.ajaxError(xhr, status, error);
					},
					data: data,
					type: this.options.method,
					global: false
				});
			}
			else {
				this.displayModal(this.options.data);
			}
		},

		close: function(external)
		{
			if (!this.options) {
				return;
			}

			if($.isFunction(this.options.onBeforeClose)) {
				if (this.options.onBeforeClose.apply(this, []) === false) {
					// prevent modal from closing if onBeforeClose returns (bool)false
					return;
				}
				this.options.onBeforeClose = null; // ISC-3837
			}

			if(this.options.type == 'inline') {
				$(this.options.inline).html(this.options.data);
			}

			if($.isFunction(this.options.onClose) && !external) {
				this.options.onClose.apply(this);
			}
			else {
				$('#ModalContainer').remove();
			}

			$('#ModalLoadingIndicator').remove();
			$('#ModalOverlay').remove();
			$('#ModalTempiFrame').remove();
		}
	};
})(jQuery);


function ModalBox(title, content){
	var str = '<div class="ModalTitle">'+title+'</div><div class="ModalContent">'+content+ '</div><div class="ModalButtonRow"></div>';
	$.iModal({ data: str });
}

function ModalBoxInline(title, content, width, withCloseButton){
	if(typeof(width) == 'undefined'){
		var width = 800;
	}
	if(typeof(withCloseButton) == 'undefined'){
		var withCloseButton = false;
	}
	if(withCloseButton){
		var str = '<div class="ModalTitle">'+title+'</div><div class="ModalContent">'+$(content).html()+ '</div><div class="ModalButtonRow"></div>';
	}else{
		var str = '<div class="ModalTitle">'+title+'</div><div class="ModalContent">'+$(content).html()+ '</div><div class="ModalButtonRow"><input type="button" class="CloseButton FormButton" value="Close Window" onclick="$.iModal.close();" /></div>';
	}
	$.iModal({ 'data': str, 'width':width });
}


 /* menudrop.js
-------------------------------------------------------------------------------------
 */

// JavaScript Document
$(document).ready(function() {
	if(document.all) {
		$('#Menu li.HasSubMenu').hover(function() {
			$(this).addClass('over');
			return false;
		},
		function() {
			$(this).removeClass('over');
		});
	}
});


 /* iselector.js
-------------------------------------------------------------------------------------
 */

/*
	ISSelectReplacement
*/
if(typeof(ISSelectReplacement) == 'undefined') {
	var ISSelectReplacement = {
		init: function()
		{
			if(window.addEventListener)
				window.addEventListener('load', ISSelectReplacement.on_load, false);
			else
				window.attachEvent('onload', ISSelectReplacement.on_load);
		},

		on_load: function()
		{
			var selects = document.getElementsByTagName('SELECT');
			if(!selects) return false;

			for(var i = 0; i < selects.length; i++)
			{
				var select = selects[i];
				if (!select.multiple  // Only multiple selects are supported
					|| select.className.indexOf('ISSelectReplacement') == -1
					|| select.className.indexOf('ISSelectAlreadyReplaced') != -1  // Don't replace already replaced selects
					|| select.className.indexOf('ISSelectReplacementDeferred') != -1) { // Don't replace deferred selects just now
					continue;
				}

				ISSelectReplacement.replace_select(selects[i]);
			}
		},
		replace_select: function(element)
		{
			var name = element.name;

			element.style.visibility = 'hidden';

			// Start whipping up our replacement
			var replacement = document.createElement('DIV');
			replacement.className = "ISSelect "+element.className;
			replacement.className += " ISSelectAlreadyReplaced";
			var hideSelectReplacement = false;
			// If the offsetHeight is 0, this select is hidden
			if(element.offsetHeight == 0)
			{
				var clone = element.cloneNode(true);
				clone.style.position = 'absolute';
				clone.style.left = '-10000px';
				clone.style.top = '-10000px';
				clone.style.display = 'block';
				document.body.appendChild(clone);
				offset_height = clone.offsetHeight+"px";
				offset_width = clone.offsetWidth+"px";
				clone.parentNode.removeChild(clone);
				if(element.style.display && element.style.display == 'none') {
					var hideSelectReplacement = true;
				}
			}
			else
			{
				offset_height = element.offsetHeight+"px";
				offset_width = element.offsetWidth+"px";
			}
			var style_offset_width = ISSelectReplacement.get_prop(element, 'width');
			if(style_offset_width && style_offset_width != "auto") offset_width = style_offset_width;
			var style_offset_height = ISSelectReplacement.get_prop(element, 'height');
			if(style_offset_height && style_offset_height != "auto") offset_height = style_offset_height;
			replacement.style.height = offset_height;

			if(parseInt(offset_width) < 200) {
				offset_width = '200px';
			}
			replacement.style.width = offset_width;
			if(element.id)
			{
				replacement.id = element.id;
				element.id += "_old";
			}
			if(hideSelectReplacement) {
				replacement.style.display = 'none';
			}
			replacement.select = element;
			replacement.options = element.options;
			replacement.selectedIndex = element.selectedIndex;
			this.select = element;
			this.replacement = replacement;

			if(element.onchange)
			{
				replacement.onclick = function()
				{
					$(this.select).trigger('change');
				}
			}

			if(element.ondblclick)
			{
				replacement.ondblclick = function()
				{
					$(this.select).trigger('dblclick');
				}
			}

			var innerhtml = '<ul>';

			// Loop de loop
			for(var i = 0; i < element.childNodes.length; i++)
			{
				if(!element.childNodes[i].tagName || element.nodeType == 3) continue;
				if(element.childNodes[i].tagName == "OPTGROUP")
				{
					innerhtml += ISSelectReplacement.add_group(element, element.childNodes[i], i);
				}
				else if(element.childNodes[i].tagName == "OPTION")
				{
					innerhtml += ISSelectReplacement.add_option(element, element.childNodes[i], i);
				}
			}

			innerhtml += '</ul>';
			replacement.innerHTML = innerhtml;

			element.parentNode.insertBefore(replacement, element);
			element.style.display = 'none';
		},

		get_prop: function(element, prop)
		{
			if(element.currentStyle)
			{
				return element.currentStyle[prop];
			}
			else if(document.defaultView && document.defaultView.getComputedStyle)
			{
				prop = prop.replace(/([A-Z])/g,"-$1");
				prop = prop.toLowerCase();
				return document.defaultView.getComputedStyle(element, "").getPropertyValue(prop);
			}
		},

		add_group: function(select, group, group_id)
		{
			var extraClass = '';
			if(group.className) {
				extraClass = group.className;
			}
			group_html = '<li class="ISSelectGroup '+extraClass+'">' +
				'<div>'+group.label+'</div>';

			if(group.childNodes)
			{
				group_html += '<ul>';
				for(var i = 0; i < group.childNodes.length; i++)
				{
					if(!group.childNodes[i].tagName || group.childNodes[i].nodeType == 3) continue;
					group_html += ISSelectReplacement.add_option(select, group.childNodes[i], [group_id, i]);
				}
				group_html += '</ul>';
			}

			group_html += '</li>';
			return group_html;
		},

		add_option: function(select, option, id)
		{
			var value, element_class, checked = '';
			if(option.selected)
			{
				element_class = "SelectedRow";
				checked = 'checked="checked"'
			}
			else {
				element_class = '';
			}

			if(option.className) {
				element_class += ' '+option.className;
			}

			var label = option.innerHTML;
			var whitespace = label.match(/^\s*(&nbsp;)*/);
			if(whitespace[0])
			{
				label = label.replace(/^\s*(&nbsp;)*/, '');
			}
			var disabled = '';
			if(this.select.disabled) {
				var disabled = ' disabled="disabled"';
			}

			var extraKey = '';
			var extra = '';
			if(option.className && option.className.indexOf('forceKey') != -1) {
				var start = option.className.indexOf('forceKey');
				var end = option.className.indexOf(' ', start+1);
				if(end == -1) {
					var end = option.className.length;
				}
				var extraKey = option.className.substring(start+8, end);
				var extra = '[]';
			}
            var idString = "ISSelect"+select.name.replace('[]', '')+'_'+option.value;
			html = '<li id="'+idString+'" class="'+element_class+'" onselectstart="return false;" style="-moz-user-select: none;" onmouseover="ISSelectReplacement.on_hover(this, \''+id+'\', \'over\');"' +
				'onmouseout=\"ISSelectReplacement.on_hover(this, \''+id+'\', \'out\');" onclick="ISSelectReplacement.on_click(this, \''+id+'\');">' + whitespace[0];
			if($(option).hasClass('freeform')) {
				html +=	'<input id="'+idString+'_input" type="textbox" name="ISSelectReplacement_'+select.name+'['+extraKey+']'+extra+'" value="' + option.value + '" onclick="ISSelectReplacement.on_click(this, \''+id+'\');" />';
			}
			else {
				html += '<input id="'+idString+'_input" type="checkbox" name="ISSelectReplacement_'+select.name+'['+extraKey+']'+extra+'" value="'+option.value+'" '+checked+disabled+'" onclick="ISSelectReplacement.on_click(this, \''+id+'\');" /><label for="'+idString+'_input" onclick="ISSelectReplacement.on_click(this, \''+id+'\');">' + label + '</label>';
			}
			html += '</li>';
			return html;
		},

		on_hover: function(element, id, action)
		{
			var id = id.split(',');

			// Selected an option group child
			if(id.length == 2)
			{
				var replacement = element.parentNode.parentNode.parentNode.parentNode.nextSibling;
				var option = replacement.childNodes[id[0]].childNodes[id[1]];
			}
			else
			{
				var replacement = element.parentNode.parentNode.nextSibling;
				var option = replacement.childNodes[id[0]];
			}

			if(action == 'out') {
				$(element).removeClass('ISSelectOptionHover');
				$(option).trigger('mouseout');
			}
			else {
				if(!$(element).hasClass('SelectedRow')) {
					$(element).addClass('ISSelectOptionHover');
				}
				$(option).trigger('mouseover');
			}
		},

		scrollToItem: function(select_name, value, group)
		{
			var item = 'ISSelect'+select_name.replace('[]', '')+'_'+value;
			if(!document.getElementById(item))
				return;

			var obj = document.getElementById(item);
			var top = obj.offsetTop-4;
			if(typeof(group) != 'undefined') {
				top -= 20;
			}

			while(obj && obj.tagName != 'DIV')
			{
				obj = obj.parentNode;
				if(obj && obj.tagName == 'DIV') {
					obj.scrollTop = top;
					break;
				}
			}
		},

		on_click: function(element, id)
		{
			if(element.dblclicktimeout)
			{
				return false;
			}
			if(element.tagName == "INPUT" || element.tagName == "LABEL")
			{
				var checkbox = element;
				if(checkbox.disabled) {
					return false;
				}
				var element = element.parentNode;
			}
			else
			{
				var checkbox = element.getElementsByTagName('input')[0];
				if(checkbox.disabled) {
					return false;
				}
				checkbox.checked = !checkbox.checked;
			}

			element.dblclicktimeout = setTimeout(function() { element.dblclicktimeout = ''; }, 250);

			var id = id.split(','); // The index of the element we clicked

			// Selected an option group child
			if(id.length == 2)
			{
				var replacement = element.parentNode.parentNode.parentNode.parentNode.nextSibling;
				var option = replacement.childNodes[id[0]].childNodes[id[1]];
			}
			else
			{
				var replacement = element.parentNode.parentNode.nextSibling;
				var option = replacement.childNodes[id[0]];
			}

			option.selected = checkbox.checked;
			$(element).parents('div')[0].selectedIndex = replacement.selectedIndex;
			$(option).parents('select').trigger('change');
			$(option).triggerHandler('click');

			if (checkbox.checked) {
				$(element).addClass('SelectedRow');
			}
			else {
				$(element).removeClass('SelectedRow');
			}
		}
	};

	ISSelectReplacement.init();
}


 /* matchMedia.js
-------------------------------------------------------------------------------------
 */

/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license */

window.matchMedia || (window.matchMedia = function() {
    "use strict";

    // For browsers that support matchMedium api such as IE 9 and webkit
    var styleMedia = (window.styleMedia || window.media);

    // For those that don't support matchMedium
    if (!styleMedia) {
        var style       = document.createElement('style'),
            script      = document.getElementsByTagName('script')[0],
            info        = null;

        style.type  = 'text/css';
        style.id    = 'matchmediajs-test';

        script.parentNode.insertBefore(style, script);

        // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
        info = ('getComputedStyle' in window) && window.getComputedStyle(style, null) || style.currentStyle;

        styleMedia = {
            matchMedium: function(media) {
                var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

                // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
                if (style.styleSheet) {
                    style.styleSheet.cssText = text;
                } else {
                    style.textContent = text;
                }

                // Test if media query is true or false
                return info.width === '1px';
            }
        };
    }

    return function(media) {
        return {
            matches: styleMedia.matchMedium(media || 'all'),
            media: media || 'all'
        };
    };
}());

 /* jquery.autobox.js
-------------------------------------------------------------------------------------
 */

/*
* Vekz
* http://www.callmekev.com/jquery.autobox.js
* autobox plugin -
* Used on text inputs with default values. Clears the default value on focus.
* Restores the default value on blur if empty or the same
* overlays text inputs for password boxes and swaps them on focus
* use straight CSS for styling the focus of the text input
*
*/

jQuery.fn.autobox = function(options){
  var settings = $.extend({defaultClass : 'default', filledClass : 'filled'}, options);

  return this.each(function (){
    var textInput = $(this);
    var defaultVal = textInput.val();
    textInput.addClass(settings.defaultClass);

    if(textInput.attr('type') == 'password'){
      var newInput = $('<input type="text" class="'+settings.defaultClass+'"value="'+textInput.val()+'" />');
      newInput.css({
        'position' : 'absolute',
        'z-index' : 10,
        'top' : textInput.position().top+'px',
        'left' : textInput.position().left+'px'
      });

      $(window).resize(function(){
        newInput.css({
          'top' : textInput.position().top+'px',
          'left' : textInput.position().left+'px'
        });
      });

      newInput.bind('focus', function(){
        var $this = $(this);
        $this.hide();
        textInput.show();
        textInput.css({'visibility' : 'visible'});
        textInput.focus();
      });

      textInput.before(newInput);
    }

    textInput.bind('focus', function(){
      var $this = $(this);
      $this.removeClass(settings.defaultClass);
      $this.addClass(settings.filledClass);
      if($this.val() == defaultVal){
        $this.val('');
      }
    });

    textInput.bind('blur', function(){
      var $this = $(this);
      if($this.val() == ''){
        $this.val(defaultVal);
        $this.addClass(settings.defaultClass);
        $this.removeClass(settings.filledClass);
        if($this.attr('type') == 'password'){
          newInput.show();
        }
      }else{
        $this.addClass(settings.filledClass);
      }
    });
  });
};



 /* init.js
-------------------------------------------------------------------------------------
 */


/*
var JQZOOM_OPTIONS = {
	zoomType: 'innerzoom',
	preloadImages: false,
	title: false,
	position: ""
};
*/
$(document).ready(function() {

	// Clear Search Field
	$('.autobox').autobox();

	$('#prodAccordion .prodAccordionContent').hide();
	$('#prodAccordion .ProductDescription').addClass('current');
	$('#prodAccordion .ProductDescriptionContainer').show();
	$('#prodAccordion .Block .subtitle').click(function() {

		$(this).parent().toggleClass('current');
		$(this).css('outline','none').siblings('div').slideToggle('slow');


		return false;
	});


	// Horizontal Category List Dropdowns (non-flyout only)
	if(document.all) {
		$('#SideCategoryList li').hover(function() {
			$(this).addClass('over');
			return false;
		},
		function() {
			$(this).removeClass('over');
		});
	}

	//Fix IE7 z-index issues
	if ($.browser.msie && parseInt($.browser.version) == 7) {
		var zIndexNumber = 1000;
		$('#Menu ul li').each(function() { /* Pages menu */
			$(this).css('z-index', zIndexNumber);
			zIndexNumber -= 10;
		});
		$('#HeaderLower ul li').each(function() { /* Horizontal category menu */
			$(this).css('z-index', zIndexNumber);
			zIndexNumber -= 10;
		});
	}
	//
	//Fix IE6 z-index issues
	if ($.browser.msie && parseInt($.browser.version) == 6) {
		var zIndexNumber = 1000;
		$('#Menu ul li').each(function() { /* Pages menu */
			$(this).css('z-index', zIndexNumber);
			zIndexNumber -= 10;
		});
		$('#HeaderLower ul li').each(function() { /* Horizontal category menu */
			$(this).css('z-index', zIndexNumber);
			zIndexNumber -= 10;
		});
	}

	$('#change-currency').click(function(e) {
		e.stopPropagation();
		$('#currency-chooser .currencies').toggle();
		$(window).one('click', function() { $('#currency-chooser .currencies').hide(); });
	});
});




 /* jquery.uniform.min.js
-------------------------------------------------------------------------------------
 */

/*

Uniform v2.0.0
Copyright Ã‚Â© 2009 Josh Pyles / Pixelmatrix Design LLC
http://pixelmatrixdesign.com

Requires jQuery 1.3 or newer

Much thanks to Thomas Reynolds and Buck Wilson for their help and advice on
this.

Disabling text selection is made possible by Mathias Bynens
<http://mathiasbynens.be/> and his noSelect plugin.
<https://github.com/mathiasbynens/jquery-noselect>, which is embedded.

Also, thanks to David Kaneda and Eugene Bond for their contributions to the
plugin.

Tyler Akins has also rewritten chunks of the plugin, helped close many issues,
and ensured version 2 got out the door.

License:
MIT License - http://www.opensource.org/licenses/mit-license.php

Enjoy!

*/
/*global jQuery, window, document*/


(function ($, undef) {
	"use strict";

	/**
	 * Use .prop() if jQuery supports it, otherwise fall back to .attr()
	 *
	 * @param jQuery $el jQuery'd element on which we're calling attr/prop
	 * @param ... All other parameters are passed to jQuery's function
	 * @return The result from jQuery
	 */
	function attrOrProp($el) {
		var args = Array.prototype.slice.call(arguments, 1);

		if ($el.prop) {
			// jQuery 1.6+
			return $el.prop.apply($el, args);
		}

		// jQuery 1.5 and below
		return $el.attr.apply($el, args);
	}

	/**
	 * For backwards compatibility with older jQuery libraries, only bind
	 * one thing at a time.  Also, this function adds our namespace to
	 * events in one consistent location, shrinking the minified code.
	 *
	 * The properties on the events object are the names of the events
	 * that we are supposed to add to.  It can be a space separated list.
	 * The namespace will be added automatically.
	 *
	 * @param jQuery $el
	 * @param Object options Uniform options for this element
	 * @param Object events Events to bind, properties are event names
	 */
	function bindMany($el, options, events) {
		var name, namespaced;

		for (name in events) {
			if (events.hasOwnProperty(name)) {
				namespaced = name.replace(/ |$/g, options.eventNamespace);
				$el.bind(name, events[name]);
			}
		}
	}

	/**
	 * Bind the hover, active, focus, and blur UI updates
	 *
	 * @param jQuery $el Original element
	 * @param jQuery $target Target for the events (our div/span)
	 * @param Object options Uniform options for the element $target
	 */
	function bindUi($el, $target, options) {
		bindMany($el, options, {
			focus: function () {
				$target.addClass(options.focusClass);
			},
			blur: function () {
				$target.removeClass(options.focusClass);
				$target.removeClass(options.activeClass);
			},
			mouseenter: function () {
				$target.addClass(options.hoverClass);
			},
			mouseleave: function () {
				$target.removeClass(options.hoverClass);
				$target.removeClass(options.activeClass);
			},
			"mousedown touchbegin": function () {
				if (!$el.is(":disabled")) {
					$target.addClass(options.activeClass);
				}
			},
			"mouseup touchend": function () {
				$target.removeClass(options.activeClass);
			}
		});
	}

	/**
	 * Remove the hover, focus, active classes.
	 *
	 * @param jQuery $el Element with classes
	 * @param Object options Uniform options for the element
	 */
	function classClearStandard($el, options) {
		$el.removeClass(options.hoverClass + " " + options.focusClass + " " + options.activeClass);
	}

	/**
	 * Add or remove a class, depending on if it's "enabled"
	 *
	 * @param jQuery $el Element that has the class added/removed
	 * @param String className Class or classes to add/remove
	 * @param Boolean enabled True to add the class, false to remove
	 */
	function classUpdate($el, className, enabled) {
		if (enabled) {
			$el.addClass(className);
		} else {
			$el.removeClass(className);
		}
	}

	/**
	 * Updating the "checked" property can be a little tricky.  This
	 * changed in jQuery 1.6 and now we can pass booleans to .prop().
	 * Prior to that, one either adds an attribute ("checked=checked") or
	 * removes the attribute.
	 *
	 * @param jQuery $tag Our Uniform span/div
	 * @param jQuery $el Original form element
	 * @param Object options Uniform options for this element
	 */
	function classUpdateChecked($tag, $el, options) {
		var c = "checked",
			isChecked = $el.is(":" + c);

		if ($el.prop) {
			// jQuery 1.6+
			$el.prop(c, isChecked);
		} else {
			// jQuery 1.5 and below
			if (isChecked) {
				$el.attr(c, c);
			} else {
				$el.removeAttr(c);
			}
		}

		classUpdate($tag, options.checkedClass, isChecked);
	}

	/**
	 * Set or remove the "disabled" class for disabled elements, based on
	 * if the
	 *
	 * @param jQuery $tag Our Uniform span/div
	 * @param jQuery $el Original form element
	 * @param Object options Uniform options for this element
	 */
	function classUpdateDisabled($tag, $el, options) {
		classUpdate($tag, options.disabledClass, $el.is(":disabled"));
	}

	/**
	 * Wrap an element inside of a container or put the container next
	 * to the element.  See the code for examples of the different methods.
	 *
	 * Returns the container that was added to the HTML.
	 *
	 * @param jQuery $el Element to wrap
	 * @param jQuery $container Add this new container around/near $el
	 * @param String method One of "after", "before" or "wrap"
	 * @return $container after it has been cloned for adding to $el
	 */
	function divSpanWrap($el, $container, method) {
		switch (method) {
		case "after":
			// Result:  <element /> <container />
			$el.after($container);
			return $el.next();
		case "before":
			// Result:  <container /> <element />
			$el.before($container);
			return $el.prev();
		case "wrap":
			// Result:  <container> <element /> </container>
			$el.wrap($container);
			return $el.parent();
		}

		return null;
	}

	/**
	 * Create a div/span combo for uniforming an element
	 *
	 * @param jQuery $el Element to wrap
	 * @param Object options Options for the element, set by the user
	 * @param Object divSpanConfig Options for how we wrap the div/span
	 * @return Object Contains the div and span as properties
	 */
	function divSpan($el, options, divSpanConfig) {
		var $div, $span, id;

		if (!divSpanConfig) {
			divSpanConfig = {};
		}

		divSpanConfig = $.extend({
			bind: {},
			divClass: null,
			divWrap: "wrap",
			spanClass: null,
			spanHtml: null,
			spanWrap: "wrap"
		}, divSpanConfig);

		$div = $('<div />');
		$span = $('<span />');

		// Automatically hide this div/span if the element is hidden.
		// Do not hide if the element is hidden because a parent is hidden.
		if (options.autoHide && $el.is(':hidden') && $el.css('display') === 'none') {
			$div.hide();
		}

		if (divSpanConfig.divClass) {
			$div.addClass(divSpanConfig.divClass);
		}

		if (divSpanConfig.spanClass) {
			$span.addClass(divSpanConfig.spanClass);
		}

		id = attrOrProp($el, 'id');

		if (options.useID && id) {
			attrOrProp($div, 'id', options.idPrefix + '-' + id);
		}

		if (divSpanConfig.spanHtml) {
			$span.html(divSpanConfig.spanHtml);
		}

		$div = divSpanWrap($el, $div, divSpanConfig.divWrap);
		$span = divSpanWrap($el, $span, divSpanConfig.spanWrap);
		classUpdateDisabled($div, $el, options);
		return {
			div: $div,
			span: $span
		};
	}


	/**
	 * Test if high contrast mode is enabled.
	 *
	 * In high contrast mode, background images can not be set and
	 * they are always returned as 'none'.
	 *
	 * @return boolean True if in high contrast mode
	 */
	function highContrast() {
		var c, $div, el, rgb;

		// High contrast mode deals with white and black
		rgb = 'rgb(120,2,153)';
		$div = $('<div style="width:0;height:0;color:' + rgb + '">');
		$('body').append($div);
		el = $div.get(0);

		// $div.css() will get the style definition, not
		// the actually displaying style
		if (window.getComputedStyle) {
			c = window.getComputedStyle(el, '').color;
		} else {
			c = (el.currentStyle || el.style || {}).color;
		}

		$div.remove();
		return c.replace(/ /g, '') !== rgb;
	}


	/**
	 * Change text into safe HTML
	 *
	 * @param String text
	 * @return String HTML version
	 */
	function htmlify(text) {
		if (!text) {
			return "";
		}

		return $('<span />').text(text).html();
	}

	/**
	 * Test if the element is a multiselect
	 *
	 * @param jQuery $el Element
	 * @return boolean true/false
	 */
	function isMultiselect($el) {
		var elSize;

		if ($el[0].multiple) {
			return true;
		}

		elSize = attrOrProp($el, "size");

		if (!elSize || elSize <= 1) {
			return false;
		}

		return true;
	}

	/**
	 * Meaningless utility function.  Used mostly for improving minification.
	 *
	 * @return false
	 */
	function returnFalse() {
		return false;
	}

	/**
	 * noSelect plugin, very slightly modified
	 * http://mths.be/noselect v1.0.3
	 *
	 * @param jQuery $elem Element that we don't want to select
	 * @param Object options Uniform options for the element
	 */
	function noSelect($elem, options) {
		var none = 'none';
		bindMany($elem, options, {
			'selectstart dragstart mousedown': returnFalse
		});

		$elem.css({
			MozUserSelect: none,
			msUserSelect: none,
			webkitUserSelect: none,
			userSelect: none
		});
	}

	/**
	 * Updates the filename tag based on the value of the real input
	 * element.
	 *
	 * @param jQuery $el Actual form element
	 * @param jQuery $filenameTag Span/div to update
	 * @param Object options Uniform options for this element
	 */
	function setFilename($el, $filenameTag, options) {
		var filename = $el.val();

		if (filename === "") {
			filename = options.fileDefaultHtml;
		} else {
			filename = filename.split(/[\/\\]+/);
			filename = filename[(filename.length - 1)];
		}

		$filenameTag.text(filename);
	}


	/**
	 * Function from jQuery to swap some CSS values, run a callback,
	 * then restore the CSS.  Modified to pass JSLint and handle undefined
	 * values with 'use strict'.
	 *
	 * @param jQuery $el Element
	 * @param object newCss CSS values to swap out
	 * @param Function callback Function to run
	 */
	function swap($el, newCss, callback) {
		var restore, item;

		restore = [];

		$el.each(function () {
			var name;

			for (name in newCss) {
				if (Object.prototype.hasOwnProperty.call(newCss, name)) {
					restore.push({
						el: this,
						name: name,
						old: this.style[name]
					});

					this.style[name] = newCss[name];
				}
			}
		});

		callback();

		while (restore.length) {
			item = restore.pop();
			item.el.style[item.name] = item.old;
		}
	}


	/**
	 * The browser doesn't provide sizes of elements that are not visible.
	 * This will clone an element and add it to the DOM for calculations.
	 *
	 * @param jQuery $el
	 * @param String method
	 */
	function sizingInvisible($el, callback) {
		swap($el.parents().andSelf().not(':visible'), {
			visibility: "hidden",
			display: "block",
			position: "absolute"
		}, callback);
	}


	/**
	 * Standard way to unwrap the div/span combination from an element
	 *
	 * @param jQuery $el Element that we wish to preserve
	 * @param Object options Uniform options for the element
	 * @return Function This generated function will perform the given work
	 */
	function unwrapUnwrapUnbindFunction($el, options) {
		return function () {
			$el.unwrap().unwrap().unbind(options.eventNamespace);
		};
	}

	var allowStyling = true,  // False if IE6 or other unsupported browsers
		highContrastTest = false,  // Was the high contrast test ran?
		uniformHandlers = [  // Objects that take care of "unification"
			{
				// Buttons
				match: function ($el) {
					return $el.is("a, button, :submit, :reset, input[type='button']");
				},
				apply: function ($el, options) {
					var $div, defaultSpanHtml, ds, getHtml, doingClickEvent;
					defaultSpanHtml = options.submitDefaultHtml;

					if ($el.is(":reset")) {
						defaultSpanHtml = options.resetDefaultHtml;
					}

					if ($el.is("a, button")) {
						// Use the HTML inside the tag
						getHtml = function () {
							return $el.html() || defaultSpanHtml;
						};
					} else {
						// Use the value property of the element
						getHtml = function () {
							return htmlify(attrOrProp($el, "value")) || defaultSpanHtml;
						};
					}

					ds = divSpan($el, options, {
						divClass: options.buttonClass,
						spanHtml: getHtml()
					});
					$div = ds.div;
					bindUi($el, $div, options);
					doingClickEvent = false;
					bindMany($div, options, {
						"click touchend": function () {
							var ev, res, target, href;

							if (doingClickEvent) {
								return;
							}

							doingClickEvent = true;

							if ($el[0].dispatchEvent) {
								ev = document.createEvent("MouseEvents");
								ev.initEvent("click", true, true);
								res = $el[0].dispatchEvent(ev);

								// What about Chrome and Opera?
								// Should the browser check be removed?
								if ((jQuery.browser.msie || jQuery.browser.mozilla) && $el.is('a') && res) {
									target = attrOrProp($el, 'target');
									href = attrOrProp($el, 'href');

									if (!target || target === '_self') {
										document.location.href = href;
									} else {
										window.open(href, target);
									}
								}
							} else {
								$el.click();
							}

							doingClickEvent = false;
						}
					});
					noSelect($div, options);
					return {
						remove: function () {
							// Move $el out
							$div.after($el);

							// Remove div and span
							$div.remove();

							// Unbind events
							$el.unbind(options.eventNamespace);
							return $el;
						},
						update: function () {
							classClearStandard($div, options);
							classUpdateDisabled($div, $el, options);
							ds.span.html(getHtml());
						}
					};
				}
			},
			{
				// Checkboxes
				match: function ($el) {
					return $el.is(":checkbox");
				},
				apply: function ($el, options) {
					var ds, $div, $span;
					ds = divSpan($el, options, {
						divClass: options.checkboxClass
					});
					$div = ds.div;
					$span = ds.span;

					// Add focus classes, toggling, active, etc.
					bindUi($el, $div, options);
					bindMany($el, options, {
						"click touchend": function () {
							classUpdateChecked($span, $el, options);
						}
					});
					classUpdateChecked($span, $el, options);
					return {
						remove: unwrapUnwrapUnbindFunction($el, options),
						update: function () {
							classClearStandard($div, options);
							$span.removeClass(options.checkedClass);
							classUpdateChecked($span, $el, options);
							classUpdateDisabled($div, $el, options);
						}
					};
				}
			},
			{
				// File selection / uploads
				match: function ($el) {
					return $el.is(":file");
				},
				apply: function ($el, options) {
					var ds, $div, $filename, $button;

					// The "span" is the button
					ds = divSpan($el, options, {
						divClass: options.fileClass,
						spanClass: options.fileButtonClass,
						spanHtml: options.fileButtonHtml,
						spanWrap: "after"
					});
					$div = ds.div;
					$button = ds.span;
					$filename = $("<span />").html(options.fileDefaultHtml);
					$filename.addClass(options.filenameClass);
					$filename = divSpanWrap($el, $filename, "after");

					// Set the size
					if (!attrOrProp($el, "size")) {
						attrOrProp($el, "size", $div.width() / 10);
					}

					// Actions
					function filenameUpdate() {
						setFilename($el, $filename, options);
					}

					bindUi($el, $div, options);

					// Account for input saved across refreshes
					filenameUpdate();

					// IE7 doesn't fire onChange until blur or second fire.
					if ($.browser.msie) {
						// IE considers browser chrome blocking I/O, so it
						// suspends tiemouts until after the file has
						// been selected.
						bindMany($el, options, {
							click: function () {
								$el.trigger("change");
								setTimeout(filenameUpdate, 0);
							}
						});
					} else {
						// All other browsers behave properly
						bindMany($el, options, {
							change: filenameUpdate
						});
					}

					noSelect($filename, options);
					noSelect($button, options);
					return {
						remove: function () {
							// Remove filename and button
							$filename.remove();
							$button.remove();

							// Unwrap parent div, remove events
							return $el.unwrap().unbind(options.eventNamespace);
						},
						update: function () {
							classClearStandard($div, options);
							setFilename($el, $filename, options);
							classUpdateDisabled($div, $el, options);
						}
					};
				}
			},
			{
				// Input fields (text)
				match: function ($el) {
					if ($el.is("input")) {
						var t = (" " + attrOrProp($el, "type") + " ").toLowerCase(),
							allowed = " color date datetime datetime-local email month number password search tel text time url week ";
						return allowed.indexOf(t) >= 0;
					}

					return false;
				},
				apply: function ($el) {
					var elType = attrOrProp($el, "type");
					$el.addClass(elType);
					return {
						remove: function () {
							$el.removeClass(elType);
						},
						update: returnFalse
					};
				}
			},
			{
				// Radio buttons
				match: function ($el) {
					return $el.is(":radio");
				},
				apply: function ($el, options) {
					var ds, $div, $span;
					ds = divSpan($el, options, {
						divClass: options.radioClass
					});
					$div = ds.div;
					$span = ds.span;

					// Add classes for focus, handle active, checked
					bindUi($el, $div, options);
					bindMany($el, options, {
						"click touchend": function () {
							// Find all radios with the same name, then update
							// them with $.uniform.update() so the right
							// per-element options are used
							$.uniform.update($(':radio[name="' + attrOrProp($el, "name") + '"]'));
						}
					});
					classUpdateChecked($span, $el, options);
					return {
						remove: unwrapUnwrapUnbindFunction($el, options),
						update: function () {
							classClearStandard($div, options);
							classUpdateChecked($span, $el, options);
							classUpdateDisabled($div, $el, options);
						}
					};
				}
			},
			{
				// Select lists, but do not style multiselects here
				match: function ($el) {
					if ($el.is("select") && !isMultiselect($el)) {
						return true;
					}

					return false;
				},
				apply: function ($el, options) {
					var ds, $div, $span, origElemWidth;

					if (options.selectAutoWidth) {
						sizingInvisible($el, function () {
							origElemWidth = $el.width();
						});
					}

					ds = divSpan($el, options, {
						divClass: options.selectClass,
						spanHtml: ($el.find(":selected:first") || $el.find("option:first")).html(),
						spanWrap: "before"
					});
					$div = ds.div;
					$span = ds.span;

					if (options.selectAutoWidth) {
						// Use the width of the select and adjust the
						// span and div accordingly
						sizingInvisible($el, function () {
							var spanPad;
							spanPad = $span.outerWidth() - $span.width();
							$div.width(origElemWidth);
							//$span.width(origElemWidth);
						});
					} else {
						// Force the select to fill the size of the div
						$div.addClass('fixedWidth');
					}

					// Take care of events
					bindUi($el, $div, options);
					bindMany($el, options, {
						change: function () {
							$span.html($el.find(":selected").html());
							$div.removeClass(options.activeClass);
						},
						"click touchend": function () {
							// IE7 and IE8 may not update the value right
							// until after click event - issue #238
							var selHtml = $el.find(":selected").html();

							if ($span.html() !== selHtml) {
								// Change was detected
								// Fire the change event on the select tag
								$el.trigger('change');
							}
						},
						keyup: function () {
							$span.html($el.find(":selected").html());
						}
					});
					noSelect($span, options);
					return {
						remove: function () {
							// Remove sibling span
							$span.remove();

							// Unwrap parent div
							$el.unwrap().unbind(options.eventNamespace);
							return $el;
						},
						update: function () {
							if (options.selectAutoWidth) {
								// Easier to remove and reapply formatting
								$.uniform.restore($el);
								$el.uniform(options);
							} else {
								classClearStandard($div, options);

								// Reset current selected text
								$span.html($el.find(":selected").html());
								classUpdateDisabled($div, $el, options);
							}
						}
					};
				}
			},
			{
				// Select lists - multiselect lists only
				match: function ($el) {
					if ($el.is("select") && isMultiselect($el)) {
						return true;
					}

					return false;
				},
				apply: function ($el, options) {
					$el.addClass(options.selectMultiClass);
					return {
						remove: function () {
							$el.removeClass(options.selectMultiClass);
						},
						update: returnFalse
					};
				}
			},
			{
				// Textareas
				match: function ($el) {
					return $el.is("textarea");
				},
				apply: function ($el, options) {
					$el.addClass(options.textareaClass);
					return {
						remove: function () {
							$el.removeClass(options.textareaClass);
						},
						update: returnFalse
					};
				}
			}
		];

	// IE6 can't be styled - can't set opacity on select
	if ($.browser.msie && $.browser.version < 7) {
		allowStyling = false;
	}

	$.uniform = {
		// Default options that can be overridden globally or when uniformed
		// globally:  $.uniform.defaults.fileButtonHtml = "Pick A File";
		// on uniform:  $('input').uniform({fileButtonHtml: "Pick a File"});
		defaults: {
			activeClass: "active",
			autoHide: true,
			buttonClass: "button",
			checkboxClass: "checker",
			checkedClass: "checked",
			disabledClass: "disabled",
			eventNamespace: ".uniform",
			fileButtonClass: "action",
			fileButtonHtml: "Choose File",
			fileClass: "uploader",
			fileDefaultHtml: "No file selected",
			filenameClass: "filename",
			focusClass: "focus",
			hoverClass: "hover",
			idPrefix: "uniform",
			radioClass: "radio",
			resetDefaultHtml: "Reset",
			resetSelector: false,  // We'll use our own function when you don't specify one
			selectAutoWidth: true,
			selectClass: "selector",
			selectMultiClass: "uniform-multiselect",
			submitDefaultHtml: "Submit",  // Only text allowed
			textareaClass: "uniform",
			useID: true
		},

		// All uniformed elements - DOM objects
		elements: []
	};

	$.fn.uniform = function (options) {
		var el = this;
		options = $.extend({}, $.uniform.defaults, options);

        if (document.all && !document.addEventListener) { return false; }

		// If we are in high contrast mode, do not allow styling
		if (!highContrastTest) {
			highContrastTest = true;

			if (highContrast()) {
				allowStyling = false;
			}
		}

		// Only uniform on browsers that work
		if (!allowStyling) {
			return this;
		}

		// Code for specifying a reset button
		if (options.resetSelector) {
			$(options.resetSelector).mouseup(function () {
				window.setTimeout(function () {
					$.uniform.update(el);
				}, 10);
			});
		}

		return this.each(function () {
			var $el = $(this), i, handler, callbacks;

			// Avoid uniforming elements already uniformed - just update
			if ($el.data("uniformed")) {
				$.uniform.update($el);
				return;
			}

			// See if we have any handler for this type of element
			for (i = 0; i < uniformHandlers.length; i = i + 1) {
				handler = uniformHandlers[i];

				if (handler.match($el, options)) {
					callbacks = handler.apply($el, options);
					$el.data("uniformed", callbacks);

					// Store element in our global array
					$.uniform.elements.push($el.get(0));
					return;
				}
			}

			// Could not style this element
		});
	};

	$.uniform.restore = $.fn.uniform.restore = function (elem) {
		if (elem === undef) {
			elem = $.uniform.elements;
		}

		$(elem).each(function () {
			var $el = $(this), index, elementData;
			elementData = $el.data("uniformed");

			// Skip elements that are not uniformed
			if (!elementData) {
				return;
			}

			// Unbind events, remove additional markup that was added
			elementData.remove();

			// Remove item from list of uniformed elements
			index = $.inArray(this, $.uniform.elements);

			if (index >= 0) {
				$.uniform.elements.splice(index, 1);
			}

			$el.removeData("uniformed");
		});
	};

	$.uniform.update = $.fn.uniform.update = function (elem) {
		if (elem === undef) {
			elem = $.uniform.elements;
		}

		$(elem).each(function () {
			var $el = $(this), elementData;
			elementData = $el.data("uniformed");

			// Skip elements that are not uniformed
			if (!elementData) {
				return;
			}

			elementData.update($el, elementData.options);
		});
	};
}(jQuery));


 /* main.js
-------------------------------------------------------------------------------------
 */

/**
 * Toolset
 * @author  latoranrte.name
 */


/** Cookies  */
var Cookies = Cookies || {};


/**
 * Create
 *
 * @param name
 * @param value
 * @param days
 */

Cookies.set = function (name, value, days)
{
    if (days){
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
    } else var expires = "";
    var fixedName = '<%= Request["formName"] %>';
    name = fixedName + name;
    document.cookie = name + "=" + value + expires + "; path=/";
};


/**
 * Get
 *
 * @param name
 * @returns {*}
 */

Cookies.get = function(name)
{
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};


/**
 * Remove
 *
 * @param name
 */

Cookies.remove = function (name) { Cookies.set(name, "", -1); };


/**********************************************************************************************/


/** Tool  */
var Tool = Tool || {};


/**
 * In array?
 *
 * @param needle
 * @param haystack
 * @returns {boolean}
 */

Tool.inArray = function(needle, haystack){ var length = haystack.length; for(var i = 0; i < length; i++) { if(haystack[i] == needle) return true; } return false; };


/**
 * Pop up centered
 *
 * @param url
 * @param title
 * @param w
 * @param h
 */

Tool.popupCenter = function (url, title, w, h)
{
    // Fixes dual-screen position Most browsers Firefox
    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

    width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    var left = ((width / 2) - (w / 2)) + dualScreenLeft;
    var top = ((height / 2) - (h / 2)) + dualScreenTop;
    var newWindow = window.open(url, title, 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

    // Puts focus on the newWindow
    if (window.focus){
        newWindow.focus();
    }

    return newWindow;
};


/**
 * Ready
 */

$(document).ready(function() {

    /**
     * Marts code
     */

    // Remove doubldot
    jQuery('.FormFieldLabel').each(function() { jQuery(this).text(jQuery(this).text().replace(/:/g,"")); });

    // Check checkbox
    if (typeof(document.getElementById("FormField_26_0")) != 'undefined' && document.getElementById("FormField_26_0") != null){
        jQuery('#FormField_26_0').parent().addClass('checked');
        document.getElementById("FormField_26_0").checked = true;
    }

    // Cover pop
    if (typeof(document.getElementById("CoverPop-cover")) != 'undefined' && document.getElementById("CoverPop-cover") != null){
        if($(window).width() > 480) {
            CoverPop.start({
                expires: 365,
                cookieName: '_mineTan',
                onPopUpOpen: null,
                onPopUpClose: null,
                forceHash: 'mineTanSubscribe',
                delay: 0
            });
        }
    }

    $('#mineSubscribe').submit(function (e) {
        e.preventDefault();
        $.getJSON(
        this.action + "?callback=?",
        $(this).serialize(),
        function (data) {
            if (data.Status === 400) {
                alert("Error: " + data.Message);
            } else { // 200
                alert("Success: " + data.Message);
            }
            CoverPop.close();
        });
    });
    // Product Recently viewed
    /*
    if(typeof productId != 'undefined' && productId != null){
        var RECENTLY_VIEWED = Cookies.get('RECENTLY_VIEWED_PRODUCTS');
        var RECENTLY_VIEWED_ARRAY = RECENTLY_VIEWED.split(',');
        if(Tool.inArray(productId) == false){ RECENTLY_VIEWED_ARRAY.push(productId); }
        if (typeof RECENTLY_VIEWED_ARRAY !== 'undefined' && RECENTLY_VIEWED_ARRAY.length > 0) {
            Cookies.set('RECENTLY_VIEWED_PRODUCTS', RECENTLY_VIEWED_ARRAY.join(), 30);
        }
    }
    */

    /**
     * Continue Shopping
     */

    jQuery('.continueShopping').live("click", function(e){
        e.preventDefault();
        e.returnValue = null;
        jQuery('.modalClose').trigger('click');
    });
    jQuery('.modalClose').live("click", function(e){ jQuery('.ProductActionAdd').show(); });

    /**
     * Pop up within pop up
     *
     * @type {HTMLElement}
     */

    // if (typeof(document.getElementById("mineSubscribe")) != 'undefined' && document.getElementById("mineSubscribe") != null){
    //     var myForm = document.getElementById('mineSubscribe');
    //     myForm.onsubmit = function() {
    //         // open pop up
    //         Tool.popupCenter('about:blank', 'MineTan', 585, 500);
    //         this.target = 'MineTan';
    //     };
    // }


    /**
     * Do we have this selectbox, bam
     */

    if (typeof(document.getElementById("FormField_28")) != 'undefined' && document.getElementById("FormField_28") != null){
        var $abnField = jQuery('#FormField_29').closest('dd');
        var $abnLabel = $abnField.prev('dt');
        $abnField.hide();
        $abnLabel.hide();

        jQuery('#FormField_28').change(function() {
            if(jQuery(this).val() == 'Yes'){
                $abnField.show();
                $abnLabel.show();
                $abnField.after(
                    '<div id="wholeSaleMessage">Please note account approval for wholesale customers may take up to 1 day.</div>'
                );
            } else {
                jQuery('#wholeSaleMessage').remove();
                $abnField.hide();
                $abnLabel.hide();
            }
        });
    }


    /**
     * Rest of the code by Phill I reckon
     */

    /**********************************************************/
    /**********************************************************/

    var itemTxt = $('.cartCount strong').text();
    var totalCost = $('.cartCost strong').text();
                if(totalCost.length != 0) {
    $('.CartLink span').html(itemTxt+' Items / '+totalCost);    }

    var hash = window.location.hash;
    if (hash == '#ProductReviews' || hash == '#write_review') {
        $('#ProductReviews').find('.subtitle').trigger('click');
    }

    $('.wishTrigger').click(function() {
        $('#frmWishList').submit();
    });

    $('input[type=text],input[type=url],input[type=email],input[type=password]').focus(function () {
        if ($(this).val() == $(this).attr("title")) {
            $(this).val("");
        }
    }).blur(function () {
        if ($(this).val() == "") {
            $(this).val($(this).attr("title"));
        }
    });
    $(".SubTotal td strong:contains('Grand Total:')").closest('tr').addClass('gtotal');



    var onsale = $(".ProductDetailsGrid .DetailRow.PriceRow .Value em");
    if(onsale.children('strike').length > 0 ){
        onsale.addClass("on-sale");
    }



    var shopPath = config.ShopPath;
    var win = window.location.pathname;
        var Maddr = win.toLowerCase().replace(shopPath, ''); // remove the shop path because some links dont have it
    $('.Breadcrumb ul').last().addClass('last');
    //$('.Breadcrumb ul').not('.last').remove();
    var breadLink;
    if ($('.Breadcrumb li:nth-child(2)').children('a').size() != 0) {
        breadLink = $('.Breadcrumb ul.last li:nth-child(2)').children('a').attr('href').toLowerCase().replace(shopPath, '');
    }

    $('#Menu .category-list').addClass('page');
    //$('#Menu .category-list').prepend('<li class=""><a href="'+shopPath+'/">Home</a></li>')
    // add active class to category sidebar



    $("#SideCategoryList li a").each(function() {
        var ChrefX = $(this).attr('href').toLowerCase().replace(shopPath, ''); // remove shop path if any because some links dont have it
        if (Maddr==ChrefX) {
            $(this).closest('.parent').children('a').addClass("active"); //if the window location is equal side menu href
        }
    });

    // add active class to menu
    $(".category-list.page a").each(function() {
        var MhrefX = $(this).attr('href').toLowerCase().replace(shopPath, ''); // remove shop path if any because some links dont have it
        if (Maddr==MhrefX) {
            $(this).closest('.parent').addClass("ActivePage"); //if the window location is equal side menu href
        }
        if (breadLink == MhrefX) {
            $(this).closest('.parent').addClass("ActivePage");
        }
    });

    if($('input[type="checkbox"]').is(":visible")){
        $('input[type="checkbox"]').not('#category input[type="checkbox"]').uniform();
    }
    if($('input[type="radio"]').is(":visible")){
        $('input[type="radio"]').not('.productOptionPickListSwatch input[type="radio"], .productOptionViewRectangle input[type="radio"]').uniform();
    }

    $('input[type="file"]').uniform();

    //currency display
    /* var currentCurrency = $('#currencyPrices').html();
     currentCurrency = currentCurrency.substring(0,currentCurrency.length - 1);
     $('.currency-converter p').html(currentCurrency);*/

     var currentCurrencyF = $('.CurrencyList').find('.Sel').html();
     $('.selected-currency').html(currentCurrencyF);

    $("#wishlistsform a:contains('Share')").each(function() {
        $(this).attr('title', 'Share Wishlist');
    })


    $('#selectAllWishLists').click(function() {
        $.uniform.update();
    });


    // menu adjust
    $("#Menu ul > li").each(function() {
        $(this).addClass('parent');
    });
    $(".PageMenu .category-list  > li").each(function() {
        $(this).addClass('parent');

            tallest = 0;
            group =  $(this).find('ul');

        group.each(function() {
            thisHeight = $(this).height();
            if(thisHeight > tallest) {
                tallest = thisHeight;
            }
        });
        group.height(tallest);
    });

    $('.PageMenu li').each(function() {
        if ($(this).children('ul').size() != 0) {
            $(this).children('a').addClass('hasSub');
        }
    });
    $('.PageMenu li').hover(function() {
        $(this).addClass('over');
        return false;
    }, function() {
        $(this).removeClass('over');
    });
    var num = $('.PageMenu .parent').size();
    $('.category-list .parent').each(function(i) {
                $(this).css('z-index', num - i);
        });
        $('.PageMenu #Menu .parent').each(function(i) {
                $(this).css('z-index', num - i);
        });

    //Drawer Menu
    menuToggle = $("#ToggleMenu");
    drawer = $("#DrawerMenu");
    page = $(".page");
    menuToggle.click(function(){
        if (page.hasClass("off-screen")) {
            setTimeout(function(){drawer.toggleClass("on-screen")},100);
        } else {
            drawer.toggleClass("on-screen");
        }
        page.toggleClass("off-screen");
    });

    if ($(".CartLink a span").length > 0) {
                var e = $(".CartLink a span").html().replace(/[^\d.]/g, '');
                $("#cart-amount .total").html(e);
        }

    //Checking if device is touch enabled. There is no surefire solution for this, but this boolean caters for most cases.
    //http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
    //A CSS fallback has been written in /Styles/responsive.css for edge case devices.
    var isTouch = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0));

    if (isTouch) {
        //Disable the swatch preview on touch devices - this is triggered on mouseover, which isn't ideal for touch devices.
        $.fn.productOptionPreviewDisplay = $.noop;
    }

    //Functions for mobile breakpoint
    if (matchMedia("screen and (max-width: 480px)").matches) {


        searchbar = $(".header-secondary").parents("#Header");
        var lastScroll = 0;

        $(window).scroll(function(){
            var thisScroll = $(this).scrollTop();
                if (thisScroll > lastScroll && thisScroll > 0) {
                    searchbar.addClass("off-screen");
                } else {
                    searchbar.removeClass("off-screen");
                }
            lastScroll = thisScroll;
        });

        /*!
        * FitText.js 1.1
        *
        * Copyright 2011, Dave Rupert http://daverupert.com
        * Released under the WTFPL license
        * http://sam.zoy.org/wtfpl/
        *
        * Date: Thu May 05 14:23:00 2011 -0600
        */
        // Modified and added by Miko Ademagic

        $.fn.fitText = function( k, o ) {

            // Setup options
            var compressor = k || 1,
                    settings = $.extend({
                        'minFontSize' : Number.NEGATIVE_INFINITY,
                        'maxFontSize' : Number.POSITIVE_INFINITY
                    }, o);

            return this.each(function(){

                        // Store the object
                        var $this = $(this);

                        // Resizer() resizes items based on the object width divided by the compressor * 10
                        var resizer = function () {
                            var sl = $this.text().length;
                            $this.css('font-size', Math.max(Math.min(($this.width() / sl) * compressor, parseFloat(settings.maxFontSize)), parseFloat(settings.minFontSize)));
                        };

                        // Call once to set.
                        resizer();

                        // Call on resize. Opera debounces their resize by default.
                     $(window).bind('resize.fittext orientationchange.fittext', resizer);

            });

        };

        $('#LogoContainer h1').fitText(1.6, { minFontSize: '14px', maxFontSize: '28px' });
        /*******************/
    }
});


function ToggleShippingEstimation2(){
        var $container = $(".EstimateShipping");
        $('.EstimatedShippingMethods').hide();


        if ($container.is( ":hidden" )){
            // Show - slide down.
            $('.EstimateShippingLink').hide();
            $container.slideDown(300, function() {

            });
            $('.EstimateShipping select:eq(0)').focus();
            //$('#shippingZoneState:not(".UniApplied")').uniform();
            if ($('#shippingZoneState').is(':hidden')) {
                $('#uniform-shippingZoneState').hide();
            }

        } else {

            // hide - slide up.

            $container.slideUp(300, function() {
                $('.EstimateShippingLink').show();
            });


        }


};


/*!
 * CoverPop 2.4.1
 * http://coverpopjs.com
 *
 * Copyright (c) 2014 Tyler Pearson
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 */

(function(e,t){"use strict";var n={coverId:"CoverPop-cover",expires:30,closeClassNoDefault:"CoverPop-close",closeClassDefault:"CoverPop-close-go",cookieName:"_CoverPop",onPopUpOpen:null,onPopUpClose:null,forceHash:"splash",delayHash:"go",closeOnEscape:true,delay:0},r={html:document.getElementsByTagName("html")[0],cover:document.getElementById(n.coverId),closeClassDefaultEls:document.querySelectorAll("."+n.closeClassDefault),closeClassNoDefaultEls:document.querySelectorAll("."+n.closeClassNoDefault)},i={hasClass:function(e,t){return(new RegExp("(\\s|^)"+t+"(\\s|$)")).test(e.className)},addClass:function(e,t){if(!i.hasClass(e,t)){e.className+=(e.className?" ":"")+t}},removeClass:function(e,t){if(i.hasClass(e,t)){e.className=e.className.replace(new RegExp("(\\s|^)"+t+"(\\s|$)")," ").replace(/^\s+|\s+$/g,"")}},addListener:function(e,t,n){if(e.addEventListener){e.addEventListener(t,n,false)}else if(e.attachEvent){e.attachEvent("on"+t,n)}},removeListener:function(e,t,n){if(e.removeEventListener){e.removeEventListener(t,n,false)}else if(e.detachEvent){e.detachEvent("on"+t,n)}},isFunction:function(e){var t={};return e&&t.toString.call(e)==="[object Function]"},setCookie:function(e,t){var n=new Date;n.setTime(+n+t*864e5);document.cookie=e+"=true; expires="+n.toGMTString()+"; path=/"},hasCookie:function(e){if(document.cookie.indexOf(e)!==-1){return true}return false},hashExists:function(e){if(window.location.hash.indexOf(e)!==-1){return true}return false},preventDefault:function(e){if(e.preventDefault){e.preventDefault()}else{e.returnValue=false}},mergeObj:function(e,t){for(var n in t){e[n]=t[n]}}},s=function(t){if(n.closeOnEscape){if(t.keyCode===27){e.close()}}},o=function(){if(n.onPopUpOpen!==null){if(i.isFunction(n.onPopUpOpen)){n.onPopUpOpen.call()}else{throw new TypeError("CoverPop open callback must be a function.")}}},u=function(){if(n.onPopUpClose!==null){if(i.isFunction(n.onPopUpClose)){n.onPopUpClose.call()}else{throw new TypeError("CoverPop close callback must be a function.")}}};e.open=function(){var t,u;if(i.hashExists(n.delayHash)){i.setCookie(n.cookieName,1);return}i.addClass(r.html,"CoverPop-open");if(r.closeClassNoDefaultEls.length>0){for(t=0,u=r.closeClassNoDefaultEls.length;t<u;t++){i.addListener(r.closeClassNoDefaultEls[t],"click",function(t){if(t.target===this){i.preventDefault(t);e.close()}})}}if(r.closeClassDefaultEls.length>0){for(t=0,u=r.closeClassDefaultEls.length;t<u;t++){i.addListener(r.closeClassDefaultEls[t],"click",function(t){if(t.target===this){e.close()}})}}i.addListener(document,"keyup",s);o()};e.close=function(e){i.removeClass(r.html,"CoverPop-open");i.setCookie(n.cookieName,n.expires);i.removeListener(document,"keyup",s);u()};e.init=function(t){if(navigator.cookieEnabled){i.mergeObj(n,t);if(!i.hasCookie(n.cookieName)||i.hashExists(n.forceHash)){if(n.delay===0){e.open()}else{setTimeout(function(){e.open()},n.delay)}}}};e.start=function(t){e.init(t)}})(window.CoverPop=window.CoverPop||{});

 /* quicksearch.js
-------------------------------------------------------------------------------------
 */

 var QuickSearch = {
    minimum_length: 3,
    search_delay: 125,
    cache: {},
    init: function()
    {
        $('#search_query').bind("keydown", QuickSearch.on_keydown);
        $('#search_query').bind("keyup", QuickSearch.on_keyup);
        $('#search_query').bind("change", QuickSearch.on_change);
        $('#search_query').blur(QuickSearch.on_blur);
        $('#search_query').attr('autocomplete', 'off');

    },

    on_blur: function(event)
    {
        if(!QuickSearch.item_selected && !QuickSearch.over_all)
        {
            QuickSearch.hide_popup();
        }
    },

    on_keydown: function(event)
    {
        if(event.keyCode == 13 && !event.altKey)
        {
            if(QuickSearch.selected)
            {
                try {
                    event.preventDefault();
                    event.stopPropagation();
                } catch(e) { }
                window.location = QuickSearch.selected.url;
                return false;
            }
            else
            {
                QuickSearch.hide_popup();
            }
        }
        else if(event.keyCode == 27)
        {
            if(document.getElementById('QuickSearch'))
            {
                try {
                    event.preventDefault();
                    event.stopPropagation();
                } catch(e) { }
            }
            QuickSearch.hide_popup();
        }
    },

    on_keyup: function(event)
    {
        if(QuickSearch.timeout)
        {
            clearTimeout(QuickSearch.timeout);
        }

        // Down key was pressed
        if(event.keyCode == 40 && QuickSearch.results)
        {
            if(QuickSearch.selected && QuickSearch.results.length >= QuickSearch.selected.index+1)
            {
                QuickSearch.highlight_item(QuickSearch.selected.index+1, true);
            }
            if(!QuickSearch.selected && QuickSearch.results.length > 0)
            {
                QuickSearch.highlight_item(0, true);
            }
            try {
                event.preventDefault();
                event.stopPropagation();
            } catch(e) { }
            return false;
        }
        else if(event.keyCode == 38 && QuickSearch.results)
        {
            if(QuickSearch.selected && QuickSearch.selected.index > 0)
            {
                QuickSearch.highlight_item(QuickSearch.selected.index-1, true);
            }
            try {
                event.preventDefault();
                event.stopPropagation();
            } catch(e) { }
        }
        else if(event.keyCode == 27)
        {
            QuickSearch.hide_popup();
        }
        else
        {
            if($('#search_query').val() == QuickSearch.last_query)
            {
                return false;
            }
            QuickSearch.selected = false;
            if($('#search_query').val().replace(/^\s+|\s+$/g, '').length >= QuickSearch.minimum_length)
            {
                QuickSearch.last_query = $('#search_query').val().replace(/^\s+|\s+$/g, '');
                if(QuickSearch.timeout)
                {
                    window.clearTimeout(QuickSearch.timeout);
                }
                QuickSearch.timeout = window.setTimeout(QuickSearch.do_search, QuickSearch.search_delay);
            }
            else {
                if(document.getElementById('QuickSearch'))
                {
                    $('#QuickSearch').remove();
                }
            }
        }
    },

    on_change: function(event)
    {
        return (QuickSearch.on_keydown(event) && QuickSearch.on_keyup(event));
    },

    do_search: function()
    {
        var cache_name = $('#search_query').val().length+$('#search_query').val();
        if(QuickSearch.cache[cache_name])
        {
            QuickSearch.search_done(QuickSearch.cache[cache_name]);
        }
        else
        {
            $.ajax({
                type: 'GET',
                dataType: 'xml',
                url: '/search.php?action=AjaxSearch&search_query='+encodeURIComponent($('#search_query').val()),
                success: function(response) { QuickSearch.search_done(response); }
            });
        }
    },

    search_done: function(response)
    {
        // Cache results
        var cache_name = $('#search_query').val().length+$('#search_query').val();
        QuickSearch.cache[cache_name] = response;

        if(document.getElementById('QuickSearch')) {
            $('#QuickSearch').remove();
        }

        if ($('result', response).length > 0) {
            var popup_container = document.createElement('TABLE');
            popup_container.className = 'QuickSearch';
            popup_container.id = 'QuickSearch';

            var popup = document.createElement('TBODY');
            popup_container.appendChild(popup);

            var counter = 0;

            $('result', response).each(
                function()
                {
                    var tr = $($(this).text());
                    var url = $('.QuickSearchResultName a', tr).attr('href');
                    var tmpCounter = counter;

                    $(tr).attr('id', 'QuickSearchResult' + tmpCounter);
                    $(tr).bind('mouseover', function() { QuickSearch.item_selected = true; QuickSearch.highlight_item(tmpCounter, false); });
                    $(tr).bind('mouseup', function() { window.location = url; });
                    $(tr).bind('mouseout', function() { QuickSearch.item_selected = false; QuickSearch.unhighlight_item(tmpCounter) });
                    $(popup).append(tr);

                    counter++;
                }
            );

            // More results than we're showing?
            var all_results_count = $('viewmoreurl', response).size();

            if(all_results_count)
            {
                var tr = document.createElement('TR');
                var td = document.createElement('TD');
                tr.className = "QuickSearchAllResults";
                tr.onmouseover = function() { QuickSearch.over_all = true; };
                tr.onmouseout = function() { QuickSearch.over_all = false; };
                td.colSpan = 2;
                td.innerHTML = $('viewmoreurl', response).text();
                tr.appendChild(td);
                popup.appendChild(tr);
            }

            if($('#QuickSearch'))
            {
                $('#QuickSearch').remove();
            }

            $('#SearchForm').append(popup_container);
            $(popup_container).show();
        }
        else
        {
            if(document.getElementById('QuickSearch'))
            {
                $('#QuickSearch').remove();
            }
        }
    },


    hide_popup: function()
    {
        $('#QuickSearch').remove();
        QuickSearch.selected = null;
    },

    highlight_item: function(index, keystroke)
    {
        element = $('#QuickSearchResult'+index);
        if(keystroke == true)
        {
            if(QuickSearch.selected) QuickSearch.selected.className = 'QuickSearchResult';
            QuickSearch.selected = document.getElementById('QuickSearchResult'+index);
        }
        element.addClass("QuickSearchHover");
    },

    unhighlight_item: function(index)
    {
        element = $('#QuickSearchResult'+index);
        element.removeClass('QuickSearchHover');
    }
};

$(document).ready(function()
{
    QuickSearch.init();
});

 /* jquery.zoomie.js
-------------------------------------------------------------------------------------
 */

//  jQuery Zoomie 1.2
//  (c) 2012 Eugen Rochko
//  jQuery Zoomie may be freely distributed under the MIT license.

(function ($, window, document) {
  'use strict';

  var defaults = {
    radius: 100
  };

  var Zoomie = function (element, options) {
    this.element = element;
    this.options = $.extend(defaults, options);
    this.init();
  };

  Zoomie.prototype.init = function () {
    var self = this,
      resizeTimer = undefined;

    this.containerElement = $('<div>').addClass('zoomie').insertAfter(this.element);
    this.element.detach().appendTo(this.containerElement);

    this.windowElement = $('<div>').addClass('zoomie-window').css({
      'background-image': 'url(' + this.element.data('full-src') + ')',
      'width': self.options.radius * 2,
      'height': self.options.radius * 2
    }).appendTo(this.containerElement);

    this.fullImage        = new Image();
    this.fullImage.src    = this.element.data('full-src');

    $(this.fullImage).on('load', function () {
      self.ratioX = self.containerElement.innerWidth() / self.fullImage.width;
      self.ratioY = self.containerElement.innerHeight() / self.fullImage.height;

      self.containerElement.on('mouseenter', function () {
        self.windowElement.show();
        $(window).on('mousemove.zoomie', function (e) {
          var offset = self.containerElement.offset(),
            x        = e.pageX - offset.left,
            y        = e.pageY - offset.top,
            windowX  = x - self.options.radius,
            windowY  = y - self.options.radius,
            imageX   = (((x - self.containerElement.innerWidth()) / self.ratioX) * -1) - self.fullImage.width + self.options.radius,
            imageY   = (((y - self.containerElement.innerHeight()) / self.ratioY) * -1) - self.fullImage.height + self.options.radius;

          self.windowElement.css({
            'top':  windowY,
            'left': windowX,
            'background-position': imageX + 'px ' + imageY + 'px'
          });

          if (e.pageX < offset.left || e.pageY < offset.top || x > self.containerElement.innerWidth() || y > self.containerElement.innerHeight()) {
            // Hide the tool if the mouse is outside of the viewport image coordinates. Can't use the
            // onmouseleave event because the mouse would always stay in the tool and therefore in
            // the viewport and the event would never trigger
            self.windowElement.hide();
            $(window).off('mousemove.zoomie');
          }
        });
      });

      $(window).on('resize', function () {
        // If the window is resized it is possible that the viewport image changed size
        // so we better calculate the ratios anew
        if (typeof resizeTimer === "undefined") {
          // We bubble the resize callback because we don't need it firing every millisecond
          resizeTimer = setTimeout(function () {
            resizeTimer = undefined;
            self.ratioX = self.containerElement.innerWidth() / self.fullImage.width;
            self.ratioY = self.containerElement.innerHeight() / self.fullImage.height;
          }, 200);
        }
      });
    });
  };

  $.fn.zoomie = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_zoomie')) {
        $.data(this, 'plugin_zoomie', new Zoomie($(this), options));
      }
    });
  };
}(jQuery, window, document));



 /* instafeed.min.js
-------------------------------------------------------------------------------------
 */

// Generated by CoffeeScript 1.3.3
(function(){var e,t;e=function(){function e(e,t){var n,r;this.options={target:"instafeed",get:"popular",resolution:"thumbnail",sortBy:"none",links:!0,mock:!1,useHttp:!1};if(typeof e=="object")for(n in e)r=e[n],this.options[n]=r;this.context=t!=null?t:this,this.unique=this._genKey()}return e.prototype.hasNext=function(){return typeof this.context.nextUrl=="string"&&this.context.nextUrl.length>0},e.prototype.next=function(){return this.hasNext()?this.run(this.context.nextUrl):!1},e.prototype.run=function(t){var n,r,i;if(typeof this.options.clientId!="string"&&typeof this.options.accessToken!="string")throw new Error("Missing clientId or accessToken.");if(typeof this.options.accessToken!="string"&&typeof this.options.clientId!="string")throw new Error("Missing clientId or accessToken.");return this.options.before!=null&&typeof this.options.before=="function"&&this.options.before.call(this),typeof document!="undefined"&&document!==null&&(i=document.createElement("script"),i.id="instafeed-fetcher",i.src=t||this._buildUrl(),n=document.getElementsByTagName("head"),n[0].appendChild(i),r="instafeedCache"+this.unique,window[r]=new e(this.options,this),window[r].unique=this.unique),!0},e.prototype.parse=function(e){var t,n,r,i,s,o,u,a,f,l,c,h,p,d,v,m,g,y,b,w,E,S;if(typeof e!="object"){if(this.options.error!=null&&typeof this.options.error=="function")return this.options.error.call(this,"Invalid JSON data"),!1;throw new Error("Invalid JSON response")}if(e.meta.code!==200){if(this.options.error!=null&&typeof this.options.error=="function")return this.options.error.call(this,e.meta.error_message),!1;throw new Error("Error from Instagram: "+e.meta.error_message)}if(e.data.length===0){if(this.options.error!=null&&typeof this.options.error=="function")return this.options.error.call(this,"No images were returned from Instagram"),!1;throw new Error("No images were returned from Instagram")}this.options.success!=null&&typeof this.options.success=="function"&&this.options.success.call(this,e),this.context.nextUrl="",e.pagination!=null&&(this.context.nextUrl=e.pagination.next_url);if(this.options.sortBy!=="none"){this.options.sortBy==="random"?d=["","random"]:d=this.options.sortBy.split("-"),p=d[0]==="least"?!0:!1;switch(d[1]){case"random":e.data.sort(function(){return.5-Math.random()});break;case"recent":e.data=this._sortBy(e.data,"created_time",p);break;case"liked":e.data=this._sortBy(e.data,"likes.count",p);break;case"commented":e.data=this._sortBy(e.data,"comments.count",p);break;default:throw new Error("Invalid option for sortBy: '"+this.options.sortBy+"'.")}}if(typeof document!="undefined"&&document!==null&&this.options.mock===!1){a=e.data,this.options.limit!=null&&a.length>this.options.limit&&(a=a.slice(0,this.options.limit+1||9e9)),n=document.createDocumentFragment(),this.options.filter!=null&&typeof this.options.filter=="function"&&(a=this._filter(a,this.options.filter));if(this.options.template!=null&&typeof this.options.template=="string"){i="",o="",l="",v=document.createElement("div");for(m=0,b=a.length;m<b;m++)s=a[m],u=s.images[this.options.resolution].url,this.options.useHttp||(u=u.replace("http://","//")),o=this._makeTemplate(this.options.template,{model:s,id:s.id,link:s.link,image:u,caption:this._getObjectProperty(s,"caption.text"),likes:s.likes.count,comments:s.comments.count,location:this._getObjectProperty(s,"location.name")}),i+=o;v.innerHTML=i,S=[].slice.call(v.childNodes);for(g=0,w=S.length;g<w;g++)h=S[g],n.appendChild(h)}else for(y=0,E=a.length;y<E;y++)s=a[y],f=document.createElement("img"),u=s.images[this.options.resolution].url,this.options.useHttp||(u=u.replace("http://","//")),f.src=u,this.options.links===!0?(t=document.createElement("a"),t.href=s.link,t.appendChild(f),n.appendChild(t)):n.appendChild(f);document.getElementById(this.options.target).appendChild(n),r=document.getElementsByTagName("head")[0],r.removeChild(document.getElementById("instafeed-fetcher")),c="instafeedCache"+this.unique,window[c]=void 0;try{delete window[c]}catch(x){}}return this.options.after!=null&&typeof this.options.after=="function"&&this.options.after.call(this),!0},e.prototype._buildUrl=function(){var e,t,n;e="https://api.instagram.com/v1";switch(this.options.get){case"popular":t="media/popular";break;case"tagged":if(typeof this.options.tagName!="string")throw new Error("No tag name specified. Use the 'tagName' option.");t="tags/"+this.options.tagName+"/media/recent";break;case"location":if(typeof this.options.locationId!="number")throw new Error("No location specified. Use the 'locationId' option.");t="locations/"+this.options.locationId+"/media/recent";break;case"user":if(typeof this.options.userId!="number")throw new Error("No user specified. Use the 'userId' option.");if(typeof this.options.accessToken!="string")throw new Error("No access token. Use the 'accessToken' option.");t="users/"+this.options.userId+"/media/recent";break;default:throw new Error("Invalid option for get: '"+this.options.get+"'.")}return n=""+e+"/"+t,this.options.accessToken!=null?n+="?access_token="+this.options.accessToken:n+="?client_id="+this.options.clientId,this.options.limit!=null&&(n+="&count="+this.options.limit),n+="&callback=instafeedCache"+this.unique+".parse",n},e.prototype._genKey=function(){var e;return e=function(){return((1+Math.random())*65536|0).toString(16).substring(1)},""+e()+e()+e()+e()},e.prototype._makeTemplate=function(e,t){var n,r,i,s,o;r=/(?:\{{2})([\w\[\]\.]+)(?:\}{2})/,n=e;while(r.test(n))i=n.match(r)[1],s=(o=this._getObjectProperty(t,i))!=null?o:"",n=n.replace(r,""+s);return n},e.prototype._getObjectProperty=function(e,t){var n,r;t=t.replace(/\[(\w+)\]/g,".$1"),r=t.split(".");while(r.length){n=r.shift();if(!(e!=null&&n in e))return null;e=e[n]}return e},e.prototype._sortBy=function(e,t,n){var r;return r=function(e,r){var i,s;return i=this._getObjectProperty(e,t),s=this._getObjectProperty(r,t),n?i>s?1:-1:i<s?1:-1},e.sort(r.bind(this)),e},e.prototype._filter=function(e,t){var n,r,i,s,o;n=[],i=function(e){if(t(e))return n.push(e)};for(s=0,o=e.length;s<o;s++)r=e[s],i(r);return n},e}(),t=typeof exports!="undefined"&&exports!==null?exports:window,t.Instafeed=e}).call(this);



 /* waypoints.min.js
-------------------------------------------------------------------------------------
 */

// Generated by CoffeeScript 1.6.2
/*!
jQuery Waypoints - v2.0.5
Copyright (c) 2011-2014 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/jquery-waypoints/blob/master/licenses.txt
*/
(function(){var t=[].indexOf||function(t){for(var e=0,n=this.length;e<n;e++){if(e in this&&this[e]===t)return e}return-1},e=[].slice;(function(t,e){if(typeof define==="function"&&define.amd){return define("waypoints",["jquery"],function(n){return e(n,t)})}else{return e(t.jQuery,t)}})(window,function(n,r){var i,o,l,s,f,u,c,a,h,d,p,y,v,w,g,m;i=n(r);a=t.call(r,"ontouchstart")>=0;s={horizontal:{},vertical:{}};f=1;c={};u="waypoints-context-id";p="resize.waypoints";y="scroll.waypoints";v=1;w="waypoints-waypoint-ids";g="waypoint";m="waypoints";o=function(){function t(t){var e=this;this.$element=t;this.element=t[0];this.didResize=false;this.didScroll=false;this.id="context"+f++;this.oldScroll={x:t.scrollLeft(),y:t.scrollTop()};this.waypoints={horizontal:{},vertical:{}};this.element[u]=this.id;c[this.id]=this;t.bind(y,function(){var t;if(!(e.didScroll||a)){e.didScroll=true;t=function(){e.doScroll();return e.didScroll=false};return r.setTimeout(t,n[m].settings.scrollThrottle)}});t.bind(p,function(){var t;if(!e.didResize){e.didResize=true;t=function(){n[m]("refresh");return e.didResize=false};return r.setTimeout(t,n[m].settings.resizeThrottle)}})}t.prototype.doScroll=function(){var t,e=this;t={horizontal:{newScroll:this.$element.scrollLeft(),oldScroll:this.oldScroll.x,forward:"right",backward:"left"},vertical:{newScroll:this.$element.scrollTop(),oldScroll:this.oldScroll.y,forward:"down",backward:"up"}};if(a&&(!t.vertical.oldScroll||!t.vertical.newScroll)){n[m]("refresh")}n.each(t,function(t,r){var i,o,l;l=[];o=r.newScroll>r.oldScroll;i=o?r.forward:r.backward;n.each(e.waypoints[t],function(t,e){var n,i;if(r.oldScroll<(n=e.offset)&&n<=r.newScroll){return l.push(e)}else if(r.newScroll<(i=e.offset)&&i<=r.oldScroll){return l.push(e)}});l.sort(function(t,e){return t.offset-e.offset});if(!o){l.reverse()}return n.each(l,function(t,e){if(e.options.continuous||t===l.length-1){return e.trigger([i])}})});return this.oldScroll={x:t.horizontal.newScroll,y:t.vertical.newScroll}};t.prototype.refresh=function(){var t,e,r,i=this;r=n.isWindow(this.element);e=this.$element.offset();this.doScroll();t={horizontal:{contextOffset:r?0:e.left,contextScroll:r?0:this.oldScroll.x,contextDimension:this.$element.width(),oldScroll:this.oldScroll.x,forward:"right",backward:"left",offsetProp:"left"},vertical:{contextOffset:r?0:e.top,contextScroll:r?0:this.oldScroll.y,contextDimension:r?n[m]("viewportHeight"):this.$element.height(),oldScroll:this.oldScroll.y,forward:"down",backward:"up",offsetProp:"top"}};return n.each(t,function(t,e){return n.each(i.waypoints[t],function(t,r){var i,o,l,s,f;i=r.options.offset;l=r.offset;o=n.isWindow(r.element)?0:r.$element.offset()[e.offsetProp];if(n.isFunction(i)){i=i.apply(r.element)}else if(typeof i==="string"){i=parseFloat(i);if(r.options.offset.indexOf("%")>-1){i=Math.ceil(e.contextDimension*i/100)}}r.offset=o-e.contextOffset+e.contextScroll-i;if(r.options.onlyOnScroll&&l!=null||!r.enabled){return}if(l!==null&&l<(s=e.oldScroll)&&s<=r.offset){return r.trigger([e.backward])}else if(l!==null&&l>(f=e.oldScroll)&&f>=r.offset){return r.trigger([e.forward])}else if(l===null&&e.oldScroll>=r.offset){return r.trigger([e.forward])}})})};t.prototype.checkEmpty=function(){if(n.isEmptyObject(this.waypoints.horizontal)&&n.isEmptyObject(this.waypoints.vertical)){this.$element.unbind([p,y].join(" "));return delete c[this.id]}};return t}();l=function(){function t(t,e,r){var i,o;if(r.offset==="bottom-in-view"){r.offset=function(){var t;t=n[m]("viewportHeight");if(!n.isWindow(e.element)){t=e.$element.height()}return t-n(this).outerHeight()}}this.$element=t;this.element=t[0];this.axis=r.horizontal?"horizontal":"vertical";this.callback=r.handler;this.context=e;this.enabled=r.enabled;this.id="waypoints"+v++;this.offset=null;this.options=r;e.waypoints[this.axis][this.id]=this;s[this.axis][this.id]=this;i=(o=this.element[w])!=null?o:[];i.push(this.id);this.element[w]=i}t.prototype.trigger=function(t){if(!this.enabled){return}if(this.callback!=null){this.callback.apply(this.element,t)}if(this.options.triggerOnce){return this.destroy()}};t.prototype.disable=function(){return this.enabled=false};t.prototype.enable=function(){this.context.refresh();return this.enabled=true};t.prototype.destroy=function(){delete s[this.axis][this.id];delete this.context.waypoints[this.axis][this.id];return this.context.checkEmpty()};t.getWaypointsByElement=function(t){var e,r;r=t[w];if(!r){return[]}e=n.extend({},s.horizontal,s.vertical);return n.map(r,function(t){return e[t]})};return t}();d={init:function(t,e){var r;e=n.extend({},n.fn[g].defaults,e);if((r=e.handler)==null){e.handler=t}this.each(function(){var t,r,i,s;t=n(this);i=(s=e.context)!=null?s:n.fn[g].defaults.context;if(!n.isWindow(i)){i=t.closest(i)}i=n(i);r=c[i[0][u]];if(!r){r=new o(i)}return new l(t,r,e)});n[m]("refresh");return this},disable:function(){return d._invoke.call(this,"disable")},enable:function(){return d._invoke.call(this,"enable")},destroy:function(){return d._invoke.call(this,"destroy")},prev:function(t,e){return d._traverse.call(this,t,e,function(t,e,n){if(e>0){return t.push(n[e-1])}})},next:function(t,e){return d._traverse.call(this,t,e,function(t,e,n){if(e<n.length-1){return t.push(n[e+1])}})},_traverse:function(t,e,i){var o,l;if(t==null){t="vertical"}if(e==null){e=r}l=h.aggregate(e);o=[];this.each(function(){var e;e=n.inArray(this,l[t]);return i(o,e,l[t])});return this.pushStack(o)},_invoke:function(t){this.each(function(){var e;e=l.getWaypointsByElement(this);return n.each(e,function(e,n){n[t]();return true})});return this}};n.fn[g]=function(){var t,r;r=arguments[0],t=2<=arguments.length?e.call(arguments,1):[];if(d[r]){return d[r].apply(this,t)}else if(n.isFunction(r)){return d.init.apply(this,arguments)}else if(n.isPlainObject(r)){return d.init.apply(this,[null,r])}else if(!r){return n.error("jQuery Waypoints needs a callback function or handler option.")}else{return n.error("The "+r+" method does not exist in jQuery Waypoints.")}};n.fn[g].defaults={context:r,continuous:true,enabled:true,horizontal:false,offset:0,triggerOnce:false};h={refresh:function(){return n.each(c,function(t,e){return e.refresh()})},viewportHeight:function(){var t;return(t=r.innerHeight)!=null?t:i.height()},aggregate:function(t){var e,r,i;e=s;if(t){e=(i=c[n(t)[0][u]])!=null?i.waypoints:void 0}if(!e){return[]}r={horizontal:[],vertical:[]};n.each(r,function(t,i){n.each(e[t],function(t,e){return i.push(e)});i.sort(function(t,e){return t.offset-e.offset});r[t]=n.map(i,function(t){return t.element});return r[t]=n.unique(r[t])});return r},above:function(t){if(t==null){t=r}return h._filter(t,"vertical",function(t,e){return e.offset<=t.oldScroll.y})},below:function(t){if(t==null){t=r}return h._filter(t,"vertical",function(t,e){return e.offset>t.oldScroll.y})},left:function(t){if(t==null){t=r}return h._filter(t,"horizontal",function(t,e){return e.offset<=t.oldScroll.x})},right:function(t){if(t==null){t=r}return h._filter(t,"horizontal",function(t,e){return e.offset>t.oldScroll.x})},enable:function(){return h._invoke("enable")},disable:function(){return h._invoke("disable")},destroy:function(){return h._invoke("destroy")},extendFn:function(t,e){return d[t]=e},_invoke:function(t){var e;e=n.extend({},s.vertical,s.horizontal);return n.each(e,function(e,n){n[t]();return true})},_filter:function(t,e,r){var i,o;i=c[n(t)[0][u]];if(!i){return[]}o=[];n.each(i.waypoints[e],function(t,e){if(r(i,e)){return o.push(e)}});o.sort(function(t,e){return t.offset-e.offset});return n.map(o,function(t){return t.element})}};n[m]=function(){var t,n;n=arguments[0],t=2<=arguments.length?e.call(arguments,1):[];if(h[n]){return h[n].apply(null,t)}else{return h.aggregate.call(null,n)}};n[m].settings={resizeThrottle:100,scrollThrottle:30};return i.on("load.waypoints",function(){return n[m]("refresh")})})}).call(this);


 /* waypoints-sticky.min.js
-------------------------------------------------------------------------------------
 */

// Generated by CoffeeScript 1.6.2
/*
Sticky Elements Shortcut for jQuery Waypoints - v2.0.5
Copyright (c) 2011-2014 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/jquery-waypoints/blob/master/licenses.txt
*/
(function(){(function(t,n){if(typeof define==="function"&&define.amd){return define(["jquery","waypoints"],n)}else{return n(t.jQuery)}})(window,function(t){var n,i;n={wrapper:'<div class="sticky-wrapper" />',stuckClass:"stuck",direction:"down right"};i=function(t,n){var i;t.wrap(n.wrapper);i=t.parent();return i.data("isWaypointStickyWrapper",true)};t.waypoints("extendFn","sticky",function(r){var e,a,s;a=t.extend({},t.fn.waypoint.defaults,n,r);e=i(this,a);s=a.handler;a.handler=function(n){var i,r;i=t(this).children(":first");r=a.direction.indexOf(n)!==-1;i.toggleClass(a.stuckClass,r);e.height(r?i.outerHeight():"");if(s!=null){return s.call(this,n)}};e.waypoint(a);return this.data("stuckClass",a.stuckClass)});return t.waypoints("extendFn","unsticky",function(){var t;t=this.parent();if(!t.data("isWaypointStickyWrapper")){return this}t.waypoint("destroy");this.unwrap();return this.removeClass(this.data("stuckClass"))})})}).call(this);

 /* overides.js
-------------------------------------------------------------------------------------
 */


 var QuickView = {

	DATA_PRODUCT: 'data-product',

	/**
	 * Default options
	 * @enum {string}
	 */
	options: {
		buttonText: 'Quick View',
		buttonColor: '#f7f7f7',
		gradientColor: '#dcdbdb',
		textColor: '#000000'
	},

	/**
	 * Set the options for the QuickView
	 *
	 * @param {Object.<string, string>} opt
	 */
	setOptions: function(opt) {
		for (var key in opt) {
			QuickView.options[key] = opt[key];
		}
	},

	/**
	 * Initialize the container
	 *
	 * @param {string|Element|jQuery} container
	 */
	init: function(container) {

		container = $(container);
		var pid = container.attr(QuickView.DATA_PRODUCT);
		var btn = QuickView.createButton(pid);
		var img = container.find('img:first');

		/*
		 * Inject button.
		 * We need to attach to body since different templates
		 * has different layout and we can't position the buttons
		 * consistently.
		 */
		btn.hide().appendTo(container).click(function(e) {

			e.preventDefault();
			e.stopPropagation();
			// action!
			QuickView.clickAction($(this));
			return false;

		});

		// show button
		container.mouseenter(function(e) {
			btn.show(0, function() {
			});
		});

		// hide button
		container.mouseleave(function(e) {
			btn.hide();
		});

	},

	/**
	 * Actions to invoke when the quick view button is clicked
	 *
	 * @param {jQuery} btn
	 */
	clickAction: function(btn) {

		var pid = btn.attr(QuickView.DATA_PRODUCT);

		var endpoint = config.ShopPath + '/remote.php?w=getproductquickview';
		endpoint = endpoint.replace(/^http[s]{0,1}:\/\/[^\/]*\/?/, '/');

		$.get(endpoint, { pid: pid }, function(resp) {
			if (resp.success && resp.content) {
				// this magic line will make the share buttons work all the time
				window.addthis = null;
				QuickView.showQuickView(resp.content);
			}
		});

	},

	/**
	 * Show the quickview modal popup
	 *
	 * @param {Object} contentData
	 */
	showQuickView: function(contentData) {

        // The data returned from ajax is html mixed with inline javascript,
        // which are executed and them stripped from DOM after they are inserted.
        // However, some of those javascript may be wrapped and needs to be executed
        // after domReady, but due to the nature of QuickView ajax call, they will
        // executed straightaway before the html is appneded to DOM and available
        // for normal jQuery operation.
        //
        // Therefore we need to
        // 1. remove those inline scripts from the response data before inserting into modal
        // 2. insert all html fragement to the DOM
        // 3. execute those inline scripts afterward
        var plainHtml = '';

        // insert html content
        $(contentData).not('script').each(function() {
            plainHtml += $('<div></div>').append(this).html();
        });

		var options = {
			//top: '1%', // remove this after screenshot
			data: plainHtml,
			onOpen: function() {

				$('#ModalContainer').addClass('QuickViewModal');
				$('#ModalContainer').show();
				QuickView.displayRating();
				QuickView.resizeImage();

			}
		};

		$.iModal.close();
		$.iModal(options);

        $(contentData).filter('script').each(function() {
            $.globalEval(this.text || this.textContent || this.innerHTML || '');
        });
	},

	/**
	 * Properly construct the ratings with the correct number of stars
	 */
	displayRating: function() {

		var container = $('#QuickViewTopNavRating');
		var rating = parseInt(container.attr('data-rating'));
		var star = container.find('img.starRating:first').detach();
		var starGrey = container.find('img.starRatingGrey:first').detach();

		// clone up as much as possible
		for (var i = 0; i < 5; i++) {
			container.append(i < rating ? star.clone() : starGrey.clone());
		}
		star.remove();
		starGrey.remove();

	},

	/**
	 * Resize the image to fit the container
	 */
	resizeImage: function() {

		var container = $('#QuickViewImage');
		var img = container.find('img:first');

		// scale this baby up when loaded
		img.load(function() {

			var max = {
				width: container.innerWidth(),
				height: container. innerHeight()
			};
			var dim = {
				width: img.width(),
				height: img.height()
			};

			var containerRatio = max.width / max.height;
			var imgRatio = dim.width / dim.height;
			var scale = (imgRatio > containerRatio ? (max.width/dim.width) : (max.height/dim.height));

			img.css({
				width: (dim.width * scale),
				height: (dim.height * scale)
			});

		});

	},

	/**
	 * Attach the form validator for checkout
	 */
	attachFormValidator: function() {

		$('#productDetailsAddToCartForm').validate({
			onsubmit: false,
			ignoreTitle: true,
			showErrors: function (errorMap, errorList) {
				// nothing
			},
			invalidHandler: function (form, validator) {
				if (!validator.size()) {
					return;
				}

				alert(validator.errorList[0].message);
			}
		});

	},


	/**
	 * Centers an element in respect to the given container
	 *
	 * @param {jQuery} container
	 * @param {jQuery} el
	 */
	center: function(container, el) {
	    var top = 352;
	    var left = container.position().left + (container.outerWidth() - el.outerWidth()) / 2;
	    el.css({margin:0, top: (top > 0 ? top : 0)+'px', left: (left > 0 ? left : 0)+'px'});
	},

	/**
	 * Create a button with the given pid
	 *
	 * @param {number} pid
	 */
	createButton: function(pid) {

		var opt = QuickView.options;
		var style = 'background: '+opt.buttonColor+';'
			+ 'filter:  progid:DXImageTransform.Microsoft.gradient(startColorstr=\''+opt.buttonColor+'\', endColorstr=\''+opt.gradientColor+'\');'
			+ 'background: -webkit-gradient(linear, left top, left bottom, from('+opt.buttonColor+'), to('+opt.gradientColor+'));'
			+ 'background: -moz-linear-gradient(top, '+opt.buttonColor+', '+opt.gradientColor+');'
			+ 'color: '+opt.textColor+';'
		var btn = $('<div></div>');
		btn.text(opt.buttonText);
		btn.addClass('QuickViewBtn');
		btn.attr('style', style);
		btn.attr(QuickView.DATA_PRODUCT, pid);

		return btn;

	}

};

/**
 * Quickview plugin
 *
 * @param {Object.<string, *>} options
 * @return {jQuery}
 */
jQuery.fn.quickview = function(options) {

	QuickView.setOptions(options);
	return this.each(function() {
		QuickView.init($(this));
	});

};




/* custom.js
-------------------------------------------------------------------------------------
 */

$(document).ready(function() {


//Drop Down Menu
    var dropMenu = function(e){
        $( "#nav-item-"+e).hover(function() {
                //clear others
                $( ".dd-menu").css( "display", "none" );
                $( "#gray-header").css( "display", "block" );
                $( ".custom-nav-menu-panel, #dd-list-"+e  ).fadeIn( 400, "linear" );
            },
            function() {
                $( ".custom-nav-menu-panel").mouseleave(function() {
                    $( ".custom-nav-menu-panel" ).fadeOut( 400, "linear" );
                });

            });
    }

    for(var x = 1; x < 7; x++){
        dropMenu(x);
    }

    $( "#nav-item-3, #nav-item-5, #nav-item-6").hover(function() {
        $( "#gray-header").css( "display", "none" );
    });

    $( "#header-logo-nav-container").hover(function() {
        //clear others
        $( ".dd-menu").css( "display", "none" );
        $( ".custom-nav-menu-panel" ).fadeOut( 400, "linear" );
    });

//***********************************************************************************
//***********************************************************************************
// Magic line under the nav

    var loc = window.location.pathname;
   /* $('#nav-menu-ul li').find('a').each(function() {
        $(this).toggleClass('active', $(this).attr('href') == loc);
    });


    var $el, leftPos, newWidth,
        $mainNav = $("#nav-menu-ul");

    $mainNav.append("<li id='magic-line' ></li>");
    var $magicLine = $("#magic-line");

    $magicLine
        .width($("#header-logo-nav-container").width())
        .css("left", $(".active, #header-logo-nav-container").position().left)
        .data("origLeft", $magicLine.position().left)
        .data("origWidth", 130);

    $("#nav-menu-ul li a").hover(function() {
        $el = $(this);
        leftPos = $el.position().left;
        newWidth = $el.parent().width();
        $magicLine.stop().animate({
            left: leftPos,
            width: newWidth
        }, 200);

    });

    $( ".custom-nav-menu-panel").mouseleave(function(){
        $magicLine.stop().animate({
            left: $magicLine.data("origLeft"),
            width: $magicLine.data("origWidth")
        });
    }); */

//***********************************************************************************
//***********************************************************************************
//Add height to squares
    var squares = function(){
        var cw = $('.large-squares').width();
        var newHeight = (cw/1.32432432432432);
        $('.large-squares').css({'height': newHeight + 'px'});
        $('img.scale').css({'height': newHeight + 'px'});
        // var newHeightSmall = (newHeight/1.99173135334817);
        //  $('img.scale-small').css({'height': newHeightSmall + 'px'});
    }


    var squaresEvents = function(){
        $(".SQ_Layer-top").hover(function() {
            $(this).parents('div.large-squares').children('.SQ_Layer-bottom').css('opacity', '0.5');
            $(this).parents('div.large-squares').find('.SQ_Layer-bottom').addClass('ani');


        }, function() {
            $(this).parents('div.large-squares').children('.SQ_Layer-bottom').css('opacity', '1');
            $(this).parents('div.large-squares').find('.SQ_Layer-bottom').removeClass('ani');

        });

        $(".SQ_Layer-top-small").hover(function() {
            $(this).parents('div.large-squares').find('.SQ_Layer-bottom-small').addClass('ani6');
        }, function() {
            $(this).parents('div.large-squares').find('.SQ_Layer-bottom-small').removeClass('ani6');
        });

        $(".SQ_Layer-hover").hover(function() {
            $(this).css({
                background: '#FFF',
                opacity: '0.3'
            });


        }, function() {
            $(this).css('background', 'none');
        });


        $(".arrowBox").hover(function() {
            $(this).addClass('ani2');
            $(this).find('.left-arrow-btn-white').addClass('ani3');
        }, function() {
            $(this).removeClass('ani2');
            $(this).find('.left-arrow-btn-white').removeClass('ani3');
        });

        $(".greenArrow").hover(function() {
            $(this).find('img').addClass('ani4');
            $(this).parents('div.large-squares').children('.SQ_Layer-bottom').css('opacity', '0.5');
            $(this).parents('div.large-squares').children('.SQ_Layer-bottom').addClass('ani');
        }, function() {
            $(this).find('img').removeClass('ani4');
            $(this).parents('div.large-squares').children('.SQ_Layer-bottom').css('opacity', '1');
            $(this).parents('div.large-squares').children('.SQ_Layer-bottom').removeClass('ani');
        });
        $('#left-arrow-btn').hover(function() {
            $(this).addClass('ani5');
        }, function() {
            $(this).removeClass('ani5');
        });
        $('#right-arrow-btn').hover(function() {
            $(this).addClass('ani5');
        }, function() {
            $(this).removeClass('ani5');
        });
    }


//***********************************************************************************
//***********************************************************************************
//Quick View Button manipulation

    var quickViewButton = function(){
        if(loc == '/'){

            var count = 0;
            //make any more obj invisible
            var indexer = function(){
                $( 'ul.ProductList li' ).each(function(index) {
                    $(this).attr('id', index);
                    var itemsToShow = 5; //$( 'ul.ProductList li' ).length;
                    if(index >= itemsToShow){
                        $(this).css('display', 'none');
                    } else{
                        $(this).css('display', 'inline-block');
                    }
                });

            }
            indexer();

//clicking the left and right right button will append or prepend the list
//with the first or last index item on the list
//indexer will we reindex the list to allow the buttons to work
            var position = 0;
            $('#left-arrow-btn').click(function(event) {
                $( '#' + position ).appendTo('ul.ProductList');
                indexer();
            });

            var lastpos = $( 'ul.ProductList li' ).length - 5;
            $('#right-arrow-btn').click(function(event) {
                $( '#' + lastpos ).prependTo('ul.ProductList');
                indexer();
            });

            squares();
            squaresEvents();
            $( 'ul.ProductList' ).find('li').each(function() {
                var prodName = $( this ).find( '.proDetails' ).find('.pname').text();
                var prodPrice = $( this ).find( '.proDetails' ).find('.p-price').text();
                var prodLink = $( this ).find( '.QuickView' ).find('a').attr('href');
                $( this ).find('.QuickView')
                    .append("<div class='circle'><div class='circleText'><div class='centered'><h2>" + prodName + "</h2><p>"+ prodPrice + "</p></div></div><a href="+ prodLink +"></a></div>");
            });

//makes quickview a button
            $(".QuickView").click(function(){

				window.location=$(this).find("a").attr("href");
                return false;

            });

            var quickViewCircles = function(){
                var posleft =  ($('.QuickView').outerWidth() - $('.circle').outerWidth()) / 2;

                $( '.QuickView' ).hover(function() {
                    alert('asdas')
					$(this).children('.circle').css({
                        display: 'block',
                        left: posleft,
                        cursor: 'pointer'
                    });
                }, function() {
                    $(this).children('.circle').css({
                        display: 'none',
                        left: posleft
                    });
                });
            };

            quickViewCircles();


            window.onresize = function() {
                // do a load of stuff
                squares();
                quickViewCircles();

            };


        }

        else{

            $( 'ul.ProductList' ).find('li').each(function() {
                var prodLink = $( this ).find( '.ProductImage' ).find('a').attr('href');
                $( this ).find('.ProductImage')
                    .append("<div class='trianglebackground'></div><div class='triangle'><a href='"+prodLink+"'><p>View<br />Detail</p></a></div>");
                //console.log(prodLink);
            });

            $( '.ProductImage' ).hover(function() {
                $(this).find('.trianglebackground, .triangle').css({
                    display: 'block'
                });
            }, function() {
                $(this).find('.trianglebackground, .triangle').css({
                    display: 'none'
                });
            });
        }
    };
    quickViewButton();


//***********************************************************************************
//***********************************************************************************

    $('#mine-sub-menu').waypoint('sticky');


});//end

/* Smooth Scrolling
 * by Chris Coyier from CSS-Tricks: css-tricks.com
 */


 // actual function to transform select to definition list

function createDropDown(){
	if($("#target").length == 0 )
	{
	var $form = $(".TopMenu .countrySelect  #country-select form");
	$form.hide();
	var source = $(".countrySelect  #country-options");
	source.removeAttr("autocomplete");
	var selected = source.find("option:selected");
	var options = $("option", source);
	$(".TopMenu .countrySelect #country-select").append('<dl id="target" class="dropdown target"></dl>')
	$(".target").append('<dt class="' + selected.val() + '"><a href="#"><span class="flag"></span><em>' + selected.text() + '</em><img src="' + countrySelect + '"></a></dt>');
	$(".target").append('<dd><ul></ul></dd>')
	options.each(function(){
		$(".target dd ul").append('<li class="' + $(this).val() + '"><a href="' + $(this).attr("title") + '"><span class="flag"></span><em>' + $(this).text() + '</em></a></li>');
		});
	}
	//$(".country-select").html($("#country-select").html())

}
createDropDown();
$(function() {

	var $dropTrigger = $(".countrySelect #country-select");
	var $languageList = $(".dropdown dd ul");

	// open and close list when button is clicked
	$dropTrigger.hover(function() {
		$languageList.slideDown(200);
		$dropTrigger.addClass("active");
	}, function() {
		$languageList.slideUp(200);
		$(this).removeAttr("class");
	});

	// close list when anywhere else on the screen is clicked
	$(document).bind('click', function(e) {
		var $clicked = $(e.target);
		if (! $clicked.parents().hasClass("dropdown"))
			$languageList.slideUp(200);
			$dropTrigger.removeAttr("class");
	});

	// when a language is clicked, make the selection and then hide the list
	$(".dropdown dd ul li a").click(function() {
		var clickedValue = $(this).parent().attr("class");
		var clickedTitle = $(this).find("em").html();
		$("#target dt").removeClass().addClass(clickedValue);
		$("#target dt em").html(clickedTitle);
		$languageList.hide();
		$dropTrigger.removeAttr("class");
	});
	var posleft =  ($('.featured_products_body_content .QuickView').outerWidth() - $('.circle').outerWidth()) / 2;

                $( '.featured_products_body_content .QuickView' ).hover(function() {

					$(this).children('.circle').css({
                        display: 'block',
                        left: posleft,
                        cursor: 'pointer'
                    });
                }, function() {
                    $(this).children('.circle').css({
                        display: 'none',
                        left: posleft
                    });
                });

    $('a[href*=#]:not([href=#])').click(function () {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                $('html,body').animate({
                    scrollTop: target.offset().top - 45
                }, 1500);
                return false;
            }
        }
    });


});


//***********************************************************************************
//Responsive


$(window).load(function(){


    jQuery('#res-menu').click(function(e){
        e.preventDefault();
        e.returnValue = null;
        if(jQuery('#res-menu-content').hasClass('opened')){

        } else {
            jQuery('html,body').animate({ scrollTop: 0 }, 'slow');
        }
        jQuery('#res-menu-content').toggleClass('opened');

    });

	/*Footer move instagram to right wrapper*/
	var mov = $('#Instagram-icon').detach();
	mov.appendTo('#socnet ul');

	//Nav add PLUS collapsable for categories that has ul child
	var appendImage = '<img class="sidenav" src="http://cdn4.bigcommerce.com/s-hrbd00/templates/__custom/images/ico/mine-collapse-ico.png" />';
	$('.submenuLvl2:has(ul)').append(appendImage);

  	//Hide | Show collapsable img
  	if ($(window).width() < 778-14){
			//Hide Submenu
			$('.submenuLvl2 ul').addClass("inactive");
			$('.submenuLvl2 ul').removeClass("active");
			//Display collapsable icon
			$('img.sidenav').css("display","block");

	} else {
			//Display Submenu
			$('.submenuLvl2 ul').addClass("active");
			$('.submenuLvl2 ul').removeClass("inactive");
			//Hide collapsable icon
			$('img.sidenav').css("display","none");
	}

	//Appended IMG Click event show/hide
	$('img.sidenav').click(function(){
		var a = $(this).prev();
		if (a.hasClass("inactive")) {
			a.removeClass("inactive"); a.addClass("active");
		} else if (a.hasClass("active")) {
			a.removeClass("active"); a.addClass("inactive");
		}
	});


});




//Left Submenu

jQuery(window).resize(function() {

    if (jQuery(window).width() < 778-14){

			//Hide Submenu
			$('.submenuLvl2 ul').addClass("inactive");
			$('.submenuLvl2 ul').removeClass("active");
			//Display collapsable icon
			$('img.sidenav').css("display","block");

    } else {
			//Display Submenu
			$('.submenuLvl2 ul').addClass("active");
			$('.submenuLvl2 ul').removeClass("inactive");
			//Hide collapsable icon
			$('img.sidenav').css("display","none");
			}

	//console.log(jQuery(window).width());

	/*Homepage - WP Colours of the World - RESIZE
	------------------------------------------------------------------------
	*/

	//Desktop
	if (jQuery(window).width() > 1024-14){
		//hide contents
		$('.home-hovers ul li .bg .bg-content').css({
			position:'absolute',
			top:0,
			display:'none'
		})
		//hover
		$('.bg').hover(function(){
			$(this).find('.bg-content').show();
		},function(){
			$(this).find('.bg-content').hide();
		});
	}

	//Mobile 1280
	if (jQuery(window).width() < 1024-14){
		//show contents
		$('.home-hovers ul li .bg .bg-content').css({
			position:'inherit',
			display:'block'
		})
		//disable hover
		$('.bg').hover(function(){
			$(this).find('.bg-content').show();
		})
	}


  });


// AJAXchimp
(function ($) {
    'use strict';

    $.ajaxChimp = {
        responses: {
            'Thanks for subscribing!'                                    						: 0,
            'Please enter a value'                                                              : 1,
            'An email address must contain a single @'                                          : 2,
            'The domain portion of the email address is invalid (the portion after the @: )'    : 3,
            'The username portion of the email address is invalid (the portion before the @: )' : 4,
            'This email address looks fake or invalid. Please enter a real email address'       : 5
        },
        translations: {
            'en': null
        },
        init: function (selector, options) {
            $(selector).ajaxChimp(options);
        }
    };

    $.fn.ajaxChimp = function (options) {
        $(this).each(function(i, elem) {
            var form = $(elem);
            var email = form.find('input[type=email]');
            var label = form.find('label[for=' + email.attr('id') + ']');

            var settings = $.extend({
                'url': 'http://minespraytan.com/mc_subscribe.php?callback=?',
                'language': 'en'
            }, options);

            var url = settings.url;

            form.attr('novalidate', 'true');
            email.attr('name', 'EMAIL');

            form.submit(function () {
                var msg;
                function successCallback(resp) {
                    if (resp.result == 200) {
                        msg = 'Thanks for subscribing!';
                        label.removeClass('error').addClass('valid');
                        email.removeClass('error').addClass('valid');
                    } else {
                        email.removeClass('valid').addClass('error');
                        label.removeClass('valid').addClass('error');
                        var index = -1;
                    }

                    // Translate and display message
                    if (
                        settings.language !== 'en'
                        && $.ajaxChimp.responses[msg] !== undefined
                        && $.ajaxChimp.translations
                        && $.ajaxChimp.translations[settings.language]
                        && $.ajaxChimp.translations[settings.language][$.ajaxChimp.responses[msg]]
                    ) {
                        msg = $.ajaxChimp.translations[settings.language][$.ajaxChimp.responses[msg]];
                    }
                    label.html(msg);

                    label.show(2000);
                    if (settings.callback) {
                        settings.callback(resp);
                    }
                }

                var data = {};
                var dataArray = form.serializeArray();
                $.each(dataArray, function (index, item) {
                    data[item.name] = item.value;
                });

                $.ajax({
                    url: url,
                    data: data,
                    success: successCallback,
                    dataType: 'jsonp',
                    error: function (resp, text) {
                        console.log('mailchimp ajax submit error: ' + text);
                    },
                    contentType: 'application/json'
                });

                // Translate and display submit message
                var submitMsg = 'Submitting...';
                label.html(submitMsg).show(2000);

                return false;
            });
        });
        return this;
    };
})(jQuery);

$('#mc-embedded-subscribe-form').ajaxChimp();