const { Client } = require('discord.js')
const auth = require('./env/auth.json')
const winston = require('winston')
const { combine, timestamp, prettyPrint } = winston.format;

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'bot-service' },
    format: combine(
        timestamp(),
        prettyPrint()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
})

/**
 * initial
 */
var client = new Client()
client.on('ready', function () {
    const date = new Date()
    console.log('Ready...')
    logger.info(`Bot started on ${date}`)
});
client.logger = logger

/**
 * MongoDB
 */
client.mongo = require('mongodb').MongoClient
client.mongo.connect(`mongodb://${auth.mongo.server}:${auth.mongo.port}`, { useNewUrlParser: true }, (err, mDb) => {
    if (err) {
        console.error(err)
        throw(err)
    }
    client.db = mDb.db(auth.mongo.database)

    /**
     * Node emoji
     */
    client.emoji = require('node-emoji')

    /**
     * Bot core
     */
    client.core = require('./src/core.js')
    client.core.start(client, {
        signUp: {
            alt: [ 'nc' ]
        },
        userInfo: {
            name: 'me'
        },
        userLol: {
            alt: [ 'mp' ]
        },
        gameUser: {
            alt: [ 'mg' ]
        }
    })

    /**
     * Music bot
     */
    client.music = require("./src/music.js")
    client.music.start(client, {
        youtubeKey: auth.youtubeAPI,
        help: {
            name: "helpmusic"
        },
        freeSkip: true
    })

    /**
     * Riot BOT
     */
    client.riot = require('./src/riot.js')
    client.riot.start(client, {
        apiKey: auth.riotAPI,
        region: "br",
        playerInfo: {
            alt: ['playerinfo', 'jogador', '-p']
        },
        gameInfo: {
            embedColor: '0x7900d1',
            alt: ['gameinfo', 'jogo', '-g']
        },
        champtionInfo: {
            embedColor: '0xffe500',
            alt: ['champ', 'personagem', '-c']
        },
        matchesInfo: {
            alt: [ '-h' ]
        }
    })

    /**
     * Code BOT
     */
    client.code = require('./src/code.js')
    client.code.start(client, {
        codeforcesKEY: auth.codeforcesAPI,
        region: "br",
        contestChannelID: [ 552986111014862868, 552981990702448641 ]
    })
})
client.login(auth.token)