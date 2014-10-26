// ==UserScript==
// @name       TFS to ETS
// @namespace  http://timeserver.i.sigmasoftware.com
// @version    0.1
// @match      http://timeserver/accountreport.ets
// @match      https://timeserver/accountreport.ets
// @match      http://timeserver.i.sigmaukraine.com/accountreport.ets
// @match      https://timeserver.i.sigmaukraine.com/accountreport.ets
// @copyright  2014+, alreva

// @require		https://code.jquery.com/jquery-2.1.1.min.js
// @require		http://courses.ischool.berkeley.edu/i290-4/f09/resources/gm_jq_xhr.js

// @grant       GM_xmlhttpRequest

// ==/UserScript==

$(function () {

    var requestValidationTokenUri = 'http://tfs2010.it.volvo.net:8080/tfs/Global/SEGOT-eCom-VolvoPentaShop/EPC%202%20Project%20Board/_workitems';

    GM_xmlhttpRequest({
        method: "GET",
        url: "http://tfs2010.it.volvo.net:8080/tfs/Global/SEGOT-eCom-VolvoPentaShop/EPC%202%20Project%20Board/_workitems",
        onload: function (xhr) {
            var verificationToken = '';

            $.parseHTML(xhr.response).each(function (elm) {
                if (elm.name == '__RequestVerificationToken') {
                    verificationToken = elm.value;
                }
            });

            GM_xmlhttpRequest({
                method: "POST",
                url: "http://tfs2010.it.volvo.net:8080/tfs/Global/SEGOT-eCom-VolvoPentaShop/_api/_wit/query?__v=3",
                data: "wiql=select [System.Id], [System.WorkItemType], [System.Title], [Microsoft.VSTS.Scheduling.RemainingWork], [System.AssignedTo], [System.State], [System.Tags], [Microsoft.VSTS.Common.BacklogPriority] from WorkItemLinks where (Source.[System.TeamProject] = @project and Source.[System.AssignedTo] = @me and Source.[System.WorkItemType] <> '' and Source.[System.State] <> '' and Source.[System.IterationPath] under 'SEGOT-eCom-VolvoPentaShop\\2014 - EPC 2\\EPC - Iteration 1 (W44 - W46)') and ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') and (Target.[System.WorkItemType] <> '') order by [Microsoft.VSTS.Common.BacklogPriority], [System.Title] mode (Recursive)"
                + "&runQuery=true"
                + "&persistenceId=8da6aa2f-bcba-461e-9535-1e1469958c5a"
                + "&__RequestVerificationToken=" + verificationToken,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                onload: function (xhr) {
                    var rows = $.parseJSON(xhr.response).payload.rows;

                    var shortcuts = [];

                    $.each(rows, function (i, row) {
                        var title = 'TFS ' + row[0] + ' - ' + row[2];
                        shortcuts.push({
                            s: title,
                            p: 'VECOMMA',
                            t: 'MA - Enhancements (WBS is mandatory)',
                            h: 1,
                            o: 0,
                            d: 'WBS <C-18500-01-01-10> ' + title
                        });
                    });

                    var $desc = $('[name="effortRecordDescription"]');

                    var $descTd = $desc.closest('TD');

                    var buildShortcutHtml = function (s) {
                        return '<div><a class="ets-shortcut" data-p="' + s.p + '" data-t="' + s.t + '" data-h="' + s.h + '" data-o="' + s.o + '" data-d="' + escape(s.d) + '" data-c="' + s.c + '">' + s.s + '</a></div>';
                    };

                    $.each(shortcuts, function () {
                        $descTd.append(buildShortcutHtml(this));
                    });

                    $('.ets-shortcut').etsShortcut();
                }
            });
        }
    });
});

(function() {

    var $proj = $('#effortRecordProjectCode');
    var $task = $('#effortRecordIssueCode');
    var $time = $('[name="effortRecordEffort"]');
    var $ot = $('[name="effortRecordEffortOvertime"]');
    var $desc = $('[name="effortRecordDescription"]');
    var $costC = $('#costCenterAccount');

    var pasteRecord = function (r) {

        $proj.val(r.p);
        $time.val(r.h);
        $ot.val(r.o);
        $desc.val(r.d);

        if (r.c) {
            $costC.val(r.c);
        }

        $proj.change();

        setTimeout(function () {
            var $selectedOption = $('option:contains("' + r.t + '")');
            $task.val($selectedOption.val());
            $task.change();
        }, 1000);
    };

    $.fn.etsShortcut = function () {

        $(this).click(function() {

            var $shortcut = $(this);

            pasteRecord({
                p: $shortcut.data('p'),
                h: $shortcut.data('h'),
                o: $shortcut.data('o'),
                d: unescape($shortcut.data('d')),
                c: $shortcut.data('c'),
                t: $shortcut.data('t')
            });
        });

    };
})(this);
