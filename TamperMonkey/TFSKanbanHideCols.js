// ==UserScript==
// @name         TSF Board hide
// @namespace    http://tfs2010.it.volvo.net
// @version      0.1
// @description  enter something useful
// @author       You
// @match        http://tfs2010.it.volvo.net:8080/tfs/Global/SEGOT-eCom-VolvoPentaShop/PentaBusiness/_backlogs/board
// @grant        none
// @import       https://code.jquery.com/jquery-2.1.3.min.js

// ==/UserScript==

$(function () {

    $.fn.hideColumnLinks = function () {
        var $container = $('<div style="width:1600px;white-space:normal"></div>').appendTo($(this));
        $(".header-container.row.header .cell .member-header-content").each(function (i, e) {

            var inputName = 'hideCols_' + i;
            var text = $(e).attr('title');

            var $cb = $('<span></span>')
                .appendTo($container)
            .css({ 'width': '300px', 'display': 'inline-block', 'white-space': 'nowrap', 'text-overflow': 'ellipsis', 'overflow-x': 'hidden' });

            $cb.append(
                $("<input type='checkbox'/>")
                .attr({ 'name': inputName, 'checked': true })
                .val(text)
                .click(function () {
                    $(".header-container.row.header .cell:eq(" + i + "), .content-container.row.content .cell:eq(" + i + ")")
                        .toggleClass('hidden');
                }));
            $cb.append(
                $('<label />')
                .attr({ 'for': inputName })
                .text(text));
        });

        $('.right-hub-content').css({ 'top': '180px' });
        $('.agile-board .horizontal').css({ 'width': 'auto' });
    };

    $.fn.waitForElement = function (selector, callback, timeOut, totalTimeout) {
        var $caller = $(this);

        if ((totalTimeout || 0) > (timeOut || 10000)) {
            throw "timeout expired";
        }

        if ($(selector).length < 1) {
            setTimeout(function () { $caller.waitForElement(selector, callback, timeOut, totalTimeout || 0) }, 1000);
            return;
        }

        callback($caller, $(selector));
    }

    $(".hub-title").waitForElement(".header-container.row.header .cell", function (c) {
        $(c).hideColumnLinks();
    });

    $("<style>.hidden { display:none!important; }</style>").appendTo("head");
});
