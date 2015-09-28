// ==UserScript==
// @name         ETS Improvements
// @namespace    http://timeserver
// @version      0.1
// @description  this one helps filling out ETS faster.
// @author       areva
// @match        timeserver/accountreport.ets
// @match        timeserver.i.sigmaukraine.com/accountreport.ets
// @match        ets.sigmaukraine.com:7443/accountreport.ets

// @grant        GM_xmlhttpRequest

// @require      https://code.jquery.com/jquery-2.1.4.min.js
// @require		 http://courses.ischool.berkeley.edu/i290-4/f09/resources/gm_jq_xhr.js

// ==/UserScript==

(function ($) {
    var $proj = $('#effortRecordProjectCode');
    var $task = $('#effortRecordIssueCode');
    var $time = $('[name="effortRecordEffort"]');
    var $ot = $('[name="effortRecordEffortOvertime"]');
    var $desc = $('[name="effortRecordDescription"]');
    var $costC = $('#costCenterAccount');
    var getTagSelect = function () { return $('select.tag') };


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

            var $selectedTaskOption = $('option:contains("' + r.t + '")');
            $task.val($selectedTaskOption.val());

            if (r.tag) {
                var $selectedTagOption = $('select.tag option:contains("' + r.tag + '")');
                var $tagSelect = $('select.tag');
                $tagSelect.val($selectedTagOption.val());
                var changeEvent = document.createEvent("HTMLEvents");
                changeEvent.initEvent("change", true, true);
                $tagSelect[0].dispatchEvent(changeEvent);

                //var evt = $.Event("change", {"bubbles": true, "cancelable": true});
                //$tagSelect.trigger(evt);

                //$tagSelect.change();
            }

            $task.change();
        }, 1000);
    };

    var getDescriptionFromRow = function ($row) {

        var fullDescription = $row.find('td.TableCellContent.whsp_normal div[id^="hintabletextfull"]').text().trim();

        if (fullDescription) {
            return fullDescription;
        }

        return $row.find('td.TableCellContent.whsp_normal div').text().trim();
    }

    var getTaskFromRow = function ($row) {

        var $taskAndTags = $row.find('td.TableCellContent.tooltip');
        var $copy = $("<div>" + $taskAndTags.html() + "</div>");
        $copy.find("span").remove();
        return $copy.text().trim();
    }

    var getTagFromRow = function ($row, tagName) {

        var tagsStr = $row.find("td.TableCellContent.tooltip span").text().trim();

        if (tagsStr.length < 1) {
            return undefined;
        }

        // currently there is no info on how the splitter for tags should look like, so considering there is a single tag.
        var tag = tagsStr.split("|");

        return tag[0].trim().toUpperCase() == tagName.toUpperCase()
            ? tag[1].trim()
            : undefined;
    }

    $.addGlobalStyle = function (css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) {
            return;
        }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
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

    $.fn.etsCopy = function () {

        $(this).click(function () {

            var $btn = $(this);
            var $row = $btn.closest('tr');

            pasteRecord({
                p: $row.find('td:nth-child(6)').text().trim(),
                t: getTaskFromRow($row),
                h: $row.find('td:nth-child(9)').text().trim(),
                o: $row.find('td:nth-child(10)').text().trim(),
                d: getDescriptionFromRow($row),
                c: '',
                tag: getTagFromRow($row, 'Customer')
            });

            return false;
        });
    };

    $.fn.etsDateButtons = function () {
        $(this).each(function () {
            var $datePicker = $(this);
            var $parent = $datePicker.parent();
            var dmy = $datePicker.val().split('.');
            var d = new Date(dmy[2], parseInt(dmy[1]) - 1, dmy[0]);

            $.each([['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6]], function (i, v) {
                $('<button style="width:71px;display:block;">' + v[0] + '</button>')
                    .click(function () {

                        var updatedDate = new Date(d.getFullYear(), d.getMonth());
                        updatedDate.setDate(d.getDate() - d.getDay() + v[1]);

                        $datePicker.val('' + updatedDate.getDate() + '.' + (updatedDate.getMonth() + 1) + '.' + updatedDate.getFullYear());
                        $datePicker.change();
                        return false;
                    })
                    .appendTo($parent);
            });
        });
    };

    $.fn.etsTimeButtons = function () {

        $(this).each(function () {
            var $btn = $(this);
            var $parent = $btn.parent();

            $parent.append($('<br />'));

            $('<button style="width:18px;">-</button>')
                .click(function () {
                    var v = parseFloat($btn.val()) - 0.5;
                    $btn.val(v > 0 ? v : 0);
                    return false;
                })
                .appendTo($parent);

            $('<button style="width:18px;">+</button>')
                .click(function () {
                    var v = parseFloat($btn.val()) + 0.5;
                    $btn.val(v > 0 ? v : 0.5);
                    return false;
                })
                .appendTo($parent);

            $.each([0, 0.5, 1, 2, 4], function (i, v) {
                $('<button style="width:36px;display:block;text-align:right;">' + v + '</button>')
                    .click(function () {
                        $btn.val(v);
                        return false;
                    })
                    .appendTo($parent);
            });
        });
    };

    $.fn.etsTotals = function () {

        var $etsLines = $(this).find('> tbody > tr')
            .filter(function () {
                return !$(this).hasClass('TableRowHeader')
                    && !$(this).hasClass('TableRowAddNew')
                    && !$(this).hasClass('TableRowTotal');
            });

        var allDates = [];
        var totals = {};

        $etsLines.each(function () {
            var $row = $(this);

            var dateVal = $row.find('> td:nth-child(13)').text().trim();
            allDates.push(dateVal);

            var hoursVal = parseFloat($row.find('td:nth-child(9)').text().trim());
            var ovrVal = parseFloat($row.find('td:nth-child(10)').text().trim());

            $row
                .attr('data-date', dateVal)
                .attr('data-hours', hoursVal)
                .attr('data-ovr', ovrVal);

            totals[dateVal] = {
                date: dateVal,
                total: (totals[dateVal] ? totals[dateVal].total : 0) + (hoursVal || 0),
                totalOvr: (totals[dateVal] ? totals[dateVal].totalOvr : 0) + (ovrVal || 0)
            };
        });

        $.each(totals, function () {
            if (this.total >= 8.0) {
                $etsLines.filter('[data-date="' + this.date + '"]').addClass('ets-day-filled');
            } else {
                $etsLines.filter('[data-date="' + this.date + '"]').first()
                    .addClass('ets-day-not-filled-top');
                var $headTd = $('[data-date="' + this.date + '"] > TD').eq(0);

                if (this.totalOvr > 0) {
                    $headTd.html($headTd.html() + " <b><font color='#3c763d'>" + this.total + "</font> / <font color='#CC071E'>" + this.totalOvr + "</font></b>");
                } else {
                    $headTd.html($headTd.html() + " <b><font color='#3c763d'>" + this.total + "</font></b>");
                }

                $etsLines.filter('[data-date="' + this.date + '"]').last().addClass('ets-day-not-filled-bottom');
            }
        });

        var customStyle =
            ".ets-day-filled:not(.TableRowDeclined) {background-color:#dff0d8} " +
            ".ets-day-not-filled-top TD {border-top: 1px dotted #999;} " +
            ".ets-day-not-filled-bottom TD {border-bottom: 1px dotted #999} " +
            ".ets-day-not-filled-top TD:nth-child(2) {text-align: right; font-weight:bold; color:#eea236} ";

        $.addGlobalStyle(customStyle);
    }

    var shortcuts = [];

    var $desc = $('[name="effortRecordDescription"]');

    var $descTd = $desc.closest('TD');

    var buildShortcutHtml = function (s) {
        return '<div><a class="ets-shortcut" data-p="' + s.p + '" data-t="' + s.t + '" data-h="' + s.h + '" data-o="' + s.o + '" data-d="' + escape(s.d) + '" data-c="' + s.c + '">' + s.s + '</a></div>';
    };

    $.each(shortcuts, function () {
        $descTd.append(buildShortcutHtml(this));
    });

    $('.ets-shortcut').etsShortcut();

    if ($('[name="effortRecordDescription"]').length > 0) {
        $('.TableCellContent.whsp_normal').prepend('<button class="button-copy" style="float:right;">Copy</button>');
        $('.button-copy').etsCopy();
    }

    $('[name="effortRecordEffort"], [name="effortRecordEffortOvertime"]').etsTimeButtons();

    $('[name="effortRecordStarted"], [name="effortRecordFinished"]').etsDateButtons();

    $('[name="effortRecordStarted"]').change(function () {
        $('[name="effortRecordFinished"]').val($(this).val());
    });

    $('.calendar_icon').closest('TD').css('vertical-align', 'top');

    $('#acceptFormTable').etsTotals();

})($);



