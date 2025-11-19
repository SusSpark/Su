// Глобальные переменные
const buttons = document.querySelectorAll('nav button');
const sections = document.querySelectorAll('section');

let gradeBook = [];
let subjectsList = [];
let chartInstances = {}; // Хранилище для графиков

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    setupFileUpload();
    setupExportButtons();
    setupAddUserButton();

    // Загрузка данных из localStorage при старте
    if (loadData()) {
        renderAll();
    }
});

// Настройка навигации
function setupNavigation() {
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-section');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            if (target === 'statsSection') {
                renderStatisticsGraphs();
            }
        });
    });
}

// Настройка загрузки файлов
function setupFileUpload() {
    document.getElementById('fileInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'csv') {
            const reader = new FileReader();
            reader.onload = e => {
                const text = e.target.result;
                let parsed = parseCSVorTXT(text);
                parsed = parsed.filter(row => row['ФИО'] && row['Класс']);
                if (parsed.length === 0) {
                    document.getElementById('uploadMessage').textContent = 'CSV файл пустой или невалидный';
                    return;
                }
                localStorage.setItem('gradeBook', JSON.stringify(parsed));
                document.getElementById('uploadMessage').textContent = 'CSV файл успешно загружен!';
                loadData();
                renderAll();
                sections.forEach(s => s.classList.remove('active'));
                document.getElementById('viewSection').classList.add('active');
            };
            reader.readAsText(file, 'UTF-8');
        } else if (ext === 'txt') {
            const reader = new FileReader();
            reader.onload = e => {
                const text = e.target.result;
                let parsed = parseCSVorTXT(text);
                parsed = parsed.filter(row => row['ФИО'] && row['Класс']);
                if (parsed.length === 0) {
                    document.getElementById('uploadMessage').textContent = 'TXT файл пустой или невалидный';
                    return;
                }
                localStorage.setItem('gradeBook', JSON.stringify(parsed));
                document.getElementById('uploadMessage').textContent = 'TXT файл успешно загружен!';
                loadData();
                renderAll();
                sections.forEach(s => s.classList.remove('active'));
                document.getElementById('viewSection').classList.add('active');
            };
            reader.readAsText(file, 'UTF-8');
        } else {
            alert('Поддерживаются только CSV и TXT файлы');
        }
    });
}

// Парсинг CSV/TXT файлов
function parseCSVorTXT(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        if (values.length !== headers.length) continue;
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] !== undefined ? values[idx].trim() : '';
        });
        data.push(obj);
    }
    return data;
}

// Загрузка данных из localStorage
function loadData() {
    const raw = localStorage.getItem('gradeBook');
    if (!raw) {
        gradeBook = [];
        subjectsList = [];
        return false;
    }
    try {
        gradeBook = JSON.parse(raw);
        if (!Array.isArray(gradeBook) || gradeBook.length === 0) {
            gradeBook = [];
            subjectsList = [];
            return false;
        }
        subjectsList = Object.keys(gradeBook[0]).filter(k => k !== 'ФИО' && k !== 'Класс');
        return true;
    } catch {
        gradeBook = [];
        subjectsList = [];
        return false;
    }
}

// Рендеринг всех таблиц
function renderAll() {
    renderViewTable();
    renderEditTable();
    renderStatisticsGraphs();
}

// Рендеринг таблицы просмотра
function renderViewTable() {
    const container = document.getElementById('viewTableContainer');
    if (gradeBook.length === 0) {
        container.innerHTML = '<p id="noData">Данные отсутствуют. Загрузите журнал.</p>';
        return;
    }
    let html = '<table><thead><tr><th>ФИО</th><th>Класс</th>';
    subjectsList.forEach(subj => html += `<th>${subj}</th>`);
    html += '</tr></thead><tbody>';
    gradeBook.forEach(row => {
        html += `<tr><td>${row['ФИО'] || ''}</td><td>${row['Класс'] || ''}</td>`;
        subjectsList.forEach(subj => {
            html += `<td>${row[subj] !== undefined ? row[subj] : ''}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Рендеринг таблицы редактирования
function renderEditTable() {
    const container = document.getElementById('editTableContainer');
    if (gradeBook.length === 0) {
        container.innerHTML = '<p id="noData">Данные отсутствуют. Загрузите журнал.</p>';
        return;
    }
    let html = '<table><thead><tr><th>ФИО</th><th>Класс</th>';
    subjectsList.forEach(subj => html += `<th>${subj}</th>`);
    html += '<th>Удалить</th></tr></thead><tbody>';
    gradeBook.forEach((row, i) => {
        html += `<tr>
      <td><input type="text" value="${row['ФИО'] || ''}" data-row="${i}" data-field="ФИО"></td>
      <td><input type="text" value="${row['Класс'] || ''}" data-row="${i}" data-field="Класс"></td>`;
        subjectsList.forEach(subj => {
            html += `<td><input type="number" min="1" max="5" value="${row[subj] || ''}" data-row="${i}" data-field="${subj}"></td>`;
        });
        html += `<td><button class="delete-user" data-row="${i}">X</button></td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
        input.addEventListener('change', handleCellEdit);
    });
    container.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', handleDeleteUser);
    });

    document.getElementById('statsGradeStats').innerHTML = '';
}

// Обработка редактирования ячейки
function handleCellEdit(e) {
    const row = +e.target.getAttribute('data-row');
    const field = e.target.getAttribute('data-field');
    let value = e.target.value;

    if (subjectsList.includes(field)) {
        value = value.replace(',', '.');
        let num = parseFloat(value);
        if (isNaN(num) || num < 1 || num > 5) {
            alert('Оценка должна быть числом от 1 до 5');
            e.target.value = gradeBook[row][field] || '';
            return;
        }
        gradeBook[row][field] = num;
    } else {
        gradeBook[row][field] = value;
    }
    localStorage.setItem('gradeBook', JSON.stringify(gradeBook));
    renderViewTable();
    renderStatisticsGraphs();
}

// Удаление пользователя
function handleDeleteUser(e) {
    const row = +e.target.getAttribute('data-row');
    if (!confirm(`Удалить пользователя "${gradeBook[row]['ФИО']}"?`)) return;
    gradeBook.splice(row, 1);
    localStorage.setItem('gradeBook', JSON.stringify(gradeBook));
    renderEditTable();
    renderViewTable();
    renderStatisticsGraphs();
}

// Добавление пользователя
function setupAddUserButton() {
    document.getElementById('addUserBtn').addEventListener('click', () => {
        const newUser = { 'ФИО': '', 'Класс': '' };
        subjectsList.forEach(subj => newUser[subj] = '');
        gradeBook.push(newUser);
        localStorage.setItem('gradeBook', JSON.stringify(gradeBook));
        renderEditTable();
        renderViewTable();
    });
}

// Настройка кнопок экспорта
function setupExportButtons() {
    document.getElementById('exportCSVBtn').addEventListener('click', () => {
        if (gradeBook.length === 0) {
            alert('Нет данных для экспорта!');
            return;
        }
        let csv = 'ФИО,Класс,' + subjectsList.join(',') + '\n';
        gradeBook.forEach(row => {
            let line = `"${row['ФИО']}","${row['Класс']}"`;
            subjectsList.forEach(subj => {
                line += `,${row[subj]}`;
            });
            csv += line + '\n';
        });
        downloadFile(csv, 'journal.csv', 'text/csv;charset=utf-8');
    });

    document.getElementById('exportTXTBtn').addEventListener('click', () => {
        if (gradeBook.length === 0) {
            alert('Нет данных для экспорта!');
            return;
        }
        let lines = [];
        const headers = ['ФИО', 'Класс', ...subjectsList];
        lines.push(headers.join('\t'));
        gradeBook.forEach(row => {
            const line = headers.map(h => row[h] || '').join('\t');
            lines.push(line);
        });
        const txt = lines.join('\n');
        downloadFile(txt, 'journal.txt', 'text/plain;charset=utf-8');
    });
}

// Скачивание файла
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

// Вычисление медианы
function median(arr) {
    if (arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        return sorted[mid];
    }
}

// Рендеринг статистики
function renderStatisticsGraphs() {
    const chartContainer = document.getElementById('chartContainer');
    const tableContainer = document.getElementById('tableContainer');
    const statsGradeStats = document.getElementById('statsGradeStats');
    chartContainer.innerHTML = '';
    tableContainer.innerHTML = '';
    statsGradeStats.innerHTML = '';

    if (!loadData() || gradeBook.length === 0) {
        chartContainer.style.display = 'none';
        tableContainer.style.display = 'none';
        statsGradeStats.style.display = 'none';
        document.getElementById('noData').style.display = 'block';
        return;
    }

    chartContainer.style.display = 'block';
    tableContainer.style.display = 'block';
    statsGradeStats.style.display = 'block';
    document.getElementById('noData').style.display = 'none';

    const classes = Array.from(new Set(gradeBook.map(r => r['Класс']))).sort((a, b) => {
        const parseClass = c => {
            const m = c.match(/^(\d+)([А-Яа-яA-Za-z]*)$/);
            if (!m) return [1000, c];
            return [parseInt(m[1], 10), m[2].toUpperCase()];
        };
        const [numA, letA] = parseClass(a);
        const [numB, letB] = parseClass(b);
        if (numA !== numB) return numA - numB;
        return letA.localeCompare(letB);
    });

    subjectsList.forEach(subj => {
        // Создаем canvas для графика
        const canvas = document.createElement('canvas');
        canvas.id = `chart-${subj}`;
        canvas.style.marginBottom = '30px';
        chartContainer.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const data = classes.map(cls => {
            const studentsInClass = gradeBook.filter(r => r['Класс'] === cls);
            const vals = studentsInClass.map(r => parseFloat(r[subj])).filter(v => !isNaN(v));
            if (vals.length === 0) return 0;
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            return +avg.toFixed(2);
        });

        // Удаляем старый график если существует
        if (chartInstances[subj]) {
            chartInstances[subj].destroy();
        }

        // Создаем новый график
        chartInstances[subj] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: classes,
                datasets: [{
                    label: `Средний балл по предмету: ${subj}`,
                    data: data,
                    backgroundColor: 'rgba(118,75,162,0.7)',
                    borderColor: '#764ba2',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `Средний балл по классу для предмета "${subj}"`,
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        title: { display: true, text: 'Средний балл' }
                    },
                    x: {
                        title: { display: true, text: 'Классы' }
                    }
                }
            }
        });

        // Таблица со статистикой
        let html = `<h3 style="color: #764ba2; margin: 2rem 0 1rem 0;">Предмет: ${subj}</h3>`;
        html += '<table><caption style="caption-side: top; font-weight: bold; margin-bottom: 8px;">';
        html += `Средние показатели по предмету: ${subj}</caption>`;
        html += '<thead><tr><th>Класс</th><th>Средний балл</th><th>Медиана</th></tr></thead><tbody>';

        classes.forEach(cls => {
            const studentsInClass = gradeBook.filter(r => r['Класс'] === cls);
            const vals = studentsInClass.map(r => parseFloat(r[subj])).filter(v => !isNaN(v));
            const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '0';
            const med = vals.length ? median(vals).toFixed(2) : '0';
            html += `<tr><td>${cls}</td><td>${avg}</td><td>${med}</td></tr>`;
        });
        html += '</tbody>';

        const allVals = gradeBook.map(r => parseFloat(r[subj])).filter(v => !isNaN(v));
        const totalAvg = allVals.length ? (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(2) : '0';
        const totalMed = allVals.length ? median(allVals).toFixed(2) : '0';

        html += '<tfoot><tr style="font-weight: bold;">';
        html += `<td>Итого</td><td>${totalAvg}</td><td>${totalMed}</td></tr></tfoot></table>`;

        tableContainer.innerHTML += html;
    });

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalGrades = 0;
    gradeBook.forEach(row => {
        subjectsList.forEach(subj => {
            const val = parseFloat(row[subj]);
            if (!isNaN(val) && val >= 1 && val <= 5) {
                counts[val]++;
                totalGrades++;
            }
        });
    });

    if (totalGrades === 0) {
        statsGradeStats.innerHTML = '<em>Оценок пока нет.</em>';
    } else {
        let html = '<strong>Статистика оценок (кол-во и %):</strong><br>';
        for (let grade = 1; grade <= 5; grade++) {
            const count = counts[grade];
            const percent = ((count / totalGrades) * 100).toFixed(1);
            html += `Оценка <strong>${grade}</strong>: ${count} учеников (${percent}%)<br>`;
        }
        statsGradeStats.innerHTML = html;
    }
}