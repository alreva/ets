var etsTfsX = (function ($, GM_xmlhttpRequest) {

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
            $(this).append('Authenticate by following <a href="http://tfs2010.it.volvo.net:8080/tfs/Global/SEGOT-eCom-VolvoPentaShop/EPC%202%20Project%20Board/_backlogs">this link</a> to be able to copy-paste from TFS');
        };

        $.fn.connectionFailedMessage = function () {
            $(this).append('!Failed to connect to TFS. Please check if you have VPN connection enabled and the  (<a href="http://tfs2010.it.volvo.net:8080/tfs/Global/SEGOT-eCom-VolvoPentaShop">TFS Web</a>) is accessible.');
        };

        var tfsActionMappings = [
              { pattern: 'User Recognition over VPPN', task: 'DEV - User Recognition via VPPN (unplanned)' }
            , { pattern: 'Catalog - POC Stock Status', task: 'DEV - Ctlg: POC Stock Status (unplanned)' }
            , { pattern: 'Architecture artifacts', task: 'DEV - Architecture Artifacts' }
            , { pattern: 'Home page - Provide a link from ROW catalog to selection or home page', task: 'DEV - Home: Link ROW' }
            , { pattern: 'Dealer locator', task: 'DEV - Home: Link ROW' }
            , { pattern: 'Set Model / Serial Number filters in URL', task: 'DEV - Home: Set Model' }
            , { pattern: 'Catalog POC Prices', task: 'DEV - Ctlg: Price POC' }
            , { pattern: 'Catalog - Calculate price based on price calculation strategy', task: 'DEV - Ctlg: Price Calc Strategy' }
            , { pattern: 'Prepared Search', task: 'DEV - Ctlg: Search' }
            , { pattern: 'Cart - POC Prices', task: 'DEV - Cart: POC Price' }
            , { pattern: 'Print cart', task: 'DEV - Cart: Print' }
            , { pattern: 'Export cart', task: 'DEV - Cart: Export' }
            , { pattern: 'US Checkout', task: 'DEV - Checkout' }
            , { pattern: 'Bulletins', task: 'DEV - Bulletins' }
            , { pattern: 'Browsers', task: 'DEV - Browsers' }
            , { pattern: 'Catalog - Accept links with filters from VPPN', task: 'DEV - Ctlg: Filters' }
            , { pattern: 'Add parts w/o prices', task: 'DEV - Cart: No Prices' }
            , { pattern: 'Catalog - Hide inventory', task: 'DEV - Ctlg: Hide Inventory' }
            , { pattern: 'Kits', task: 'DEV - Ctlg: Product Details Kits' }
            , { pattern: 'User recognition', task: 'DEV - User Recognition' }
            , { pattern: 'Select parts from images', task: 'DEV - Ctlg: Select Parts From Images' }
            , { pattern: 'Unplanned changes', task: 'Unplanned Changes - Nov 2014' }
            , { pattern: 'Demo Jan 8', task: 'Unplanned Changes - Nov 2014' }
        ];

        $.findTask = function (itemTitle) {
            var taskCandidates = tfsActionMappings.filter(function (elm) {
                return itemTitle.indexOf(elm.pattern) >= 0;
            });

            return taskCandidates.length > 0
                ? taskCandidates[0].task
                : '';
        }
    })($);

    var $desc = $('[name="effortRecordDescription"]');
    var $descTd = $desc.closest('TD');

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
                data: "wiql=SELECT [System.Id], [System.Title], [Microsoft.VSTS.Scheduling.RemainingWork] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] = 'Task' AND [System.State] <> 'Deleted' AND [System.State] <> 'Removed' AND ([System.IterationPath] UNDER 'SEGOT-eCom-VolvoPentaShop\\2014 - EPC 2\\EPC - Iteration 4 (W53 - W3)' OR [System.IterationPath] UNDER 'SEGOT-eCom-VolvoPentaShop\\2014 - EPC 2\\EPC - Iteration 5 (W4 - W5)') AND [System.AssignedTo] = @me ORDER BY [System.Title]"
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

                    $.each(rows, function (i, row) {

                        var itemTitle = row[1];
                        if (itemTitle.indexOf('EPC > ') == 0) {
                            itemTitle = itemTitle.substr('EPC > '.length);
                        }

                        if (itemTitle.indexOf('|EPC') >= 0) {
                            itemTitle = itemTitle.substr(0, itemTitle.length - '|EPC'.length).trim();
                        }

                        var title = 'TFS #' + row[0] + ' - ' + itemTitle;

                        var task = $.findTask(itemTitle);

                        var hours = row[2] || 0;
                        if (hours > 8) {
                            hours = 8;
                        }

                        shortcuts.push({
                            s: title,
                            p: 'VEPC2',
                            t: task,
                            h: hours,
                            o: 0,
                            d: title
                        });
                    });

                    var buildShortcutHtml = function (s) {
                        return '<div><a class="ets-shortcut" data-p="' + s.p + '" data-t="' + s.t + '" data-h="' + s.h + '" data-o="' + s.o + '" data-d="' + escape(s.d) + '" data-c="' + s.c + '">' + s.s + '</a></div>';
                    };

                    $.each(shortcuts, function () {
                        $descTd.append(buildShortcutHtml(this));
                    });

                    $('.ets-shortcut').etsShortcut();
                }
            });
        },
        onerror: function (xhr) {
            if (xhr.status == 404 || xhr.status == 401 || xhr.status == 302) {
                $descTd.tfsAuthLink();
            }
        },
        timeout: 5000,
        ontimeout: function () {
            $descTd.connectionFailedMessage();
        }
    });
});