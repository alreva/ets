// ==UserScript==
// @name         VCE TFS ETS reporting
// @namespace    http://timeserver
// @version      0.1
// @description  this one helps properly reporting ETS with TFS items.
// @author       areva
// @match        timeserver/accountreport.ets
// @match        ets.sigmaukraine.com:7443/accountreport.ets

// @grant        GM_xmlhttpRequest

// @require      https://code.jquery.com/jquery-2.1.4.min.js

// ==/UserScript==

(function ($) {

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

        $(this).click(function () {

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

    $.fn.tfsAuthLink = function () {
        $(this).append('Authenticate by following <a href="http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/VCE%20Team/">this link</a> to be able to copy-paste from TFS');
    };

    $.fn.connectionFailedMessage = function () {
        $(this).append('!Failed to connect to TFS. Please check if you have VPN connection enabled and the  (<a href="http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/VCE%20Team/">TFS Web</a>) is accessible.');
    };

    var tfsActionMappings = [
            ["- Requirements analysis and clarification", "Development, Web Shop Features"],
            ["- Technical design", "Development, Web Shop Features"],
            ["- Technical design review", "TL Activities"],
            ["- Unit tests development", "Development, Web Shop Features"],
            ["- Development", "Development, Web Shop Features"],
            ["- Code review", "TL Activities"],
            [" (CODE REVIEW", "TL Activities"],
            ["- UI tests", "Automation tests development"],
            ["- Manual testing", "Testing (Manual)"],
            ["- Documentation update", "Development, Web Shop Features"],
            ["(DOCUMENTATION REVIEW)", "TL Activities"],
            ["- Documentation review", "TL Activities"]
    ];

    $.findTask = function (itemTitle) {
        var taskCandidates = tfsActionMappings.filter(function (elm) {
            return itemTitle.toUpperCase().indexOf(elm[0].toUpperCase()) >= 0;
        });

        return taskCandidates.length > 0
            ? taskCandidates[0][1]
            : 'Development, Web Shop Features';
    }
	
	var escapeDoubleQuote = function(s) {
		return s;
	}


    var $descTd = $desc.closest('TD');

    GM_xmlhttpRequest({
        method: "GET",
        url: "http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/VCE%20Team/_workitems",
        onload: function (xhr) {
		
            var verificationToken = '';

            $.parseHTML(xhr.response).each(function (elm) {
                if (elm.name == '__RequestVerificationToken') {
                    verificationToken = elm.value;
                }
            });

            GM_xmlhttpRequest({
                method: "POST",
                url: "http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/VCE%20Team/_api/_wit/query?__v=3",
                data: "wiql=SELECT [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.BacklogPriority], [Microsoft.VSTS.Common.Severity], [System.Title], [System.State], [Microsoft.VSTS.Scheduling.Effort], [Microsoft.VSTS.Scheduling.RemainingWork], [Volvo.Custom.eCOMCore.FixedDate], [System.AssignedTo], [Volvo.Custom.eCOMCore.CaseOrigin], [System.AreaPath], [System.IterationPath] FROM WorkItemLinks WHERE ([Source].[System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'  AND  [Source].[System.State] IN ('New', 'Approved', 'Committed', 'Done')) And ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') And ([Target].[System.WorkItemType] IN GROUP 'Microsoft.TaskCategory'  AND  [Target].[System.IterationPath] UNDER 'SEGOT-eCom-CORE\\VCE\\VCE EMEA\\Stabilization\\Stabilization W33 - W35'  AND  [Target].[System.State] IN ('To Do', 'In Progress', 'Done')  AND  [Target].[System.AreaPath] UNDER 'SEGOT-eCom-CORE\\VCE'  AND  [Target].[System.AssignedTo] = @me) ORDER BY [Microsoft.VSTS.Common.Severity] mode(Recursive,ReturnMatchingChildren)"
					+ "&runQuery=true"
					+ "&persistenceId=8da6aa2f-bcba-461e-9535-1e1469958c5a"
					+ "&__RequestVerificationToken=" + verificationToken,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                onload: function (xhr) {

                    if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                        $descTd.tfsAuthLink();
                        return;
                    }
					
                    var rows = $.parseJSON(xhr.response).payload.rows;

                    var shortcuts = [];

                    var currentParent = {};

                    $.each(rows, function (i, row) {
						/*
						
						0	  67327,
						1	  "Bug",
						2	  132892366,
						3	  "1 - Critical",
						4	  "VCE EMEA > Available quantity is not updated in a correct way when parts inventory file is sent",
						5	  "Committed",
						6	  1,
						7	  null,
						8	  "/Date(1439499600000)/",
						9	  "Sugak Alexander (Consultant)",
						10	  "End-Customer",
						11	  "SEGOT-eCom-CORE\VCE\VCE EMEA\Integration",
						12	  "SEGOT-eCom-CORE\VCE\VCE EMEA\Stabilization\Stabilization W33 - W35"

						*/
                        var itemTitle = row[4];
						var itemType = row[1];
						if (itemType == "Product Backlog Item") {
						    itemType = "PBI";
						}
						var itemId = row[0];
						var hours = parseFloat(row[7]) || 1;
						if (hours > 8) {
                            hours = 8;
                        }
						
                        if (itemTitle.indexOf('EPC > ') == 0) {
                            itemTitle = itemTitle.substr('EPC > '.length);
                        }

                        if (itemTitle.indexOf('|EPC') >= 0) {
                            itemTitle = itemTitle.substr(0, itemTitle.length - '|EPC'.length).trim();
                        }

                        var title = itemType + ' #' + itemId + ' - ' + itemTitle;

                        var task = $.findTask(itemTitle);

                        if (itemType != "Task") {
                            currentParent = {
                                id: itemId,
                                type: itemType
                            };
                        }

                        var etsDescription = currentParent.type + ' #' + currentParent.id + ' - ' + itemTitle;

                        shortcuts.push({
                            s: title,
                            p: 'VCESEMEA',
                            t: task,
                            h: hours,
                            o: 0,
                            d: etsDescription,
                            type: itemType
                        });
                    });

                    var buildShortcutHtml = function (s) {
                        if (s.type != "Task"){
							return '<div style="width:' + $desc.width() + 'px;overflow:hidden;text-overflow:ellipsis" class="ets-shortcut" data-p="' + s.p + '" data-t="' + s.t + '" data-h="' + s.h + '" data-o="' + s.o + '" data-d="' + escape(s.d) + '" data-c="' + s.c + '" title="' + escapeDoubleQuote(s.d) + '">' + s.s + '</div>';
						} 
                        return '<div style="padding-left:10px"><a style="width:' + $desc.width() + 'px;display:inline-block;overflow:hidden;text-overflow:ellipsis" class="ets-shortcut" data-p="' + s.p + '" data-t="' + s.t + '" data-h="' + s.h + '" data-o="' + s.o + '" data-d="' + escape(s.d) + '" data-c="' + s.c + '" title="' + escapeDoubleQuote(s.d) + '">' + s.s + '</a></div>';
                    };

                    $.each(shortcuts, function () {
                        $descTd.append(buildShortcutHtml(this));
                    });

                    $('.ets-shortcut').etsShortcut();
                },
				timeout: 15000,
				ontimeout: function () {
					$descTd.connectionFailedMessage();
				}
			});
        },
        onerror: function (xhr) {
            if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                $descTd.tfsAuthLink();
            }
        },
        timeout: 15000,
        ontimeout: function () {
            $descTd.connectionFailedMessage();
        }
    });

})(jQuery);