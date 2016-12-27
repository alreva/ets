// ==UserScript==
// @name         TFS ETS Reporting
// @namespace    http://timeserver
// @version      0.3
// @description  this one helps properly reporting ETS with TFS items.
// @author       areva
// @match        timeserver/timereports.ets
// @match        timeserver.i.sigmaukraine.com/timereports.ets
// @match        ets.sigmaukraine.com:7443/timereports.ets

// @grant        GM_xmlhttpRequest

// @require      https://code.jquery.com/jquery-2.1.4.min.js

// ==/UserScript==

(() => {

    "use strict";

    const sprintSettingsItemId = '73204';

    const author = "oleksandr.reva@sigma.software";
    const tfsSite = "http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/";

    const $proj = $('#effortRecordProjectCode');
    const $task = $('#effortRecordIssueCode');
    const $time = $('[name="effortRecordEffort"]');
    const $ot = $('[name="effortRecordEffortOvertime"]');
    const $desc = $('[name="effortRecordDescription"]');
    const $costC = $('#costCenterAccount');
    const $descTd = $desc.closest('TD');

    const $taskSelected = $('<input id="etsTfsTask" type="hidden" />').appendTo("body");
    const $tagSelected = $('<input id="etsTfsTag" type="hidden" />').appendTo("body");

    const pasteRecord = r => {

        $proj.val(r.p);
        $time.val(r.h);
        $ot.val(r.o);
        $desc.val(r.d);

        if (r.c) {
            $costC.val(r.c);
        }

        $taskSelected.val(r.t);
        $tagSelected.val(r.tag);
        $proj.change();
    };

    const sleep = duration => {
        return new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve(`Timeout ${duration} passed.`);
            }, duration);
        });
    };

    (() => {

        $('body').on('DOMNodeInserted', evt => {

            if ($taskSelected.val() && $(evt.target).closest("#effortRecordIssueCode").length > 0) {
                const $selectedOption = $(`#effortRecordIssueCode option:contains("${$taskSelected.val()}")`);
                const $dropFown = $("#effortRecordIssueCode");

                if ($selectedOption.length > 0) {
                    $dropFown.val($selectedOption.val());
                }

                sleep(100).then(() => {
                    const changeEvent = document.createEvent("HTMLEvents");
                    changeEvent.initEvent("change", true, true);
                    $dropFown[0].dispatchEvent(changeEvent)
                });
            }

            if ($tagSelected.val() && $(evt.target).closest("select.tag").length > 0) {
                const $selectedOption = $(`select.tag option:contains("${$tagSelected.val()}")`);
                const $dropFown = $("select.tag");

                if ($selectedOption.length > 0) {
                    $dropFown.val($selectedOption.val());
                }

                sleep(100).then(() => {
                    const changeEvent = document.createEvent("HTMLEvents");
                    changeEvent.initEvent("change", true, true);
                    $dropFown[0].dispatchEvent(changeEvent);
                });
            }
        });
    })();

    const loadjscssfile = (filename, filetype) => {
        var fileref = "";
        if (filetype === "js") {
            fileref = document.createElement('script');
            fileref.setAttribute("type", "text/javascript");
            fileref.setAttribute("src", filename);
        } else if (filetype === "css") {
            fileref = document.createElement("link");
            fileref.setAttribute("rel", "stylesheet");
            fileref.setAttribute("type", "text/css");
            fileref.setAttribute("href", filename);
        }
        document.getElementsByTagName("body")[0].appendChild(fileref);
    }


    const parseJsonOverEval = str => {
        let result = null;

        const parse = json => {
            result = json;
        }

        eval("parse(" + str + ");");
        return result;
    }

    const parseJsonDate = s => {

        if (typeof s === 'string') {
            const a = /\/Date\((\d*)\)\//.exec(s);
            if (a) {
                return new Date(+a[1]);
            }
        }

        return undefined;
    };

    const pickMapping = (mappings, item) => {
        const iterationPath = item[13];
        const areaPath = item[12];

        const mappingCandidates = mappings
            .filter(elm => areaPath.toUpperCase().indexOf(elm.area.toUpperCase()) === 0
                    && elm.iterations.filter(elm => elm.indexOf('@') >= 0 || iterationPath.toUpperCase().indexOf(elm.toUpperCase()) === 0).length > 0);

        return mappingCandidates.length > 0
            ? mappingCandidates[0]
            : {
                "area": areaPath,
                "iterations": [iterationPath],
                "project": undefined,
                "defaultTask": "none",
                "tasks": [],
                "descriptionPattern": "parent.type + ' #' + parent.id + ' ' + title"
            };
    }

    const etsShortcut = shortcut => {
        $(shortcut).click(evt => {

            const $shortcut = $(evt.target);

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

    const findTask = (mapping, itemTitle) => {

        const taskCandidates = mapping.tasks.filter(elm => itemTitle.toUpperCase().indexOf(elm[0].toUpperCase()) >= 0);

        return taskCandidates.length > 0
            ? taskCandidates[0][1]
            : mapping.defaultTask;
    };

    const escapeDoubleQuote = s => {
        return s;
    };

    const showSpinner = () => {
        $descTd.append($(`<i class="fa fa-spinner fa-2 icon-spin fa-spin" aria-hidden="true" style="font-size:2em;"></i>`));
    };

    const hideSpinner = () => {
        $(".fa.fa-spinner").remove();
    };

    const errorReasons = {
        timeout: "Timeout",
        applicationError: "Application error",
        authorization: "Not authorized"
    }

    const rejectDueToTimeout = reject => {
        reject({
            reason: errorReasons.timeout,
            reference: tfsSite
        });
    };

    const rejectDueToAuthorization = reject => {
        reject({
            reason: errorReasons.authorization,
            reference: tfsSite
        });
    };

    const rejectDueToApplicationError = (reject, message) => {
        reject({
            reason: errorReasons.applicationError,
            message: message,
            reference: author
        });
    };

    const queryMappingsAttachment = () => {
        return new Promise((resolve, reject) => {

            GM_xmlhttpRequest({
                method: "GET",
                url: `http://tfs.it.volvo.net:8080/tfs/Global3/_api/_wit/workitems?__v=5&ids=${sprintSettingsItemId}`,
                headers: {
                    "Content-Type": "application/json"
                },
                onload: xhr => {

                    if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                        rejectDueToAuthorization(reject);
                        return;
                    }

                    const mappingsAttachment = $.parseJSON(xhr.response).__wrappedArray[0]
                        .files
                        .filter(elm =>
                            elm.OriginalName == "ets-tfs-mappings.json"
                            && parseJsonDate(elm.RemovedDate) > new Date())[0];

                    if (mappingsAttachment) {
                        resolve(mappingsAttachment);
                    } else {
                        rejectDueToApplicationError(reject,
                            `Failed to get mappings attachment in the ${sprintSettingsItemId}. Please contact ${author} to fix the problem.`);
                        return;
                    }
                },
                timeout: 5000,
                ontimeout: () => {
                    rejectDueToTimeout(reject);
                }
            });
        });
    }

    const getVerificationToken = () => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/_workitems",
                onload: xhr => {

                    if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                        rejectDueToAuthorization(reject);
                        return;
                    }

                    const verificationToken = $.parseHTML(xhr.response)
                        .map(elm => elm.name == '__RequestVerificationToken' ? elm.value : undefined)
                        .reduce((agg, e) => agg || e, undefined);

                    if (verificationToken) {
                        resolve(verificationToken);
                    } else {
                        rejectDueToApplicationError(reject,
                             `Could not get verification token. Please contact ${author} to fix the problem.`);
                        return;
                    }
                },
                timeout: 5000,
                ontimeout: () => {
                    rejectDueToTimeout(reject);
                }
            });
        });
    };

    const queryMappings = mappingsAttachmentId => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `http://tfs.it.volvo.net:8080/tfs/Global3/_api/_wit/DownloadAttachment?fileName=attachment.dat&attachmentId=${mappingsAttachmentId}&contentOnly=true&__v=5`,
                headers: {
                    "Content-Type": "application/json"
                },
                onload: xhr => {

                    if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                        rejectDueToAuthorization(reject);
                        return;
                    }

                    const etsTfsMappings = parseJsonOverEval(xhr.response);

                    if (etsTfsMappings) {
                        resolve(etsTfsMappings);
                    } else {
                        rejectDueToApplicationError(reject,
                            `Failed to get ETS mappings from the attachment ${mappingsAttachmentId}`);
                        return;
                    }
                },
                timeout: 5000,
                ontimeout: () => {
                    rejectDueToTimeout(reject);
                }
            });
        });
    };

    const queryWorkItems = (etsTfsMappings, verificationToken) => {
        return new Promise((resolve, reject) => {
            const iterationsAndAreasCondition = `(${etsTfsMappings
                .map(elm => `((${elm.iterations
                    .map(elm => elm[0] == '@'
                        ? `[Target].[System.IterationPath] UNDER ${elm}`
                        : `[Target].[System.IterationPath] UNDER '${elm}'`)
                    .join(" OR ")}) AND [Target].[System.AreaPath] UNDER '${elm.area}')`)
                .join(" OR ")})`;

            const url = "http://tfs.it.volvo.net:8080/tfs/Global3/SEGOT-eCom-CORE/_api/_wit/query?__v=3";
            const data = `wiql=SELECT [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.BacklogPriority], [Microsoft.VSTS.Common.Severity], [System.Title], [System.State], [Microsoft.VSTS.Scheduling.Effort], [Microsoft.VSTS.Scheduling.RemainingWork], [Volvo.Custom.eCOMCore.FixedDate], [System.AssignedTo], [Volvo.Custom.eCOMCore.CaseOrigin], [System.AreaPath], [System.IterationPath] FROM WorkItemLinks WHERE ([Source].[System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'  AND  [Source].[System.State] IN ('New', 'Approved', 'Committed', 'Done')) And ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') And ([Target].[System.WorkItemType] IN GROUP 'Microsoft.TaskCategory' AND ${iterationsAndAreasCondition}  AND  [Target].[System.State] IN ('To Do', 'In Progress', 'Done')  AND  [Target].[System.AssignedTo] = @me) ORDER BY [Microsoft.VSTS.Common.Severity] mode(Recursive,ReturnMatchingChildren)&runQuery=true&__RequestVerificationToken=${verificationToken}`

            console.log('Querying TFS:');
            console.log({url, query: data});

            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                data: data,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                onload: xhr => {

                    if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                        rejectDueToAuthorization(reject);
                        return;
                    }

                    const response = $.parseJSON(xhr.response);
                    
                    console.log(response);

                    if (response.error) {
                        rejectDueToApplicationError(reject,
                            `TFS work items query failed. Please contact ${author} to fix the problem. Query details: ${{ url: url, data: data }}`);
                        return;
                    }

                    const rows = $.parseJSON(xhr.response).payload.rows;
                    resolve(rows);
                },
                timeout: 5000,
                ontimeout: () => {
                    rejectDueToTimeout(reject);
                }
            });
        });
    };

    const buildTfsTaskControls = (rows, etsTfsMappings) => {
        const shortcuts = [];
        let parent = {};

        $.each(rows, (i, row) => {

            const mapping = pickMapping(etsTfsMappings, row);

/*

            0: 110965
            1: "Bug"
            2:"SEGOT-eCom-CORE"
            3:1999999808
            4:"3 - Medium"
            5:"TSU > WAT > The system does not notify the user when he creates a new product with existing productid "
            6:"Done"
            7:null
            8:null
            9:null
            10:"Vorona Yulia <VCN\a080033>"
            11:"Stabilization"
            12:"SEGOT-eCom-CORE\TSU\Common\Okelia WAT"
            13:"SEGOT-eCom-CORE\Sprint 22"

 */


            const itemTitle = row[5];
            const itemType = row[1] == "Product Backlog Item" ? "PBI" : row[1];
            const itemId = row[0];
            const hours = Math.min(parseFloat(row[8]) || 1, 8);
            const title = `${itemType} #${itemId} - ${itemTitle}`;
            const task = findTask(mapping, itemTitle);

            if (itemType != "Task") {
                parent = {
                    id: itemId,
                    type: itemType,
                    title: itemTitle
                };
            }

            let etsDescription = "";
            try {
                eval(`etsDescription = ${mapping.descriptionPattern};`);
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

        const buildShortcutHtml = s => s.type != "Task"
                ? `<div style="width:${$desc.width()}px;overflow:hidden;text-overflow:ellipsis" class="ets-shortcut"

                    data-p="${s.p}"
                    data-t="${s.t}"
                    data-h="${s.h}"
                    data-o="${s.o}"
                    data-d="${escape(s.d)}"
                    data-c="${s.c}"
                    data-tag="${s.tag || ""}"

                    title="${escapeDoubleQuote(s.d)}">${s.s}</div>`
                : `<div style="padding-left:10px"><a style="width:${$desc.width()}px;display:inline-block;overflow:hidden;text-overflow:ellipsis" class="ets-shortcut"

                    data-p="${s.p}"
                    data-t="${s.t}"
                    data-h="${s.h}"
                    data-o="${s.o}"
                    data-d="${escape(s.d)}"
                    data-c="${s.c}"
                    data-tag="${s.tag || ""}"

                    title="${escapeDoubleQuote(s.d)}">${s.s}</a></div>`;

        $.each(shortcuts, (i, v) => {
            $descTd.append(buildShortcutHtml(v));
        });

        $('.ets-shortcut').each((i, v) => {
            etsShortcut(v);
        });
    };

    let attachment, verificationToken, etsTfsMappings;

    loadjscssfile("https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css", "css");
    showSpinner();

    Promise.all([queryMappingsAttachment(), getVerificationToken()])
    .then(values => {
        attachment = values[0];
        verificationToken = values[1];
    })
    .then(() => queryMappings(attachment.ExtID))
    .then(mappings => {
        etsTfsMappings = mappings;
        return queryWorkItems(mappings, verificationToken);
    })
    .then(rows => {
        hideSpinner();
        buildTfsTaskControls(rows, etsTfsMappings);
    })
    .catch(e => {
        console.error(e);
        hideSpinner();
        switch (e.reason) {
            case errorReasons.timeout:
                $descTd.append($(`<div>Failed to connect to TFS. Please check if you have VPN connection enabled and the  (<a href="${e.reference}" target="_blank">TFS Web</a>) is accessible.</div>`));
                break;
            case errorReasons.applicationError:
                $descTd.append($(`<div>${e.message}</div>`));
                break;
            case errorReasons.authorization:
                $descTd.append($(`<div>Authenticate by following <a href="${e.reference}" target="_blank">this link</a> to be able to copy-paste from TFS<div>`));
                break;
        }
    });

})();