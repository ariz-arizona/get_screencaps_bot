const fetch = require('cross-fetch');

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}

const makeQueryString = (queryAttrs) => {
    let queryString = '?';
    for (const [key, value] of Object.entries(queryAttrs)) {
        queryString += `${key}=${value}&`;
    }
    return queryString;
}

const loadPage = async (url, responseType = 'json') => {
    // console.log(url)
    if (!url) {
        return false
    }
    try {
        const res = await fetch(url);

        if (res.status >= 400) {
            throw new Error("Bad response from server");
        }

        switch (responseType) {
            case 'headers':
                return await res.headers;
            case 'text':
                return await res.text();
            case 'json':
            default:
                return await res.json();
        }
    } catch (err) {
        console.error(err);
    }
};

const arrayСhunks = (array, chunk_size) => Array(Math.ceil(array.length / chunk_size)).fill().map((_, index) => index * chunk_size).map(begin => array.slice(begin, begin + chunk_size));

module.exports = { getRandomInt, makeQueryString, loadPage, arrayСhunks }