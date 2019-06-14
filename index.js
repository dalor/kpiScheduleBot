const TelegramBot = require('node-telegram-bot-api');
const schedule = require('./kpiScheduleGroupParser');

const bot = new TelegramBot(process.env.BOT_TOKEN);

const days = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];

const times = ['08:30', '10:25', '12:20', '14:15', '16:10'];

const stringify_week = (title, week) => {
    for (day_id in week) {
        const day = week[day_id];
        let lessons = '';
        for (lesson_id in day) {
            const lesson = day[lesson_id];
            if (lesson) {
                const teachers = lesson.teachers;
                const places = lesson.places;
                teachers.forEach((element, id, list) => {
                    list[id] = `<a href="${element.url}">${element.text}</a>`;
                });
                places.forEach((element, id, list) => {
                    list[id] = `<a href="${element.url}">${element.text}</a>`;
                });
                lessons += `\n<i>${parseInt(lesson_id) + 1}</i>   (${times[lesson_id]})\n\t<a href="${lesson.subject.url}">${lesson.subject.text}</a>${(teachers.length) ? '\n\t' + teachers.join(', ') : ''}${(places.length) ? '\n\t' + places.join(', ') : ''}`;
            }
        }
        if (lessons) {
            title += '\n\n' + days[day_id] + lessons; 
        }
    }
    return title;
}

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Надішліть номер групи');
})

bot.onText(/[А-Яа-яІіЇїЄє]{2}\-[0-9]{2}$/, (msg, match) => {
    const group = match[0].toUpperCase();
    const chat_id = msg.chat.id;
    bot.sendMessage(chat_id, `Шукаю групу ${group}`).then((mess) => {
        schedule(group,
            (first, second) => {
                bot.sendMessage(chat_id, stringify_week('<b>Перший тиждень</b>', first), {parse_mode: 'HTML'}).then(() => {
                    bot.sendMessage(chat_id, stringify_week('<b>Другий тиждень</b>', second), {parse_mode: 'HTML'});
                });
            },
            () => {
                bot.sendMessage(chat_id, '¯\\_(ツ)_/¯', {reply_to_message_id: mess.message_id});
            });
    });
})

module.exports = (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        if (body) {
            bot.processUpdate(JSON.parse(body));
        }
        res.end('OK');
    });
};
