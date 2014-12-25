// ==UserScript==
// @name       TFS to ETS Autoupdate
// @namespace  http://timeserver.i.sigmasoftware.com
// @version    0.1
// @match      http://timeserver/accountreport.ets
// @match      https://timeserver/accountreport.ets
// @match      http://timeserver.i.sigmaukraine.com/accountreport.ets
// @match      https://timeserver.i.sigmaukraine.com/accountreport.ets
// @copyright  2014+, alreva

// @grant       GM_xmlhttpRequest

// @require		https://code.jquery.com/jquery-2.1.1.min.js
// @require		http://courses.ischool.berkeley.edu/i290-4/f09/resources/gm_jq_xhr.js
// ==/UserScript==

$(function () {
    $.each([
        { s: "https://rawgit.com/alreva/ets/master/TamperMonkey/ets.js", c: (function () { etsX($); }) },
        { s: "https://rawgit.com/alreva/ets/master/TamperMonkey/ets-tfs.js", c: (function () { etsTfsX($, GM_xmlhttpRequest); }) }],
        function (_, v) {
            console.log("Loaging: '" + v.s + "'...");
            $.getScript(v.s, function (data, textStatus, jqxhr) {
                console.log("Loaded:  '" + v.s + "'");
                console.log("Running: '" + v.s + "'...");
                v.c();
                console.log("Run OK:  '" + v.s + "'");
            });
        });
});
