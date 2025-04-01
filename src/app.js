document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId');
    const weekParam = urlParams.get('week');

    $.getJSON('/api/groups', function(groups) {
        groups.forEach(group => {
            $('#groupSelect').append($('<option>', {
                value: group.id,
                text: group.name
            }));
        });

        generateWeekOptions();

        let selectedGroupId = groupId || null; 
        if (selectedGroupId) {
            document.getElementById('groupSelect').value = selectedGroupId;
        }

        $('#groupSelect, #weekPicker').change(() => {
            const weekNumber = $('#weekPicker').val();
            const selectedGroupId = $('#groupSelect').val();
            if (weekNumber && selectedGroupId) {
                updateCurrentWeekDisplay(weekNumber);
                updateNavigationButtons(weekNumber);
                updateBrowserHistory(selectedGroupId, weekNumber);
                loadSchedule(selectedGroupId, weekNumber);
            }
        });

        if (weekParam && groupId) {
            $('#weekPicker').val(parseInt(weekParam, 10));
            updateCurrentWeekDisplay(weekParam);
            updateNavigationButtons(weekParam);
            loadSchedule(groupId, weekParam);
        } else {
            updateNavigationButtons(1);
        }

        function updateNavigationButtons(weekNumber) {
            const prevWeek = weekNumber > 1 ? weekNumber - 1 : 52;
            const nextWeek = weekNumber < 52 ? parseInt(weekNumber) + 1 : 1;

            document.getElementById('prevWeek').textContent = `< Неделя ${prevWeek}`;
            document.getElementById('nextWeek').textContent = `Неделя ${nextWeek} >`;
        }

        document.getElementById('prevWeek').addEventListener('click', () => {
            let currentWeek = parseInt($('#weekPicker').val(), 10);
            const selectedGroupId = $('#groupSelect').val();
            if (currentWeek > 1) {
                currentWeek -= 1;
            } else {
                currentWeek = 52;
            }
            $('#weekPicker').val(currentWeek).trigger('change');
            if (selectedGroupId) {
                updateBrowserHistory(selectedGroupId, currentWeek);
                loadSchedule(selectedGroupId, currentWeek);
            }
        });

        document.getElementById('nextWeek').addEventListener('click', () => {
            let currentWeek = parseInt($('#weekPicker').val(), 10);
            const selectedGroupId = $('#groupSelect').val();
            if (currentWeek < 52) {
                currentWeek += 1;
            } else {
                currentWeek = 1;
            }
            $('#weekPicker').val(currentWeek).trigger('change');
            if (selectedGroupId) {
                updateBrowserHistory(selectedGroupId, currentWeek);
                loadSchedule(selectedGroupId, currentWeek);
            }
        });
    });
});

function updateCurrentWeekDisplay(weekNumber) {
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');
    currentWeekDisplay.textContent = weekNumber ? `Неделя ${weekNumber}` : "Выберите неделю";
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

function renderSchedule(dates, scheduleData, groupName, groupInfo) {
    const $tableBody = $('#scheduleBody');
    $tableBody.empty();

    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const times = Object.keys(scheduleData);

    const $table = $('#scheduleTable');
    $table.find('thead').empty().append(
        $('<tr>').append(
            $('<th>').text('Время'),
            ...days.map((day, index) => $('<th>').text(`${day} (${dates[index]})`))
        )
    );

    times.forEach(time => {
        $tableBody.append(
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

    const $header = $('h1');
    $header.text(groupName);

    const $groupInfo = $('#groupInfo');
    $groupInfo.empty();
    $groupInfo.append(
        $('<h2>').text(groupInfo.title),
        $('<div>').html(groupInfo.description),
        $('<div>').text(groupInfo.semesterInfo)
    );
}

async function loadScheduleData(groupId, week) {
    let data = null;

    try {
        const response = await fetch(`/api/schedule?groupId=${groupId}&week=${week}`);
        if (!response.ok) {
            if (response.status === 404) {
                alert('Группа не найдена');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
        renderSchedule(data.dates, data.schedule, data.groupName, data.groupInfo);
    } catch (error) {
        console.error('Ошибка при загрузке расписания:', error.message);
    }
}

function getTeacherIdFromHtml(html) {
    const teacherLinkMatch = html.match(/href="\/rasp\?staffId=(\d+)"/);
    if (teacherLinkMatch) {
        return teacherLinkMatch[1];
    }
    return null;
}

function loadSchedule(groupId, weekNumber) {
    loadScheduleData(groupId, weekNumber);
}

function updateBrowserHistory(group, week) {
    const params = new URLSearchParams({ groupId: group, week });
    window.history.replaceState({}, '', `?${params.toString()}`);
}