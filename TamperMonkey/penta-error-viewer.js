// ==UserScript==
// @name         Penta error viewer redirect
// @namespace    urn:www-st.volvopentashop.com
// @version      0.1
// @description  Penta error viewer redirect
// @author       Alex Reva
// @match        http://www-st.volvopentashop.com/*
// @match        https://vppneuappsqa.volvo.com/oes-sit/*
// @grant        none

// @require      https://code.jquery.com/jquery-2.1.3.min.js

// ==/UserScript==

$(function(){
    if (document.location.href.indexOf('/Error/Index/') >= 0) {
        document.location.href = document.location.href
        	.replace('/en-GB/', '/')
        	.replace('/fr-FR/', '/')
        	.replace('/de-DE/', '/')
        	.replace('/es-ES/', '/')
        	.replace('/fi-FI/', '/')
        	.replace('/da-DK/', '/')
        	.replace('/it-IT/', '/')
        	.replace('/nb-NO/', '/')
        	.replace('/sv-SE/', '/')
        	.replace('/Error/Index/', '/e/?eid=')
    }
});
