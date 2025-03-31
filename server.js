const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

const groupNumberIds = {
  "1282690301": "6411-100503D",
  "1282690279": "6412-100503D",
  "1213641978": "6413-100503D"
};

app.get('/api/groups', (req, res) => {
    const groups = Object.entries(groupNumberIds).map(([id, name]) => ({
        id,
        name: name.split('-')[0], 
    }));
    res.json(groups);
});

app.get('/api/schedule', async (req, res) => {
    try {
        const groupId = req.query.groupId;
        const week = req.query.week;

        if (!groupId || !week) {
            return res.status(400).json({ error: 'Не указан groupId или week' });
        }

        const url = `https://ssau.ru/rasp?groupId=${groupId}&selectedWeek=${week}`;
        console.log(`Загружаю расписание для группы с URL: ${url}`);

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const groupName = $('.page-header h1.h1-text').text().trim();
        if (!groupName) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }

        const schedule = {};
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const dates = [];

        $('.schedule__item.schedule__head').each((index, elem) => {
            const date = $(elem).find('.caption-text.schedule__head-date').text().trim();
            if (date) dates.push(date);
        });

        const timeBlocks = $('.schedule__time-item');
        const times = [];
        timeBlocks.each((index, timeElem) => {
            const timeStr = $(timeElem).text().trim();
            if (index % 2 === 0) {
                times.push(`${timeStr} - `);
            } else {
                times[times.length - 1] += timeStr;
            }
        });

        times.forEach((time) => {
            schedule[time] = {};
            days.forEach((day) => {
                schedule[time][day] = '-';
            });
        });

        const groupInfoBlock = $('.card-default.info-block');
        let groupDescription = '';
        groupInfoBlock.find('.info-block__description div').each((_, descElem) => {
            groupDescription += $(descElem).text().trim() + '<br>';
        });
        const groupTitle = groupInfoBlock.find('.info-block__title').text().trim();
        const groupSemesterInfo = groupInfoBlock.find('.info-block__semester div').text().trim();

        const lessonItems = $('.schedule__item:not(.schedule__head)');
        lessonItems.each((index, elem) => {
            const cell = $(elem);
            const dayIndex = index % days.length;
            const timeIndex = Math.floor(index / days.length);
            const timeStr = times[timeIndex];

            const lessonBlocks = cell.find('.schedule__lesson');
            lessonBlocks.each((_, lessonElem) => {
                const lesson = $(lessonElem);
                const typeClass = lesson.find('.schedule__lesson-type-chip').attr('class');

                const info = lesson.find('.schedule__lesson-info');
                const subject = info.find('.body-text.schedule__discipline').text().trim();
                const location = info.find('.caption-text.schedule__place').text().trim();

                let teacher;
                let teacherId;
                try {
                    const teacherLinkElem = info.find('.schedule__teacher a');
                    teacher = teacherLinkElem.text().trim();
                    teacherId = teacherLinkElem.attr('href').split('=')[1];
                } catch (e) {
                    teacher = "Преподаватель неизвестен";
                    teacherId = null;
                }

                let groupsHtml = '';
                info.find('a.caption-text.schedule__group').each((_, groupElem) => {
                    const groupName = $(groupElem).text().trim();
                    const groupIdLink = $(groupElem).attr('href').split('=')[1];
                    groupsHtml += `<a href="index.html?groupId=${groupIdLink}&week=${week}" target="_blank">${groupName}</a>, `;
                });

                let lessonInfo = `<b>${subject}</b><br>${location}`;
                if (teacherId) {
                    lessonInfo += `<br><a href="teacher.html?staffId=${teacherId}&week=${week}" target="_blank">${teacher}</a>`;
                } else {
                    lessonInfo += `<br>${teacher}`;
                }
                lessonInfo += `<br>Группы: ${groupsHtml.slice(0, -2)}`;

                let colorClass = '';
                if (typeClass?.includes('lesson-type-1__bg')) {
                    colorClass = 'green';
                } else if (typeClass?.includes('lesson-type-2__bg')) {
                    colorClass = 'pink';
                } else if (typeClass?.includes('lesson-type-3__bg')) {
                    colorClass = 'blue';
                } else if (typeClass?.includes('lesson-type-4__bg')) {
                    colorClass = 'orange';
                } else if (typeClass?.includes('lesson-type-5__bg')) {
                    colorClass = 'dark-blue'; 
                } else if (typeClass?.includes('lesson-type-6__bg')) {
                    colorClass = 'turquoise';
                }

                if (schedule[timeStr] && schedule[timeStr][days[dayIndex]] === '-') {
                    schedule[timeStr][days[dayIndex]] = `<div class="${colorClass}">${lessonInfo}</div>`;
                } else if (schedule[timeStr] && schedule[timeStr][days[dayIndex]] !== '-') {
                    schedule[timeStr][days[dayIndex]] += `<hr><div class="${colorClass}">${lessonInfo}</div>`;
                }
            });
        });

        res.json({
            groupId,
            week,
            groupName,
            groupInfo: {
                title: groupTitle,
                description: groupDescription,
                semesterInfo: groupSemesterInfo
            },
            schedule,
            dates
        });
    } catch (error) {
        console.error('Ошибка при загрузке расписания:', error.message);
        res.status(500).json({ error: 'Ошибка при загрузке расписания' });
    }
});

app.get('/api/teacherSchedule', async (req, res) => {
    try {
        const staffId = req.query.staffId;
        const week = req.query.week;

        if (!staffId || !week) {
            return res.status(400).json({ error: 'Не указан staffId или week' });
        }

        const url = `https://ssau.ru/rasp?staffId=${staffId}&selectedWeek=${week}`;
        console.log(`Загружаю расписание преподавателя с URL: ${url}`);

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const teacherName = $('.page-header h1.h1-text').text().trim();
        const schedule = {};
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const dates = [];
        const dayElements = $('.schedule__item.schedule__head');
        dayElements.each((index, elem) => {
            const date = $(elem).find('.caption-text.schedule__head-date').text().trim();
            if (date !== '') {
                dates.push(date);
            }
        });

        const timeBlocks = $('.schedule__time-item');
        const times = [];
        timeBlocks.each((index, timeElem) => {
            const timeStr = $(timeElem).text().trim();
            if (index % 2 === 0) {
                times.push(`${timeStr} - `);
            } else {
                times[times.length - 1] += timeStr;
            }
        });

        times.forEach((time) => {
            schedule[time] = {};
            days.forEach((day) => {
                schedule[time][day] = '-';
            });
        });

        const lessonItems = $('.schedule__item:not(.schedule__head)');
        lessonItems.each((index, elem) => {
            const cell = $(elem);
            const dayIndex = index % days.length;
            const timeIndex = Math.floor(index / days.length);
            const timeStr = Object.keys(schedule)[timeIndex];

            const lessonBlocks = cell.find('.schedule__lesson');
            lessonBlocks.each((_, lessonElem) => {
                const lesson = $(lessonElem);
                const typeClass = lesson.find('.schedule__lesson-type-chip').attr('class');

                const info = lesson.find('.schedule__lesson-info');
                const subject = info.find('.body-text.schedule__discipline').text().trim();
                const location = info.find('.caption-text.schedule__place').text().trim();

                let teacher;
                try {
                    const teacherLinkElem = info.find('.schedule__teacher a');
                    teacher = teacherLinkElem.text().trim();
                } catch (e) {
                    teacher = "Преподаватель неизвестен";
                }
            const groupElems = info.find('a.caption-text.schedule__group');
             const groups = [];
             if (groupElems.length > 0) {
                 groupElems.each((_, elem) => {
                     const groupId = $(elem).attr('href').split('=')[1];
                     const groupName = $(elem).text().trim();
                     groups.push(`<a href="index.html?groupId=${groupId}&week=${week}" target="_blank">${groupName}</a>`);
                 });
               } else {
                groups.push('Нет групп');
             }

                let lessonInfo = `<b>${subject}</b><br>${location}<br>${teacher}<br>Группы: ${groups.join(', ')}`;
                let colorClass = '';
                if (typeClass?.includes('lesson-type-1__bg')) {
                    colorClass = 'green';
                } else if (typeClass?.includes('lesson-type-2__bg')) {
                    colorClass = 'pink';
                } else if (typeClass?.includes('lesson-type-3__bg')) {
                    colorClass = 'blue';
                } else if (typeClass?.includes('lesson-type-4__bg')) {
                    colorClass = 'orange';
                } else if (typeClass?.includes('lesson-type-5__bg')) {
                    colorClass = 'dark-blue'; 
                } else if (typeClass?.includes('lesson-type-6__bg')) {
                    colorClass = 'turquoise';
                }

                if (schedule[timeStr] && schedule[timeStr][days[dayIndex]] === '-') {
                    schedule[timeStr][days[dayIndex]] = `<div class="${colorClass}">${lessonInfo}</div>`;
                } else if (schedule[timeStr] && schedule[timeStr][days[dayIndex]] !== '-') {
                    schedule[timeStr][days[dayIndex]] += `<hr><div class="${colorClass}">${lessonInfo}</div>`;
                }
            });
        });

        res.json({ staffId, week, teacherName, schedule, dates });
    } catch (error) {
        console.error('Ошибка при загрузке расписания преподавателя:', error.message);
        res.status(500).json({ error: 'Ошибка при загрузке расписания преподавателя' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/index.html'));
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
