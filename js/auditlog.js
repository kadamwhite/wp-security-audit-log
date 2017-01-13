var WsalData;

window['WsalAuditLogRefreshed'] = function(){
	// fix pagination links causing form params to get lost
	jQuery('span.pagination-links a').click(function(ev){
		ev.preventDefault();
		var deparam = function(url){
			var obj = {};
			var pairs = url.split('&');
			for(var i in pairs){
				var split = pairs[i].split('=');
				obj[decodeURIComponent(split[0])] = decodeURIComponent(split[1]);
			}
			return obj;
		};
		var paged = deparam(this.href).paged;
		if (typeof paged === 'undefined') paged = 1;
		jQuery('#audit-log-viewer').append(
			jQuery('<input type="hidden" name="paged"/>').val(paged)
		).submit();
	});
};

function WsalAuditLogInit(_WsalData){
	WsalData = _WsalData;
	var WsalTkn = WsalData.autorefresh.token;
	
	// list refresher
	var WsalAjx = null;
	var WsalChk = function(){
		if(WsalAjx)WsalAjx.abort();
		WsalAjx = jQuery.post(WsalData.ajaxurl, {
			action: 'AjaxRefresh',
			logcount: WsalTkn
		}, function(data){
			WsalAjx = null;
			if(data && data !== 'false'){
				WsalTkn = data;
				jQuery('#audit-log-viewer').load(
					location.href + ' #audit-log-viewer-content',
					window['WsalAuditLogRefreshed']
				);
			}
			WsalChk();
		});
	};
	if(WsalData.autorefresh.enabled){
		setInterval(WsalChk, 40000);
		WsalChk();
	}
	
	WsalSsasInit();
}

var WsalIppsPrev;

function WsalIppsFocus(value){
	WsalIppsPrev = value;
}

function WsalIppsChange(value){
	if(value === ''){
		value = window.prompt(WsalData.tr8n.numofitems, WsalIppsPrev);
		if(value === null || value === WsalIppsPrev)return this.value = WsalIppsPrev; // operation canceled
	}
	jQuery('select.wsal-ipps').attr('disabled', true);
	jQuery.post(WsalData.ajaxurl, {
		action: 'AjaxSetIpp',
		count: value
	}, function(){
		location.reload();
	});
}

function WsalSsasInit(){
	var SsasAjx = null;
	var SsasInps = jQuery("input.wsal-ssas");
	SsasInps.after('<div class="wsal-ssas-dd" style="display: none;"/>');
	SsasInps.click(function(){
		jQuery(this).select();
	});
	window['WsalAuditLogRefreshed']();
	SsasInps.keyup(function(){
		var SsasInp = jQuery(this);
		var SsasDiv = SsasInp.next();
		var SsasVal = SsasInp.val();
		if(SsasAjx)SsasAjx.abort();
		SsasInp.removeClass('loading');
		
		// do a new search
		if(SsasInp.attr('data-oldvalue') !== SsasVal && SsasVal.length > 2){
			SsasInp.addClass('loading');
			SsasAjx = jQuery.post(WsalData.ajaxurl, {
				action: 'AjaxSearchSite',
				search: SsasVal
			}, function(data){
				if(SsasAjx)SsasAjx = null;
				SsasInp.removeClass('loading');
				SsasDiv.hide();
				SsasDiv.html('');
				if(data && data.length){
					var SsasReg = new RegExp(SsasVal.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'), 'gi');
					for (var i = 0; i < data.length; i++){
						var link = jQuery('<a href="javascript:;" onclick="WsalSsasChange(' + data[i].blog_id + ')"/>')
							.text(data[i].blogname + ' (' + data[i].domain + ')');
						link.html(link.text().replace(SsasReg, '<u>$&</u>'));
						SsasDiv.append(link);
					}
				}else{
					SsasDiv.append(jQuery('<span/>').text(WsalData.tr8n.searchnone));
				}
				SsasDiv.prepend(jQuery('<a href="javascript:;" onclick="WsalSsasChange(0)" class="allsites"/>').text(WsalData.tr8n.searchback));
				SsasDiv.show();
			}, 'json');
			SsasInp.attr('data-oldvalue', SsasVal);
		}
		
		// handle keys
	});
	SsasInps.blur(function(){
		setTimeout(function(){
			var SsasInp = jQuery(this);
			var SsasDiv = SsasInp.next();
			SsasInp.attr('data-oldvalue', '');
			SsasDiv.hide();
		}, 200);
	});
}

function WsalSsasChange(value){
	jQuery('div.wsal-ssas-dd').hide();
	jQuery('input.wsal-ssas').attr('disabled', true);
	jQuery('#wsal-cbid').val(value);
	jQuery('#audit-log-viewer').submit();
}

function WsalDisableCustom(link, meta_key){
	var nfe = jQuery(this).parents('div:first');
	jQuery(link).hide();
	jQuery.ajax({
		type: 'POST',
		url: ajaxurl,
		async: false,
		data: { action: 'AjaxDisableCustomField', notice: meta_key },
		success: function(data) {
			var notice = jQuery('<div class="updated" data-notice-name="notifications-extension"></div>').html(data);
			jQuery("h2:first").after(notice);
		}
	});
}

function WsalDBChange(value){
	jQuery.ajax({
		type: 'POST',
		url: ajaxurl,
		async: true,
		data: { 
			action: 'AjaxSwitchDB',
			selected_db: value 
		},
		success: function() {
			location.reload();
		}
	});
}

function WsalDisableConfirm(code){
	jQuery( "#dialog-confirm" ).dialog({
		resizable: false,
		height: "auto",
		width: 400,
		modal: true,
		buttons: {
			"Disable": function() {
				WsalDisableByCode(code);
				jQuery( this ).dialog( "close" );
			},
			"Leave Enabled": function() {
				jQuery( this ).dialog( "close" );
			}
		}
    });
}

function WsalDisableByCode(code){
	jQuery.ajax({
		type: 'POST',
		url: ajaxurl,
		async: true,
		data: { action: 'AjaxDisableByCode', code: code },
		success: function(data) {
			var notice = jQuery('<div class="updated" data-notice-name="disabled"></div>').html(data);
			jQuery("h2:first").after(notice);
		}
	});
}

jQuery(document).ready(function(){
	/*
	jQuery('.log-type').tooltip({
		offset: [-3, 30],
		delay: 100,
	    relative: false,
	    position: 'bottom right',
	    opacity: 0.9
    });
    jQuery('.log-disable').tooltip({
		offset: [0, 10],
		delay: 100,
	    relative: false,
	    position: 'center right',
	    opacity: 0.9
    });
    */
   	jQuery(document).tooltip({
      	items: ".log-disable, .column-code",
      	content: function() {
	        var element = jQuery(this);
	        if (element.is('.log-disable')) {
	          	return element.attr( "title" );
	        }
	        if (element.is('.column-code')) {
	          	return element.find('.log-type').attr( "title" );
	        }
        },
        position: {
	        my: "left top",
        	at: "right+5 top-5"
      	}
    });
});
