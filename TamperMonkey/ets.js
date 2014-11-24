// ==UserScript==
// @name       ETS enhancements
// @namespace  http://timeserver.i.sigmasoftware.com
// @version    0.1
// @match      http://timeserver/accountreport.ets
// @match      https://timeserver/accountreport.ets
// @match      http://timeserver.i.sigmaukraine.com/accountreport.ets
// @match      https://timeserver.i.sigmaukraine.com/accountreport.ets
// @copyright  2014+, alreva

// @require		https://code.jquery.com/jquery-2.1.1.min.js

// ==/UserScript==

$(function () {

    var shortcuts = [];

    /*
    var shortcuts = [
        {
            s: 'CR 20120928-025 Legal demands (p.2)',
            p: 'VECOMMA',
            t: 'MA - Enhancements (WBS is mandatory)',
            h: 1,
            o: 0,
            d: 'WBS <C-18500-01-01-10> IAT <20120928-025> Penta - Legal demands (p.2) - ',
            c: '60ee0d55-8530-11e0-a4e6-d8d385a1d9b2'
        },
        {
            s: 'CR 20120914-051 Improve Translation Process',
            p: 'VECOMMA',
            t: 'MA - Enhancements (WBS is mandatory)',
            h: 1,
            o: 0,
            d: 'WBS <C-18500-01-01-05> IAT <20120914-051> Penta - Improve Translation Process - ',
            c: '60ee0d55-8530-11e0-a4e6-d8d385a1d9b2'
        }
    ];
    */

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
});

(function () {

    var $proj = $('#effortRecordProjectCode');
    var $task = $('#effortRecordIssueCode');
    var $time = $('[name="effortRecordEffort"]');
    var $ot = $('[name="effortRecordEffortOvertime"]');
    var $desc = $('[name="effortRecordDescription"]');
    var $costC = $('#costCenterAccount');

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

    $.fn.etsCopy = function () {

        $(this).click(function () {

            var $btn = $(this);
            var $row = $btn.closest('tr');

            pasteRecord({
                p: $row.find('td:nth-child(5)').text().trim(),
                t: $row.find('td.TableCellContent.tooltip').text().trim(),
                h: $row.find('td:nth-child(8)').text().trim(),
                o: $row.find('td:nth-child(9)').text().trim(),
                d: getDescriptionFromRow($row),
                c: ''
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

            $.each([['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5]], function (i, v) {
                $('<button style="width:71px;display:block;">' + v[0] + '</button>')
                .click(function () {
                    $datePicker.val('' + (d.getDate() - d.getDay() + v[1]) + '.' + (d.getMonth() + 1) + '.' + d.getFullYear());
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

            var dateVal = $row.find('> td:nth-child(12)').text().trim();
            allDates.push(dateVal);

            var hoursVal = parseFloat($row.find('td:nth-child(8)').text().trim());

            $row
                .attr('data-date', dateVal)
                .attr('data-hours', hoursVal);

            totals[dateVal] = {
                date: dateVal,
                total: (totals[dateVal] ? totals[dateVal].total : 0) + (hoursVal || 0)
            };
        });

        $.each(totals, function () {
            if (this.total >= 8.0) {
                $etsLines.filter('[data-date="' + this.date + '"]').addClass('ets-day-filled');
            } else {
                $etsLines.filter('[data-date="' + this.date + '"]').first()
                    .addClass('ets-day-not-filled-top');
                var $headTd = $('[data-date="' + this.date + '"] > TD').eq(1);
                $headTd.html($headTd.html() + ' ' + this.total + " / 8")
                $etsLines.filter('[data-date="' + this.date + '"]').last().addClass('ets-day-not-filled-bottom');
            }
        });

        var customStyle =
            ".ets-day-filled {background-color:#dff0d8} " +
            ".ets-day-not-filled-top TD {border-top: 1px dotted #999;} " +
            ".ets-day-not-filled-bottom TD {border-bottom: 1px dotted #999} " +
            ".ets-day-not-filled-top TD:nth-child(2) {text-align: right; font-weight:bold; color:#eea236} "
        ;

        addGlobalStyle(customStyle);
    }

    var pasteRecord = function (r) {

        $proj.val(r.p);
        $time.val(r.h);
        $ot.val(r.o);
        $desc.val(r.d);

        if (r.c) {
            $costC.val(r.c);
        }

        $proj.change();

        /*        $.get("http://timeserver/ajax/issuedropdawn.ets?effortRecordProjectCode=" + r.p + "&_=", function(data) {
                    debugger;
                });*/

        setTimeout(function () {
            var $selectedOption = $('option:contains("' + r.t + '")');
            $task.val($selectedOption.val());
            $task.change();
        }, 1000);
    };

    var getDescriptionFromRow = function ($row) {

        var fullDescription = $row.find('td.TableCellContent.whsp_normal div[id^="hintabletextfull"]').text().trim();

        if (fullDescription) { return fullDescription; }

        return $row.find('td.TableCellContent.whsp_normal div').text().trim();
    }

    var addGlobalStyle = function (css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

})(jQuery);



























