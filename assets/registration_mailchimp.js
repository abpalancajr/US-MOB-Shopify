// Push Registration to Mailchimp
jQuery(document).ready(function() {
	registerToMailchimp();
	
	var full = window.location.host;
	var parts = full.split('.');
	var sub = parts[0];
	
	if( 'eu' == sub ) {
		sub = 'EU';
	} else if( 'uk' == sub ) {
		sub = 'United Kingdom';
	} else if( 'us' == sub ) {
		sub = 'usa';
	} else if( 'au' == sub ) {
		sub = 'Australia';
	} else {
		sub = 'other';
	}

	jQuery( '#contact_form' ).append('<input type="hidden" value="' + sub + '" name="customer[note][country]">');
});

function registerToMailchimp() {
	_submitAllowed = false;
	
	// Despite being an ID, actually multiple of these forms per page
	var form = jQuery( '#create_customer,#contact_form' );
	if( form.length ) {
		form.submit(function(e){
			var currentForm = jQuery(this);

			if( _submitAllowed == false ) {
				e.preventDefault();

				jQuery.ajax({
					type: 'POST',
					url: 'https://marqueofbrands.com/mailchimp/',
					data: jQuery(this).serialize(),
					dataType: 'jsonp',
					success: function(msg) {
						_submitAllowed = true;
						currentForm.submit();
					}
				});
			}
		});
	}
}