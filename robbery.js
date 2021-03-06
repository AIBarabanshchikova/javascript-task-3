'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = true;
const THREE_DAYS_IN_MIN = 72 * 60;
const MIN_IN_HOUR = 60;

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {

    const bankTimes = getBankWorkingIntervals(workingHours);
    const bankTimeZone = Number(workingHours.to.split('+')[1]);
    const bankTimeShift = -bankTimeZone * MIN_IN_HOUR;
    const gangTimes = Object.values(schedule)
        .map(friend =>
            getFriendFreeIntervals(friend, [bankTimeShift, getShiftedEnd(bankTimeShift)]));

    let timeFound = findNextTime(
        [bankTimeShift, getShiftedEnd(bankTimeShift)],
        duration,
        bankTimes,
        gangTimes
    );

    return {


        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return timeFound !== null;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например, "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            return timeFound
                ? formatDate(timeFound - bankTimeShift, template)
                : '';
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            const nextTime = findNextTime(
                [timeFound + 30, getShiftedEnd(bankTimeShift)],
                duration,
                bankTimes,
                gangTimes
            );
            if (nextTime) {
                timeFound = nextTime;

                return true;
            }

            return false;
        }
    };
}

function findNextTime([start, end], duration, bankOpenedIntervals, friendsFreeIntervals) {
    let streak = 0;

    for (let i = start; i < end; i++) {
        if (streak >= duration) {
            return i - duration;
        }
        if (canGang(friendsFreeIntervals, bankOpenedIntervals, i)) {
            streak++;
        } else {
            streak = 0;
        }
    }

    return null;
}

function getFriendFreeIntervals(friendShedule, domain) {
    const mergedIntervals = mergeIntersectedIntervals(
        friendShedule.map(timePeriodToInterval)
    );

    return invertIntervals(mergedIntervals, domain);
}

function getBankWorkingIntervals(workingHours) {
    return [0, 24, 48].map(offset =>
        [
            getUTCTimeInMinutesForBank(workingHours.from) + offset * MIN_IN_HOUR,
            getUTCTimeInMinutesForBank(workingHours.to) + offset * MIN_IN_HOUR
        ]
    );
}

function getUTCTimeInMinutes(timeString) {
    const parts = /([а-яА-ЯёЁ]{2}) (\d{1,2}):(\d+)\+(\d+)/.exec(timeString);
    const days = {
        ПН: 0,
        ВТ: 24 * 60,
        СР: 48 * 60,
        ЧТ: 72 * 60,
        ПТ: 96 * 60,
        СБ: 120 * 60,
        ВС: 144 * 60
    };
    const timeInMinutes = Number(days[parts[1]]) + Number(parts[2]) * MIN_IN_HOUR +
        Number(parts[3]) - Number(parts[4]) * MIN_IN_HOUR;

    return timeInMinutes;
}

function getUTCTimeInMinutesForBank(timeString) {
    const parts = /(\d{1,2}):(\d+)\+(\d+)/.exec(timeString);

    return Number(parts[1]) * MIN_IN_HOUR + Number(parts[2]) -
        Number(parts[3]) * MIN_IN_HOUR;
}

function invertIntervals(intervals, domain) {
    intervals = intervals.sort((a, b) => a[0] > b[0]);
    if (intervals.length === 0) {
        return [domain];
    }

    const inverted = [];

    for (let i = 0; i <= intervals.length; i++) {
        if (isLast(i, intervals, domain)) {
            inverted.push([intervals[i - 1][1], domain[1]]);
        } else if (isFirst(i, intervals, domain)) {
            inverted.push([domain[0], intervals[i][0]]);
        } else if (isMiddle(i, intervals)) {
            inverted.push([intervals[i - 1][1], intervals[i][0]]);
        }
    }

    return inverted;
}

function isFirst(i, intervals, domain) {
    return i === 0 && intervals[i][0] > domain[0];
}

function isMiddle(i, intervals) {
    return i > 0 && i < intervals.length;
}

function isLast(i, intervals, domain) {
    return i === intervals.length && intervals[i - 1][1] < domain[1];
}

function mergeIntersectedIntervals(intervals) {
    if (intervals.length === 0) {
        return [];
    }

    const unique = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const previous = unique[unique.length - 1];
        if (intervals[i][0] < previous[1]) {
            previous[1] = intervals[i][1];
        } else {
            unique.push(intervals[i]);
        }
    }

    return unique;
}

function timePeriodToInterval(timePeriod) {
    return [
        getUTCTimeInMinutes(timePeriod.from),
        getUTCTimeInMinutes(timePeriod.to)
    ];
}

function isValueInInterval(interval, value) {
    return interval[0] <= value && value < interval[1];
}

function formatDate(timeInMinutes, format) {
    const days = ['ПН', 'ВТ', 'СР', 'ЧТ'];
    const minutes = timeInMinutes % MIN_IN_HOUR;
    const hours = ((timeInMinutes - minutes) / MIN_IN_HOUR) % 24;
    const day = (timeInMinutes - minutes - hours * MIN_IN_HOUR) / MIN_IN_HOUR / 24;

    return format
        .replace(/%DD/, days[day])
        .replace(/%HH/, hours.toString().padStart(2, '0'))
        .replace(/%MM/, minutes.toString().padStart(2, '0'));
}

function canGang(gangTimes, bankTimes, value) {
    const areFriendsFree = gangTimes.every(
        friend => friend.find(interval => isValueInInterval(interval, value))
    );
    const isBankOpened = bankTimes.find(interval => isValueInInterval(interval, value));

    return areFriendsFree && isBankOpened;
}

function getShiftedEnd(bankTimeShift) {
    return THREE_DAYS_IN_MIN + bankTimeShift;
}

module.exports = {
    getAppropriateMoment,
    isStar
};
