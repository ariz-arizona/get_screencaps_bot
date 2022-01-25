require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const HTMLParser = require('node-html-parser');
const { decodeEntity } = require('html-entities');

const { loadPage, getRandomInt, makeQueryString, arrayСhunks } = require('./helpers');

const { BOT_TOKEN } = process.env;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const mainUrl = 'https://movie-screencaps.com/wp-json/wp/v2';
const mainUrlGeneral = 'https://movie-screencaps.com';

const getRandomFilm = async (chatId, category) => {
    const techMsg = await bot.sendMessage(chatId, `Выбрана категория ${category}`);
    const techMsgId = techMsg.message_id;

    try {
        const queryAttrs = {
            "cat": category,
            "_fields": "id",
            "per_page": 1
        }
        const cat = await loadPage(`${mainUrl}/posts${makeQueryString(queryAttrs)}`, 'headers');
        const allPostsCount = parseInt(cat.get('X-WP-Total'));

        queryAttrs.offset = getRandomInt(0, allPostsCount - 1);
        queryAttrs._fields = "id,title,excerpt"
        const post = await loadPage(`${mainUrl}/posts${makeQueryString(queryAttrs)}`);

        const { id, title, excerpt } = post[0];

        bot.editMessageText(`Выбрал случайную запись ${id}`, { chat_id: chatId, message_id: techMsgId });

        //штож, теперь выбираем картинку стандартным методом
        let content = await loadPage(`${mainUrlGeneral}/?p=${id}`, 'text');
        let dom = HTMLParser.parse(content);

        const pagesCount = parseInt(dom.querySelector('.paginate option:last-child').textContent);
        const link = dom.querySelector('link[rel="canonical"]').getAttribute('href');
        const randomPage = getRandomInt(1, pagesCount);

        bot.editMessageText(`Выбрал случайную страницу ${randomPage}`, { chat_id: chatId, message_id: techMsgId });

        content = await loadPage(`${link}/page/${randomPage}`, 'text');
        dom = HTMLParser.parse(content);

        const images = dom.querySelectorAll("a[href*='caps.pictures']");
        const randomImage = getRandomInt(0, images.length - 1);
        const imageHref = images[randomImage].getAttribute('href');

        bot.editMessageText(`Выбрал случайный элемент ${randomImage} ${imageHref}`, { chat_id: chatId, message_id: techMsgId, disable_web_page_preview: true });

        bot.sendPhoto(
            chatId,
            `${imageHref}?w=600`,
            {
                caption: `${link}/page/${randomPage}\n\n${decodeEntity(title.rendered)}\n\n${decodeEntity(excerpt.rendered.replace(/<\/?p>/g, ''))}`,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Еще раз!',
                                callback_data: `rand_${category}`
                            }
                        ]
                    ]
                }
            }
        );
    } catch (error) {
        bot.sendMessage(chatId, 'Ой! Что-то случилось! Может, попробуете еще раз?');
        console.log(`Ошибка в чате ${chatId}\n${error}`);
    }
}


bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос start от чат айди ${chatId}`);
    try {
        const queryAttrs = {
            "_fields": "id,name",
            "per_page": 100
        }
        let categories = await loadPage(`${mainUrl}/categories${makeQueryString(queryAttrs)}`);
        categories = categories.filter(el => {
            return !['1080p Bluray', '2160p 4K', '480p DVD', '720p Bluray'].includes(el.name);
        })
        const categoriesChunks = arrayСhunks(categories, 3);
        const buttons = [];
        categoriesChunks.map(cat => {
            const row = [];
            cat.forEach(element => {
                row.push({
                    text: decodeEntity(element.name),
                    callback_data: `rand_${element.id}`
                })
            });
            buttons.push(row);
        });
        bot.sendMessage(
            chatId,
            'Привет! Давай погадаем?',
            {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    inline_keyboard: buttons
                },
            }
        );

    } catch (error) {
        bot.sendMessage(chatId, 'Ой! Что-то случилось! Может, попробуете еще раз?');
        console.log(`Ошибка в чате ${chatId}\n${error}`);
    }
})

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    // message_id: msg.message_id,

    if (action.indexOf('rand_') === 0) {
        const vars = action.replace('rand_', '').split('_');
        getRandomFilm(chatId, vars[0])
    }

    return bot.answerCallbackQuery(callbackQuery.id);
});

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error);
});