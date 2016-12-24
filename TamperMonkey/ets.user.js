// ==UserScript==
// @name         ETS Improvements
// @namespace    http://timeserver
// @version      0.1
// @description  this one helps filling out ETS faster.
// @author       areva
// @match        timeserver/timereports.ets
// @match        timeserver.i.sigmaukraine.com/timereports.ets
// @match        ets.sigmaukraine.com:7443/timereports.ets

// @grant        GM_xmlhttpRequest


// reference:    https://harvesthq.github.io/chosen/
// @require      https://code.jquery.com/jquery-2.2.4.min.js
// @require		 https://cdnjs.cloudflare.com/ajax/libs/chosen/1.6.2/chosen.jquery.min.js

// @require		 http://courses.ischool.berkeley.edu/i290-4/f09/resources/gm_jq_xhr.js

// ==/UserScript==

const loadJsCss = (filename, filetype) => {
    var fileref = "";
    if (filetype == "js") {
        fileref = document.createElement('script')
        fileref.setAttribute("type", "text/javascript")
        fileref.setAttribute("src", filename)
    }
    else if (filetype == "css") {
        fileref = document.createElement("link")
        fileref.setAttribute("rel", "stylesheet")
        fileref.setAttribute("type", "text/css")
        fileref.setAttribute("href", filename)
    }
    if (typeof fileref != "undefined")
        document.getElementsByTagName("body")[0].appendChild(fileref);
}

const loadInlineCss = (css) => {
    $('<style type="text/css"></style>')
        .html(css)
        .appendTo("body");
}

const notifyOptionAdded = ($option) => {
    var $parent = $option.closest('select');
    $parent.trigger('chosen:updated');
}

const wrapWithChosen = () => {

    loadJsCss("https://cdnjs.cloudflare.com/ajax/libs/chosen/1.6.2/chosen.min.css", "css");

    loadInlineCss(`

.chosen-container .chosen-drop {width: 400px;}
.chosen-container-single .chosen-single {border-radius:0; font-weight:normal;text-transform:none;}
.chosen-container .chosen-results li {padding:0;text-transform:none;}

        `);

    const wrapSelectWithChosen = ($select) => {
        $select.chosen({
            disable_search_threshold: 10,
            search_contains: true
        });

        $select.on('change', (evt, params) => {
            $('select').trigger('chosen:updated');
        });
    }

    wrapSelectWithChosen($('select:visible')
        // cost cender, by some reason, has 'visibility:hodden' attribute instead of simply being hidden. 
        .not('#costCenterAccount'));

    $(document).on("DOMNodeInserted", (evt) => {
        if (evt.target && evt.target.tagName === 'SELECT') {
            wrapSelectWithChosen($(evt.target).filter(':visible'));
        }

        if (evt.target && evt.target.tagName === 'OPTION') {
            notifyOptionAdded($(evt.target));
        }
    });
}

const nav = {
    project: () => $('#projectCode select'),
    task: () => $('#issueCode select'),
    tag: () => $('select.tag'),
    time: () => $('[name="effortRecordEffort"]'),
    overtime: () => $('[name="effortRecordEffortOvertime"]'),
    description: () => $('[name="effortRecordDescription"]'),
    costCenter: () => $('#costCenterAccount')
}

const notifyElementChange = (element) => {
    const changeEvent = document.createEvent("HTMLEvents");
    changeEvent.initEvent("change", true, true);
    element.dispatchEvent(changeEvent);
}

const listenToSelectOptionAdd = (select, addHandler) => {

    const evtHandler = (evt) => {
        if (evt.target && evt.target.tagName == 'OPTION') {
            const actualSelect = $(evt.target).closest('select')[0];
            if (actualSelect == select) {
                const added = addHandler(select, evt.target);
                if (added) {
                    $('body').off('DOMNodeInserted', evtHandler);
                }
            }
        }
    }

    $('body').on('DOMNodeInserted', evtHandler);
}

const setSelectValueAndNotifyChanged = ($select, val) => {
    listenToSelectOptionAdd($select[0], (select, option) => {
        const optionFound = option.value == val || option.innerText == val;
        if (optionFound) {
            $(select).val(option.value);
        }
        notifyOptionAdded($(select));
        return optionFound;
    });
}

const pasteRecord = ({
    project,
    task,
    tag,
    time,
    overtime,
    description,
    costCenter
}) => {

        nav.project().val(project);
        nav.time().val(time);
        nav.overtime().val(overtime);
        nav.description().val(description);

        if (costCenter) {
            nav.costCenter().val(costCenter);
        }

        nav.project().change();

        setSelectValueAndNotifyChanged(nav.task(), task);
        setSelectValueAndNotifyChanged(nav.tag(), tag);
    };

(() => {

    const getDescriptionFromRow = ($row) => {

        var fullDescription = $row.find('td.TableCellContent.whsp_normal div[id^="hintabletextfull"]').text().trim();

        if (fullDescription) {
            return fullDescription;
        }

        return $row.find('td.TableCellContent.whsp_normal div').text().trim();
    }

    const getTaskFromRow = ($row) => {

        var $taskAndTags = $row.find('td.TableCellContent.tooltip');
        var $copy = $("<div>" + $taskAndTags.html() + "</div>");
        $copy.find("span").remove();
        return $copy.text().trim();
    }

    const getTagFromRow = ($row, tagName) => {

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

    $.fn.etsCopy = function () {

        $(this).click(function () {

            var $btn = $(this);
            var $row = $btn.closest('tr');

            pasteRecord({
                project: $row.find('td:nth-child(6)').text().trim(),
                task: getTaskFromRow($row),
                tag: getTagFromRow($row, 'Customer'),
                time: $row.find('td:nth-child(9)').text().trim(),
                overtime: $row.find('td:nth-child(10)').text().trim(),
                description: getDescriptionFromRow($row),
                costCenter: ''
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

        loadInlineCss(`
.ets-day-filled:not(.TableRowDeclined) {background-color:#dff0d8}
.ets-day-not-filled-top TD {border-top: 1px dotted #999;}
.ets-day-not-filled-bottom TD {border-bottom: 1px dotted #999}
.ets-day-not-filled-top TD: nth-child(2) {text-align: right; font-weight: bold; color: #eea236}

        `);

    };

    /*

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

    var shortcuts = [];

    var $descTd = nav.description().closest('TD');

    const buildShortcutHtml = (s) => {
        return `<div><a class="ets-shortcut" 
        data-p="${s.p}" 
        data-t="${s.t}" 
        data-h="${s.h}" 
        data-o="${s.o}" 
        data-d="${escape(s.d)}" 
        data-c="${s.c}">
            ${s.s}
        </a></div>`;
    };

    $.each(shortcuts, function () {
        $descTd.append(buildShortcutHtml(this));
    });

    $('.ets-shortcut').etsShortcut();

    */

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

    wrapWithChosen();
})();