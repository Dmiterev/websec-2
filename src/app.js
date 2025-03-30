const groupNumberIds = {
    "6411": "1282690301",
    "6412": "1282690279",
    "6413": "1213641978"
  };
  
  
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
            if (weekNumber) {
                updateCurrentWeekDisplay(weekNumber);
                loadSchedule();
            }
        });

        if (weekParam) {
            $('#weekPicker').val(parseInt(weekParam, 10));
            updateCurrentWeekDisplay(weekParam);
            loadSchedule();
        }
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
  
  async function loadScheduleData(week) {
    let data = null;
    const groupNumber = document.getElementById('groupSelect').value;
    if (!groupNumber) return;

    try {
        const res = await fetch(`http://localhost:3000/api/schedule?groupId=${groupNumber}&week=${week}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        data = await res.json();
        renderSchedule(data.dates, data.schedule);
        updateBrowserHistory(groupNumber, week);
    } catch (error) {
        console.error('Ошибка при загрузке расписания:', error.message);
    }
}

function renderSchedule(dates, scheduleData) {
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
}




function loadSchedule() {
    const weekNumber = $('#weekPicker').val();
    loadScheduleData(weekNumber);
}
  
  function updateBrowserHistory(group, week) {
      const params = new URLSearchParams({ groupId: group, week });
      window.history.replaceState({}, '', `?${params.toString()}`);
  }
  