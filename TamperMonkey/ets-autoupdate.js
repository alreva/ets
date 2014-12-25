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
        "https://rawgit.com/alreva/ets/master/TamperMonkey/ets.js",
        "https://rawgit.com/alreva/ets/master/TamperMonkey/ets-tfs.js"],
        function (_, v) {
            $.getScript(v, function (data, textStatus, jqxhr) {
                console.log(data); // Data returned
                console.log(textStatus); // Success
                console.log(jqxhr.status); // 200
                console.log("Load complete.");
            });
        });
});
