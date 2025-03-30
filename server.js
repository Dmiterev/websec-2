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

// API для получения расписания
app.get('/api/schedule', async (req, res) => {
    try {
        const groupId = req.query.groupId;
        const week = req.query.week;

        if (!groupId || !week) {
            return res.status(400).json({ error: 'Не указан groupId или week' });
        }

        const url = `https://ssau.ru/rasp?groupId=${groupId}&selectedWeek=${week}`;
        console.log(`Загружаю расписание с URL: ${url}`);

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const schedule = {};
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const dates = [];
        const dayElements = $('.schedule__item.schedule__head');
        // Извлечение дней недели и дат
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

        times.forEach((time, index) => {
            schedule[time] = {};
            days.forEach((day, index) => {
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
                const type = lesson.find('.schedule__lesson-type > div').text().trim();
                const typeClass = lesson.find('.schedule__lesson-type-chip').attr('class');

                const info = lesson.find('.schedule__lesson-info');
                const subject = info.find('.schedule__discipline').text().trim();
                const location = info.find('.schedule__place').text().trim();

                const teacherLinkElem = info.find('.schedule__teacher a');
                const teacher = teacherLinkElem.text().trim();

                const subgroupElems = info.find('.schedule__groups span.caption-text');
                const teacherGroups = info.find('a.schedule__group');
                const groups = [];
                subgroupElems.each((_, subgroupElem) => {
                    groups.push($(subgroupElem).text().trim());
                });
                teacherGroups.each((_, elem) => {
                    groups.push($(elem).text().trim());
                });

                let lessonInfo = `<b>${subject}</b><br>${location}<br>${teacher}`;
                if (groups.length) {
                    lessonInfo += `<br>${groups.join(', ')}`;
                }

                let colorClass = '';
                if (typeClass.includes('lesson-type-1__bg')) {
                    colorClass = 'green';
                } else if (typeClass.includes('lesson-type-2__bg')) {
                    colorClass = 'pink';
                } else if (typeClass.includes('lesson-type-3__bg')) {
                    colorClass = 'blue';
                } else if (typeClass.includes('lesson-type-4__bg')) {
                    colorClass = 'orange';
                } else if (typeClass.includes('lesson-type-5__bg')) {
                    colorClass = 'dark-blue'; 
                } else if (typeClass.includes('lesson-type-6__bg')) {
                    colorClass = 'turquoise';
                }

                if (schedule[timeStr][days[dayIndex]] === '-') {
                    schedule[timeStr][days[dayIndex]] = `<div class="${colorClass}">${lessonInfo}</div>`;
                } else {
                    schedule[timeStr][days[dayIndex]] += `<hr><div class="${colorClass}">${lessonInfo}</div>`;
                }
            });
        });
        res.json({ groupId, week, schedule, dates});
    } catch (error) {
        console.error('Ошибка при загрузке расписания:', error.message);
        res.status(500).json({ error: 'Ошибка при загрузке расписания' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/index.html'));
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
