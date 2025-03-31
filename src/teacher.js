$(document).ready(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let staffId = urlParams.get('staffId');
    let week = parseInt(urlParams.get('week')) || 1;

    if (!staffId) {
        $('#teacherSchedule').text('Не указан staffId');
        return;
    }

    function loadTeacherSchedule(staffId, week) {
        $.getJSON(`/api/teacherSchedule?staffId=${staffId}&week=${week}`, (response) => {
            renderTeacherSchedule(response.teacherName, response.dates, response.schedule);
            updateCurrentWeekDisplay(week);
            updateNavigationButtons(week);
        }).fail((error) => {
            console.error('Ошибка при загрузке расписания преподавателя:', error);
            $('#teacherSchedule').text('Ошибка при загрузке расписания');
        });
    }

    function renderTeacherSchedule(teacherName, dates, scheduleData) {
        const $teacherHeader = $('#teacherHeader');
        $teacherHeader.text(teacherName);
    
        const $teacherSchedule = $('#teacherSchedule');
        $teacherSchedule.empty();
    
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const times = Object.keys(scheduleData);
    
        const $table = $('<table>').addClass('schedule-table');
        const $thead = $('<thead>').appendTo($table);
        const $tbody = $('<tbody>').appendTo($table);
    
        $thead.append(
            $('<tr>').append(
                $('<th>').text('Время'),
                ...days.map((day, index) => $('<th>').text(`${day} (${dates[index]})`))
            )
        );
    
        times.forEach(time => {
            $tbody.append(
                $('<tr>').append(
                    $('<td>').text(time),
                    ...days.map(day => {
                        if (scheduleData[time][day] !== '-') {
                            return $('<td>').html(scheduleData[time][day]);
                        } else {
                            return $('<td>').text('-');
                        }
                    })
                )
            );
        });
    
        $teacherSchedule.append($table);
    }
    

    function updateCurrentWeekDisplay(week) {
        $('#currentWeekDisplay').text(`Неделя ${week}`);
    }

    function updateNavigationButtons(weekNumber) {
        const prevWeek = weekNumber > 1 ? weekNumber - 1 : 52;
        const nextWeek = weekNumber < 52 ? parseInt(weekNumber) + 1 : 1;

        document.getElementById('prevWeek').textContent = `Неделя ${prevWeek}`;
        document.getElementById('nextWeek').textContent = `Неделя ${nextWeek}`;
    }

    function updateUrlParams(staffId, week) {
        const url = new URL(window.location.href);
        url.searchParams.set('staffId', staffId);
        url.searchParams.set('week', week);
        window.history.pushState({}, '', url.toString());
    }

    function generateWeekOptions() {
        const weekPicker = document.getElementById('weekPicker');
        for (let i = 1; i <= 52; i++) { 
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} неделя`;
            weekPicker.appendChild(option);
        }
    }

    generateWeekOptions();

    if (week) {
        $('#weekPicker').val(week);
    }

    $('#weekPicker').change(() => {
        const selectedWeek = parseInt($('#weekPicker').val(), 10);
        loadTeacherSchedule(staffId, selectedWeek);
        updateUrlParams(staffId, selectedWeek);
    });

    document.getElementById('prevWeek').addEventListener('click', () => {
        let currentWeek = parseInt($('#weekPicker').val(), 10);
        if (currentWeek > 1) {
            $('#weekPicker').val(currentWeek - 1).trigger('change');
        } else {
            $('#weekPicker').val(52).trigger('change');
        }
    });

    document.getElementById('nextWeek').addEventListener('click', () => {
        let currentWeek = parseInt($('#weekPicker').val(), 10);
        if (currentWeek < 52) {
            $('#weekPicker').val(currentWeek + 1).trigger('change');
        } else {
            $('#weekPicker').val(1).trigger('change');
        }
    });

    loadTeacherSchedule(staffId, week);
});
