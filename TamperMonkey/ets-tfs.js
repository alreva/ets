// ==UserScript==
// @name         TFS ETS Reporting
// @namespace    http://timeserver
// @version      0.2
// @description  this one helps properly reporting ETS with TFS items.
// @author       areva
// @match        timeserver/accountreport.ets
// @match        timeserver.i.sigmaukraine.com/accountreport.ets
// @match        ets.sigmaukraine.com:7443/accountreport.ets

// @grant        GM_xmlhttpRequest

// @require      https://code.jquery.com/jquery-2.1.4.min.js

// ==/UserScript==

(function ($) {

    var sprintSettingsItemId = 73204;

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

            if (r.tag) {
                var $selectedTagOption = $('select.tag option:contains("' + r.tag + '")');
                var $tagSelect = $('select.tag');
                $tagSelect.val($selectedTagOption.val());
                var changeEvent = document.createEvent("HTMLEvents");
                changeEvent.initEvent("change", true, true);
                $tagSelect[0].dispatchEvent(changeEvent);
            }

        }, 1000);
    };

    var parseJsonOverEval = function (str) {
        var result = null;

        var parse = function (json) {
            result = json;
        }

        eval("parse(" + str + ");");
        return result;
    }

    var parseJsonDate = function (s) {
        var a;
        if (typeof s === 'string') {
            a = /\/Date\((\d*)\)\//.exec(s);
            if (a) {
                return new Date(+a[1]);
            }
        }
        return undefined;
    };

    var pickMapping = function (mappings, item) {
        var iterationPath = item[12];
        var areaPath = item[11];

        var mappingCandidates = mappings
            .filter(function (elm) {
                return areaPath.toUpperCase().indexOf(elm.area.toUpperCase()) === 0
                    && elm.iterations.filter(function (elm) { return iterationPath.toUpperCase().indexOf(elm.toUpperCase()) === 0 }).length > 0;
            });

        if (mappingCandidates.length > 0) {
            return mappingCandidates[0];
        }

        return undefined;
    }

    $.fn.etsShortcut = function () {

        $(this).click(function () {

            var $shortcut = $(this);

            pasteRecord({
                p: $shortcut.data('p'),
                h: $shortcut.data('h'),
                o: $shortcut.data('o'),
                d: unescape($shortcut.data('d')),
                c: $shortcut.data('c'),
                t: $shortcut.data('t'),
                tag: $shortcut.data('tag')
            });
        });
    };

    $.fn.tfsAuthLink = function () {
        $(this).append('Authenticate by following <a href="http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/VCE%20Team/">this link</a> to be able to copy-paste from TFS');
    };

    $.fn.connectionFailedMessage = function () {
        $(this).append('!Failed to connect to TFS. Please check if you have VPN connection enabled and the  (<a href="http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/VCE%20Team/">TFS Web</a>) is accessible.');
    };

    var findTask = function (mapping, itemTitle) {
        var taskCandidates = mapping.tasks.filter(function (elm) {
            return itemTitle.toUpperCase().indexOf(elm[0].toUpperCase()) >= 0;
        });

        return taskCandidates.length > 0
            ? taskCandidates[0][1]
            : mapping.defaultTask;
    }

    var escapeDoubleQuote = function (s) {
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
                method: "GET",
                url: "http://tfs.it.volvo.net:8080/tfs/Global3/_api/_wit/workitems?__v=5&ids=" + sprintSettingsItemId,
                headers: {
                    "Content-Type": "application/json"
                },
                onload: function (xhr) {

                    if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                        $descTd.tfsAuthLink();
                        return;
                    }

                    var mappingsAttachment = $.parseJSON(xhr.response).__wrappedArray[0]
                        .files
                        .filter(function (elm) {
                            return elm.OriginalName == "ets-tfs-mappings.json"
                                && parseJsonDate(elm.RemovedDate) > new Date();
                        })[0];

                    GM_xmlhttpRequest({
                        method: "GET",
                        url: "http://tfs.it.volvo.net:8080/tfs/Global3/_api/_wit/DownloadAttachment?fileName=attachment.dat&attachmentId=" + mappingsAttachment.ExtID + "&contentOnly=true&__v=5",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        onload: function (xhr) {

                            if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                                $descTd.tfsAuthLink();
                                return;
                            }

                            var etsTfsMappings = parseJsonOverEval(xhr.response);

                            var iterationsAndAreasCondition = "(" + etsTfsMappings.map(function (elm) {

                                var iterationsCondition = "(" + elm.iterations.map(function (elm) {
                                    return "[Target].[System.IterationPath] UNDER '" + elm + "'";
                                }).join(" OR ") + ")";

                                return "(" + iterationsCondition + " AND [Target].[System.AreaPath] UNDER '" + elm.area + "')";
                            }).join(" OR ") + ")";

                            GM_xmlhttpRequest({
                                method: "POST",
                                url: "http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/VCE%20Team/_api/_wit/query?__v=3",
                                data: "wiql=SELECT [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.BacklogPriority], [Microsoft.VSTS.Common.Severity], [System.Title], [System.State], [Microsoft.VSTS.Scheduling.Effort], [Microsoft.VSTS.Scheduling.RemainingWork], [Volvo.Custom.eCOMCore.FixedDate], [System.AssignedTo], [Volvo.Custom.eCOMCore.CaseOrigin], [System.AreaPath], [System.IterationPath] FROM WorkItemLinks WHERE ([Source].[System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'  AND  [Source].[System.State] IN ('New', 'Approved', 'Committed', 'Done')) And ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') And ([Target].[System.WorkItemType] IN GROUP 'Microsoft.TaskCategory' AND " + iterationsAndAreasCondition + "  AND  [Target].[System.State] IN ('To Do', 'In Progress', 'Done')  AND  [Target].[System.AssignedTo] = @me) ORDER BY [Microsoft.VSTS.Common.Severity] mode(Recursive,ReturnMatchingChildren)"
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

                                    var parent = {};

                                    $.each(rows, function (i, row) {

                                        var mapping = pickMapping(etsTfsMappings, row);

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

                                        var title = itemType + ' #' + itemId + ' - ' + itemTitle;

                                        var task = findTask(mapping, itemTitle);

                                        if (itemType != "Task") {
                                            parent = {
                                                id: itemId,
                                                type: itemType,
                                                title: itemTitle
                                            };
                                        }

                                        var etsDescription = "";
                                        try {
                                            eval("etsDescription = " + mapping.descriptionPattern + ";");

                                        } catch (e) {
                                            console.log("Failed to build ETS Description field because of an error. Work item title will be used instead. Error details: " + e);
                                            etsDescription = itemTitle;
                                        }

                                        shortcuts.push({
                                            s: title,
                                            p: mapping.project,
                                            t: task,
                                            h: hours,
                                            o: 0,
                                            d: etsDescription,
                                            type: itemType,
                                            tag: mapping.tag
                                        });
                                    });

                                    var buildShortcutHtml = function (s) {
                                        if (s.type != "Task") {
                                            return '<div style="width:' + $desc.width() + 'px;overflow:hidden;text-overflow:ellipsis" class="ets-shortcut" data-p="' + s.p + '" data-t="' + s.t + '" data-h="' + s.h + '" data-o="' + s.o + '" data-d="' + escape(s.d) + '" data-c="' + s.c + '" data-tag="' + (s.tag || "") + '" title="' + escapeDoubleQuote(s.d) + '">' + s.s + '</div>';
                                        }
                                        return '<div style="padding-left:10px"><a style="width:' + $desc.width() + 'px;display:inline-block;overflow:hidden;text-overflow:ellipsis" class="ets-shortcut" data-p="' + s.p + '" data-t="' + s.t + '" data-h="' + s.h + '" data-o="' + s.o + '" data-d="' + escape(s.d) + '" data-c="' + s.c + '" data-tag="' + (s.tag || "") + '" title="' + escapeDoubleQuote(s.d) + '">' + s.s + '</a></div>';
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
                        timeout: 15000,
                        ontimeout: function () {
                            $descTd.connectionFailedMessage();
                        }
                    });

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