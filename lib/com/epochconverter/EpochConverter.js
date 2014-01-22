function EpochToHuman() {
    var inputtext = document.ef.TimeStamp.value;
    if (inputtext.charAt(inputtext.length - 1) == "L") {
        inputtext = inputtext.slice(0, -1);
    }
    inputtext = inputtext * 1;
    var epoch = inputtext;
    var outputtext = "";
    var extraInfo = 0;
    if (inputtext >= 100000000000000) {
        outputtext += "<b>Assuming that this timestamp is in microseconds (1/1,000,000 second):</b><br/>";
        epoch = Math.round(inputtext / 1000000);
        inputtext = Math.round(inputtext / 1000);
    } else if (inputtext >= 100000000000) {
        outputtext += "<b>Assuming that this timestamp is in milliseconds:</b><br/>";
        epoch = Math.round(inputtext / 1000);
    } else {
        if (inputtext > 10000000000) extraInfo = 1;
        inputtext = (inputtext * 1000);
    }
    var datum = new Date(inputtext);
    if (isValidDate(datum)) {
        var localeString = datum.toLocaleString();
        var localeStringEnd = localeString.search(/GMT/i);
        if (localeStringEnd > 0) {
            localeString = localeString.substring(0, localeStringEnd);
        }
        outputtext += "<b>GMT</b>: " + datum.toGMTString();
        outputtext += "<br/><b>Your time zone</b>: <span title=\"" + datum.toLocaleString() + "\">" + localeString + "</span> <a title=\"convert to other time zones\" href=\"http://www.epochconverter.com/epoch/timezones.php?epoch=" + epoch + "\">" + localTimezone(datum) + "</a>";
        if (extraInfo) outputtext += "<br/>This conversion uses your timestamp in seconds. Remove the last 3 digits if you are trying to convert milliseconds.";
    } else {
        outputtext += "Sorry, I can't parse this date.<br/>Check your timestamp, strip letters and punctuation marks.";
    }
    outputtext += "<hr class=\"lefthr\">";
    document.getElementById('result1').innerHTML = outputtext;
}

function HumanToEpoch() {
    var datum = new Date(Date.UTC(document.hf.yyyy.value, document.hf.mm.value - 1, document.hf.dd.value, document.hf.hh.value, document.hf.mn.value, document.hf.ss.value));
    document.getElementById('result2').innerHTML = "<b>Epoch timestamp</b>: " + (datum.getTime() / 1000.0) + "<br>Human time:  " + datum.toGMTString();
}

function HumanToEpochTZ() {
    var tz = $('#hf select[name=tz]').val();
    var datum;
    if (tz == 2) {
        datum = new Date(document.hf.yyyy.value, document.hf.mm.value - 1, document.hf.dd.value, document.hf.hh.value, document.hf.mn.value, document.hf.ss.value);
    } else {
        datum = new Date(Date.UTC(document.hf.yyyy.value, document.hf.mm.value - 1, document.hf.dd.value, document.hf.hh.value, document.hf.mn.value, document.hf.ss.value));
    }
    var resulttext = "<b>Epoch timestamp</b>: " + (datum.getTime() / 1000.0);
    resulttext += "<br/><span title='Used in Java, JavaScript'>Timestamp in milliseconds: " + datum.getTime() + "</span>";
    if (tz == 2) {
        resulttext += "<br/>Human time (your time zone): " + datum.toLocaleString();
        resulttext += "<br/>Human time (GMT):  " + datum.toGMTString();
    } else {
        resulttext += "<br/>Human time (GMT):  " + datum.toGMTString();
        resulttext += "<br/>Human time (your time zone): " + datum.toLocaleString();
    }
    document.getElementById('result2').innerHTML = resulttext;
}

function HumanToEpoch2() {
    var strDate = document.fs.DateTime.value;
    strDate = strDate.replace(/  /g, ' ');
    strDate = strDate.replace('Mon, ', '').replace('Tue, ', '').replace('Wed, ', '').replace('Thu, ', '').replace('Fri, ', '').replace('Sat, ', '').replace('Sun, ', '');
    strDate = strDate.replace(', ', ' ');
    var ok = 0;
    var skipDate = 0;
    var content = "";
    var date = "";
    var format = "";
    var yr = 1970;
    var mnth = 1;
    var dy = 1;
    var hr = 0;
    var mn = 0;
    var sec = 0;
    var dmy = 1;
    if (!ok) {
        var dateTimeSplit = strDate.split(" ");
        var dateParts = dateTimeSplit[0].split("-");
        if (dateParts.length == 1) dateParts = dateTimeSplit[0].split(".");
        if (dateParts.length == 1) {
            dmy = 0;
            dateParts = dateTimeSplit[0].split("/");
        }
        if (dateParts.length == 1) {
            dmy = 1;
            if (dateTimeSplit.length > 2) {
                if (dateTimeSplit[2].split(":").length == 1) {
                    strDate = strDate.replace(dateTimeSplit[0] + ' ' + dateTimeSplit[1] + ' ' + dateTimeSplit[2], dateTimeSplit[0] + '-' + dateTimeSplit[1] + '-' + dateTimeSplit[2]);
                    dateTimeSplit = strDate.split(" ");
                    dateParts = dateTimeSplit[0].split("-");
                }
            }
        }
        if (dateParts.length == 1) {
            dateParts = dateTimeSplit;
            if (dateTimeSplit.length > 3) timeParts = dateTimeSplit[4];
        }
        if (dateParts.length > 2) {
            if (dateParts[0] > 100) {
                yr = dateParts[0];
                mnth = parseMonth(dateParts[1]);
                dy = dateParts[2];
                format = "YMD";
            } else {
                if (dmy) {
                    dy = dateParts[0];
                    mnth = parseMonth(dateParts[1]);
                    yr = dateParts[2];
                    format = "DMY";
                    if ((!parseFloat(mnth)) || (!parseFloat(dy))) {
                        dy = dateParts[1];
                        mnth = parseMonth(dateParts[0]);
                        format = "MDY";
                    }
                } else {
                    mnth = parseMonth(dateParts[0]);
                    dy = dateParts[1];
                    yr = dateParts[2];
                    format = "MDY";
                    if ((!parseFloat(mnth)) || (!parseFloat(dy))) {
                        dy = dateParts[0];
                        mnth = parseMonth(dateParts[1]);
                        format = "DMY";
                    }
                }
            }
            ok = 1;
        }
        if (ok && dateTimeSplit[1]) {
            var timeParts = dateTimeSplit[1].split(":");
            if (timeParts.length >= 2) {
                hr = timeParts[0];
                mn = timeParts[1];
            }
            if (timeParts.length >= 3) {
                sec = timeParts[2];
            }
            if ((dateTimeSplit[2] && dateTimeSplit[2].toLowerCase() == "pm") && (parseFloat(hr) < 12)) hr = parseFloat(hr) + 12;
            if ((dateTimeSplit[2] && dateTimeSplit[2].toLowerCase() == "am") && (parseFloat(hr) == 12)) hr = 0;
        }
    }
    if (!ok) {
        date = new Date(strDate);
        if (date.getFullYear() > 1900) {
            ok = 1;
            skipDate = 1;
        }
    }
    if (ok) {
        if (!skipDate) {
            if (mnth != parseFloat(mnth)) mnth = parseMonth(mnth);
            if (yr < 30) yr = 2000 + parseFloat(yr);
            if (yr < 200) yr = 1900 + parseFloat(yr);
            if ((strDate.toUpperCase().indexOf('GMT') > 0) || (strDate.toUpperCase().indexOf('UTC') > 0)) {
                date = new Date(Date.UTC(yr, mnth - 1, dy, hr, mn, sec));
            } else {
                date = new Date(yr, mnth - 1, dy, hr, mn, sec);
            }
        }
        content += "<b>Epoch timestamp</b>: " + (date.getTime() / 1000.0);
        content += "<br/><span title='Used in Java, JavaScript'>Timestamp in milliseconds: " + date.getTime() + "</span>";
        content += "<br/>Human time (your time zone): " + date.toLocaleString();
        content += "<br/>Human time (GMT):  " + date.toGMTString();
    }
    if ((!content) || (date.getTime() != parseFloat(date.getTime()))) content = 'Sorry, can\'t parse this date.';
    document.getElementById('result3').innerHTML = content;
}

function TimeCounter() {
    var t = parseInt(document.tc.DateTime.value);
    var days = parseInt(t / 86400);
    t = t - (days * 86400);
    var hours = parseInt(t / 3600);
    t = t - (hours * 3600);
    var minutes = parseInt(t / 60);
    t = t - (minutes * 60);
    var content = "";
    if (days) content += days + " days";
    if (hours || days) {
        if (content) content += ", ";
        content += hours + " hours";
    }
    if (content) content += ", ";
    content += minutes + " minutes and " + t + " seconds.";
    document.getElementById('result4').innerHTML = content;
}
var currentBeginEnd = "month";

function updateBe(a) {
    if (a != currentBeginEnd) {
        if (a == "day") {
            document.br.mm.disabled = 0;
            document.br.dd.disabled = 0;
        }
        if (a == "month") {
            document.br.mm.disabled = 0;
            document.br.dd.disabled = 1;
        }
        if (a == "year") {
            document.br.mm.disabled = 1;
            document.br.dd.disabled = 1;
        }
        currentBeginEnd = a;
        beginEnd();
    }
}

function beginEnd() {
    var tz = $('#br select[name=tz]').val();
    var outputText = "<table class=\"infotable\"><tr><td></td><td><b>Epoch</b></td><td>&nbsp;&nbsp;<b>Human date</b></td></tr><tr><td>Start of " + currentBeginEnd + ":&nbsp;</td><td>";
    var mon = 0;
    var day = 1;
    var yr = document.br.yyyy.value;
    if (currentBeginEnd != "year") {
        mon = document.br.mm.value - 1;
    }
    if (currentBeginEnd == "day") {
        day = document.br.dd.value;
    }
    var startDate;
    if (tz == 2) {
        startDate = new Date(yr, mon, day, 0, 0, 0);
    } else {
        startDate = new Date(Date.UTC(yr, mon, day, 0, 0, 0));
    }
    if (currentBeginEnd == "year") yr++;
    if (currentBeginEnd == "month") mon++;
    if (currentBeginEnd == "day") day++;
    var endDate;
    if (tz == 2) {
        endDate = new Date(yr, mon, day, 0, 0, -1);
    } else {
        endDate = new Date(Date.UTC(yr, mon, day, 0, 0, -1));
    }
    outputText += (startDate.getTime() / 1000.0) + "</td><td>&nbsp;&nbsp;";
    if (tz == 2) {
        outputText += startDate.toLocaleString();
    } else {
        outputText += startDate.toGMTString();
    }
    outputText += "</td></tr>";
    outputText += "<tr><td>End of " + currentBeginEnd + ":&nbsp;</td><td>";
    outputText += (endDate.getTime() / 1000.0) + "</td><td>&nbsp;&nbsp;";
    if (tz == 2) {
        outputText += endDate.toLocaleString();
    } else {
        outputText += endDate.toGMTString();
    }
    outputText += "</td></tr>";
    document.getElementById('resultbe').innerHTML = outputText;
}

function addbookmark() {
    if (document.all) window.external.AddFavorite(bookmarkurl, bookmarktitle);
}

function localTimezone(d) {
    if (!d) {
        d = new Date();
    }
    var gmtHours = -d.getTimezoneOffset() / 60;
    var xc = "";
    if (gmtHours > -1) xc = "+";
    return "GMT" + xc + gmtHours;
}
var clockActive = 1;
var timerID = 0;

function now() {
    var today = new Date();
    document.getElementById('now').innerHTML = Math.round(today.getTime() / 1000.0);
    if (clockActive) {
        timerID = setTimeout("now()", 1000);
    }
}

function startClock() {
    clockActive = 1;
    now();
}

function stopClock() {
    clockActive = 0;
    clearTimeout(timerID);
}

function homepageStart() {
    if ($('#now').length != 0) now();
    if ($("#ecclock").length != 0) {
        var clockActive = 1;
        $("#ecclock").mouseover(function() {
            clockActive = 0;
            $(this).css('backgroundColor', '#dadafc');
            $("#clocknotice").html('[stopped]');
        });
        $("#ecclock").mouseout(function() {
            clockActive = 1;
            $(this).css('backgroundColor', '#eaeafa');
            $("#clocknotice").html('');
        });
        setInterval(function() {
            if (clockActive) {
                var epoch = Math.round(new Date().getTime() / 1000.0);
                $("#ecclock").html(epoch);
            }
        }, 1000);
    }
    var today = new Date();
    $('#ef input:text[name=TimeStamp]').val(Math.round(today.getTime() / 1000.0));
    if (preferredtz == 2) {
        $('select[name=mm],input:text[name=mm]').val(today.getMonth() + 1);
        $('input:text[name=yyyy]').val(today.getFullYear());
        $('input:text[name=dd]').val(today.getDate());
        $('input:text[name=hh]').val(today.getHours());
        $('input:text[name=mn]').val(today.getMinutes());
    } else {
        $('select[name=mm],input:text[name=mm]').val(today.getUTCMonth() + 1);
        $('input:text[name=yyyy]').val(today.getUTCFullYear());
        $('input:text[name=dd]').val(today.getUTCDate());
        $('input:text[name=hh]').val(today.getUTCHours());
        $('input:text[name=mn]').val(today.getUTCMinutes());
    }
    $('input:text[name=ss]').val(today.getUTCSeconds());
    $('#fs input:text[name=DateTime]').val(today.toGMTString());
    $(document).keypress(function(e) {
        if (!$(e.target).is('input#rcinput')) {
            if (!(e.ctrlKey || e.altKey || e.metaKey)) {
                if (String.fromCharCode(e.which).match(/[a-zA-Z]/)) e.preventDefault();
                switch (e.which) {
                    case 101:
                    case 69:
                        kp('ecinput');
                        jumpTo('top');
                        break;
                    case 99:
                    case 67:
                        emptyFields();
                        break;
                    case 104:
                    case 72:
                        kp('hcinput');
                        jumpTo('top');
                        break;
                    case 114:
                    case 82:
                        kp('rcinput');
                        jumpTo('fs');
                        break;
                    case 115:
                    case 83:
                        kp('scinput');
                        jumpTo('tchead');
                        break;
                    case 121:
                    case 89:
                        $('input:radio[name=cw]:nth(0)').attr('checked', true);
                        updateBe('year');
                        jumpTo('brhead');
                        kp('ycinput');
                        break;
                    case 109:
                    case 77:
                        $('input:radio[name=cw]:nth(1)').attr('checked', true);
                        updateBe('month');
                        jumpTo('brhead');
                        if (dateformat == "3") {
                            kp('ycinput');
                        } else {
                            kp('mcinput');
                        }
                        break;
                    case 100:
                    case 68:
                        $('input:radio[name=cw]:nth(2)').attr('checked', true);
                        updateBe('day');
                        jumpTo('brhead');
                        if (dateformat == "2") {
                            kp('dcinput');
                        } else if (dateformat == "3") {
                            kp('ycinput');
                        } else {
                            kp('mcinput');
                        }
                        break;
                }
            }
        }
    });
}

function timezoneStart() {
    $(document).keypress(function(e) {
        if (!(e.ctrlKey || e.altKey || e.metaKey)) {
            if (String.fromCharCode(e.which).match(/[a-zA-Z]/)) e.preventDefault();
            switch (e.which) {
                case 101:
                case 69:
                    kp('ecinput');
                    jumpTo('top');
                    break;
            }
        }
    });
}

function jumpTo(toid) {
    var new_position = $('#' + toid).offset();
    window.scrollTo(new_position.left, new_position.top);
}

function emptyFields() {
    $('input:text').val("");
}

function kp(id) {
    $('#' + id).focus();
    $('#' + id).select();
}

function parseMonth(mnth) {
    switch (mnth.toLowerCase()) {
        case 'january':
        case 'jan':
        case 'enero':
            return 1;
        case 'february':
        case 'feb':
        case 'febrero':
            return 2;
        case 'march':
        case 'mar':
        case 'marzo':
            return 3;
        case 'april':
        case 'apr':
        case 'abril':
            return 4;
        case 'may':
        case 'mayo':
            return 5;
        case 'jun':
        case 'june':
        case 'junio':
            return 6;
        case 'jul':
        case 'july':
        case 'julio':
            return 7;
        case 'aug':
        case 'august':
        case 'agosto':
            return 8;
        case 'sep':
        case 'september':
        case 'septiembre':
        case 'setiembre':
            return 9;
        case 'oct':
        case 'october':
        case 'octubre':
            return 10;
        case 'nov':
        case 'november':
        case 'noviembre':
            return 11;
        case 'dec':
        case 'december':
        case 'diciembre':
            return 12;
    }
    return mnth;
}

function isValidDate(d) {
    if (Object.prototype.toString.call(d) !== "[object Date]")
        return false;
    return !isNaN(d.getTime());
}

function UpdateTableHeaders() {
    $(".persist-area").each(function() {
        var el = $(this),
            offset = el.offset(),
            scrollTop = $(window).scrollTop(),
            floatingHeader = $(".floatingHeader", this)
            if ((scrollTop > offset.top) && (scrollTop < offset.top + el.height())) {
                floatingHeader.css({
                    "visibility": "visible"
                });
            } else {
                floatingHeader.css({
                    "visibility": "hidden"
                });
            };
    });
}