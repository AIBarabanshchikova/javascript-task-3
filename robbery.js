'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = false;

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {
    console.info(schedule, duration, workingHours);

    const bankTimes = [0, 24, 48].map(offset =>
        [
            getUTCTimeInMinutesForBank(workingHours.from) + offset * 60,
            getUTCTimeInMinutesForBank(workingHours.to) + offset * 60
        ]
    );

    const bankTimeZone = Number(workingHours.to.split('+')[1]);

    const gangTimes = Object.values(schedule)
        .map(
            friend =>
                invertIntervals(
                    mergeIntersectedIntervals(
                        friend.map(timePeriodToInterval),
                    ), [-bankTimeZone * 60, 72 * 60 - bankTimeZone * 60]
                ));

    let count = 0;
    let timeToStart = null;

    for (let value = 0; value < (72 * 60); value++) {
        if (count === duration) {
            timeToStart = value - duration;
            break;
        }
        if (
            gangTimes.every(
                friend => friend.find(interval => isValueInInterval(interval, value))
            ) &&
            bankTimes.find(interval => isValueInInterval(interval, value))
        ) {
            count++;
        } else {
            count = 0;
        }
    }

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return timeToStart !== null;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например, "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (timeToStart === null) {
                return '';
            }

            return formatDate(timeToStart + bankTimeZone * 60, template, bankTimeZone);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            return false;
        }
    };
}

function getUTCTimeInMinutes(timeString) {
    const parts = /([а-яА-ЯёЁ]{2}) (\d{1,2}):(\d\d)\+(\d+)/.exec(timeString);
    const days = {
        ПН: 0,
        ВТ: 24 * 60,
        СР: 48 * 60,
        ЧТ: 72 * 60,
        ПТ: 96 * 60,
        СБ: 120 * 60,
        ВС: 144 * 60
    };
    const timeInMinutes =
        Number(days[parts[1]]) + Number(parts[2]) * 60 +
            Number(parts[3]) - Number(parts[4]) * 60;

    return timeInMinutes;
}

function getUTCTimeInMinutesForBank(timeString) {
    const parts = /(\d{1,2}):(\d\d)\+(\d+)/.exec(timeString);

    return Number(parts[1]) * 60 + Number(parts[2]) - Number(parts[3]) * 60;
}

function invertIntervals(intervals, domain) {
    intervals = intervals.sort((interval1, interval2) => interval1[0] > interval2[0]);
    const inverted = [];

    const isFirst = i => i === 0 && intervals[i][0] > domain[0];
    const isLast = i => i === intervals.length && intervals[i - 1][1] < domain[1];

    for (let i = 0; i <= intervals.length; i++) {
        if (isFirst(i)) {
            inverted.push([domain[0], intervals[i][0]]);
        } else if (isLast(i)) {
            inverted.push([intervals[i - 1][1], domain[1]]);
        } else if (i > 0 && i < intervals.length) {
            inverted.push([intervals[i - 1][1], intervals[i][0]]);
        }
    }

    return inverted;
}

function mergeIntersectedIntervals(intervals) {
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
    const days = {
        0: 'ПН',
        1: 'ВТ',
        2: 'СР',
        3: 'ЧТ'
    };
    const minutes = timeInMinutes % 60;
    const hours = ((timeInMinutes - minutes) / 60) % 24;
    const day = (timeInMinutes - minutes - hours * 60) / 60 / 24;

    return format
        .replace(/%DD/, days[day])
        .replace(/%HH/, hours.toString().padStart(2, '0'))
        .replace(/%MM/, minutes.toString().padStart(2, '0'));
}

module.exports = {
    getAppropriateMoment,
    isStar
};
