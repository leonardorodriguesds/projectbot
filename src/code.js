const Discord = require('discord.js')
const request = require('request')
const schedule = require('node-schedule')

Number.prototype.toTime = function () {
    var sec_num = parseInt(this, 10)
    var days    = Math.floor(sec_num / 86400)
    var hours   = Math.floor((sec_num - (days * 86400)) / 3600)
    var minutes = Math.floor((sec_num - (days * 86400) - (hours * 3600)) / 60)
    var result = (days > 0)? days + ' dia' + ((days > 1)? 's ' : ' ') : ''
    result += (hours > 0)? ((result != '')? 'e ' : '') + hours + ' hora' + ((hours > 1)? 's ' : ' ') : ''
    if (!days)  result += (minutes > 0)? ((result != '')? 'e ' : '') + minutes + ' minuto' + ((minutes > 1)? 's ' : ' ') : ''
    return result 
}

exports.start = (client, options) => {
    try {
        if (options.contestChannelID == undefined)
            throw ('codeBot: É preciso eleger um canal de texto para exibir informações dos contests')
        if (options.codeforcesKEY == undefined)
            throw ('codeBot: Informe sua key da api do codeforces')

        if (!client.mongo || !client.db) throw('[CORE] Não foi possível encontrar o link com o mongoDB.')

        class Code {
            constructor(client, options) {
                this.commands = new Map()
                this.aliases = new Map()
                this.client = client
                this.defaultPrefix = (options && options.defaultPrefix) || "-"
                this.botPrefix = (options && options.botPrefix) || "-"
                this.embedColor = (options && options.embedColor) || "0x006bd6"
                this.codeforcesKEY = options.codeforcesKEY
                this.aliasesContests = new Map()
                this.contestChannelID = (options.contestChannelID) || null
                this.contestChannel = Array()

                this.ContestsList = {
                    enabled: true,
                    run: "ContestsListFunction",
                    alt: [],
                    help: "Comando para listar os próximos contests no codeforces.",
                    name: "contests",
                    usage: null,
                    embedColor: this.embedColor,
                    masked: "contests"
                }
                if (options.ContestsList) this.ContestsList = Object.assign(this.ContestsList, options.ContestsList)

                this.CodeforcesUserInfo = {
                    enabled: true,
                    run: "CodeforcesUserInfoFunction",
                    alt: [],
                    help: "Comando para listar os próximos contests no codeforces.",
                    name: "cfuser",
                    usage: null,
                    embedColor: this.embedColor,
                    masked: "cfuser"
                }
                if (options.CodeforcesUserInfo) this.CodeforcesUserInfo = Object.assign(this.CodeforcesUserInfo, options.CodeforcesUserInfo)

                this.addChannelContestInfo = {
                    enabled: true,
                    run: "addChannelContestInfoFunction",
                    alt: [],
                    help: "Comando para limpar mensagens do chat.",
                    name: "cfaddchannel",
                    usage: `Use ${this.botPrefix}${(options && options.addChannelContestInfo && options.addChannelContestInfo.name) || "addChannelContestInfo"} N(0 <= n <= 99), ou ${this.botPrefix}${(options && options.addChannelContestInfo && options.addChannelContestInfo.name) || "addChannelContestInfo"} para limpar tudo`,
                    embedColor: this.embedColor,
                    masked: "cfaddchannel"
                }
                if (options.addChannelContestInfo) this.addChannelContestInfo = Object.assign(this.addChannelContestInfo, options.addChannelContestInfo)
                
                this.channelWhitelist = (options && options.channelWhitelist) || []
                this.channelBlacklist = (options && options.channelBlacklist) || []
                this.recentTalk = new Set()
                this.logging = (options && typeof options.logging !== 'undefined' ? options && options.logging : true)

                this.cooldown = {
                    enabled: (options && options.cooldown ? options && options.cooldown.enabled : true),
                    timer: parseInt((options && options.cooldown && options.cooldown.timer) || 10000),
                    exclude: (options && options.cooldown && options.cooldown.exclude) || []
                }

                this.apiEndPoints = {
                    'codeforces': {
                        'contests': {
                            'list': `https://codeforces.com/api/contest.list`
                        },
                        'users': {
                            'info': 'https://codeforces.com/api/user.info',
                            'rating': 'https://codeforces.com/api/user.rating'
                        }
                    }
                }
            }

            isAdmin(member) {
                if (member.roles.find(r => r.name == this.djRole)) return true;
                if (this.ownerOverMember && member.id === this.botOwner) return true;
                if (this.botAdmins.includes(member.id)) return true;
                return member.hasPermission("ADMINISTRATOR");
            }

            getUrl(path, args = null, options = null) {
                if (path) {
                    var url = ''
                    var tmpPath = this.apiEndPoints
                    while (path.length) {
                        if (path[0] in tmpPath) {
                            tmpPath = tmpPath[path[0]]
                            path.shift()
                            if (!path.length && typeof tmpPath === 'string') {
                                url += tmpPath
                            }
                        } else throw(`Não foi possível encontrar essa endpoint.\nPath: ${path.join('>')}`)
                    }
                    url += `?${args? `&${Object.keys(args).map(e => e + '=' + args[e]).join('&')}` : ''}`
                    return url
                }
                return null
            }
        }

        var codeBot = new Code(client, options)
        client.code = codeBot

        codeBot.addCommand = (cmd) => {
            return new Promise((resolve, reject) => {
                let props = {
                    enabled: cmd.enabled,
                    run: cmd.run,
                    help: cmd.help,
                    name: cmd.name,
                    alt: cmd.alt,
                    usage: cmd.usage,
                    controll: cmd.controll,
                    embedColor: cmd.embedColor
                }
                cmd.alt.forEach((c) => codeBot.aliases.set(c, cmd.name))
                codeBot.commands.set(cmd.name, props)
                resolve(codeBot.commands.get(cmd.name))
            })
        }

        client.on("ready", () => {
            codeBot.contestChannel = client.channels.filter(e => codeBot.contestChannelID.includes(parseInt(e.id))).map((e) => e)
            codeBot.loadContests()
            schedule.scheduleJob('0 3 * * *', codeBot.loadContests())
        })

        client.on("message", (msg) => {
            if (msg.author.bot || codeBot.channelBlacklist.includes(msg.channel.id) || 
            (codeBot.channelWhitelist.length > 0 && !codeBot.channelWhitelist.includes(msg.channel.id))) return
            const message = msg.content.trim()
            const prefix = typeof codeBot.botPrefix == "object" ? (codeBot.botPrefix.has(msg.guild.id) ? codeBot.botPrefix.get(msg.guild.id).prefix : codeBot.defaultPrefix) : codeBot.botPrefix
            const command = message.substring(prefix.length).split(/[ \n]/)[0].trim()
            var args = message.slice(prefix.length + command.length).trim().split(/ +/g)
            const flags = Array()
            args = args.filter((value) => {
                if (value.startsWith('--')) flags.push(value.substring(2))
                else return value
            })
            const suffix = args.join(' ')

            if (message.startsWith(prefix) && msg.channel.type == "text") {
                let cmd = null
                if (codeBot.commands.has(command))
                    cmd = codeBot.commands.get(command)
                else if (codeBot.aliases.has(command))
                    cmd = codeBot.commands.get(codeBot.aliases.get(command))
                if (!cmd) return
                if (cmd.enabled) {
                    if (codeBot.cooldown.enabled && !codeBot.cooldown.exclude.includes(cmd.controll)) {
                        if (codeBot.spamControll.has(msg.author.id))
                            return msg.channel.send(codeBot.emote("fail", "Você precisa esperar antes de enviar outro comando."))
                        codeBot.spamControll.add(msg.author.id)
                        setTimeout(() => { codeBot.spamControll.delete(msg.author.id) }, codeBot.cooldown.timer)
                    }
                    msg.react(client.emoji.get('ok_hand'))
                    return codeBot[cmd.run](msg, suffix, args, cmd.run, flags)
                }
            }
        })

        codeBot.loadContests = async () => {
            try {
                if (!codeBot.contestChannel.length) throw('[CodeBot] Não foi possível encontrar o canal de texto para os contests')
                let contents = await codeBot.getApiEndPoint(codeBot.getUrl([ 'codeforces', 'contests', 'list' ]))
                contents = contents.result.filter(e => (!codeBot.aliasesContests.has(e.id))).filter(e => e.phase === "BEFORE").sort((a, b) => (a.startTimeSeconds - b.startTimeSeconds))
                contents.forEach(contest => {
                    codeBot.aliasesContests.set(contest, true)
                    const dateContest = new Date(contest.startTimeSeconds * 1000)
                    schedule.scheduleJob(`${dateContest.getMinutes()} ${dateContest.getHours() - 1} ${dateContest.getDay()} ${dateContest.getMonth()} *`, () => {
                        const dateNow = new Date()
                        const date = ((dateContest - (dateNow))/1000).toTime()
                        const content = `**[${contest.name}](${contest.websiteUrl? contest.websiteUrl : `https://codeforces.com/contests/${contest.id}`})** - em ${date}\n\
                        **Duração:** ${contest.durationSeconds.toTime()}\n\n`
                        const embed = new Discord.RichEmbed()
                        .setColor(codeBot.embedColor)
                        .setAuthor(client.user.username, client.user.avatarURL)
                        .setDescription(content)
                        codeBot.contestChannel.forEach(c => c.send(embed))
                    })
                })
            } catch (e) {
                client.logger.error(e)
            }
        }

        codeBot.getApiEndPoint = async (url) => {
            return new Promise((resolve, reject) => {
                request.get({
                    url: url,
                    json: true,
                    headers: {'User-Agent': 'request'}
                }, (err, res, data) => {
                    if (err) reject (err)
                    else if (res.statusCode != 200) reject(data)
                    else resolve(data)
                })
            })
        }

        /**
         * Core functions
         */
        codeBot.ContestsListFunction = async (msg, suffix, args, cmdRun, flags) => {
            try {
                const tmp = msg.channel.send(codeBot.emote('search', 'Buscando lista de contents no codeforces...'))
                const contents = await codeBot.getApiEndPoint(codeBot.getUrl([ 'codeforces', 'contests', 'list' ]))
                let content = ''
                const embed = new Discord.RichEmbed()
                .setColor(codeBot.ContestsList.embedColor)
                .setAuthor(client.user.username, client.user.avatarURL)
                .setDescription(`Lista dos próximos contests`)
                .setTimestamp()
                .setFooter(`${msg.author.username}`, msg.author.avatarURL)
                contents.result.filter(e => e.phase === "BEFORE")
                .sort((a, b) => (a.startTimeSeconds - b.startTimeSeconds))
                .forEach(contest => {
                    const dateContest = new Date(contest.startTimeSeconds * 1000)
                    const dateNow = new Date()
                    const date = ((dateContest - (dateNow))/1000).toTime()
                    content += `**[${contest.name}](${contest.websiteUrl? contest.websiteUrl : `https://codeforces.com/contests/${contest.id}`})** - em ${date}\n\
                    **Duração:** ${contest.durationSeconds.toTime()}\n\n`
                })
                embed.setDescription(content)
                msg.channel.send(embed).then(tmp.then(e => e.delete()))
            } catch(e) {
                msg.channel.send(codeBot.emote('fail', 'Não foi possível obter a lista de contests.'))
                return client.logger.error(e)
            }
        }

        codeBot.CodeforcesUserInfoFunction = async (msg, suffix, args, cmdRun, flags) => {
            try {
                const tmp = msg.channel.send(codeBot.emote('search', `Buscando ${suffix} no codeforces...`))
                const player = suffix.replace(/ /g, '')
                let user = await codeBot.getApiEndPoint(codeBot.getUrl([ 'codeforces', 'users', 'info' ], { 'handles': player }))
                user = user.result[0]
                let contests = await codeBot.getApiEndPoint(codeBot.getUrl([ 'codeforces', 'users', 'rating' ], { 'handle': player }))
                contests = contests.result.sort((a, b) => (b.contestId - a.contestId)).slice(0, 4)
                const embed = new Discord.RichEmbed()
                .setColor(codeBot.CodeforcesUserInfo.embedColor)
                .setAuthor(suffix, 'https:' + user.avatar)
                .setThumbnail('https:' + user.titlePhoto)
                .setTimestamp()
                .setDescription(`**${user.organization}**\n\
                **Ranting:** ${user.rank} - **${user.rating}**\n\
                **Max ranting**: ${user.maxRank} - **${user.maxRating}**`)
                .setFooter(`${msg.author.username}`, msg.author.avatarURL)
                if (contests.length) embed.addField('**Contests:**', 'Lista dos últimos 5 contests')
                contests.forEach(contest => {
                    embed.addField(`**${contest.rank}º** lugar: **__${contest.contestName}__**`, `Rating de **${contest.oldRating}** para **${contest.newRating}**. [__Ver contest!__](https://codeforces.com/contest/${contest.contestId})`)
                })
                msg.channel.send(embed).then(tmp.then(e => e.delete()))
            } catch(e) {
                msg.channel.send(codeBot.emote('fail', 'Não foi possível obter informações deste usuário.'))
                return client.logger.error(e)
            }
        }

        codeBot.addChannelContestInfoFunction = (msg, suffix, args, cmdRun, flags) => {
            if (args.length) {
                msg.channel.send(codeBot.emote('note', 'Canais adicionados!'))
            } else msg.channel.send(codeBot.emote('fail', 'Informa os IDs dos canais que deseja adicionar'))
        }

        codeBot.emote = (type, text) => {
            if (type === 'fail') {
                const embed = new Discord.RichEmbed()
                .setColor(0xFF0000)
                .setDescription(text.replace(/`/g, '`' + String.fromCharCode(8203)))
                return embed
            } else if (type === 'note') {
                const embed = new Discord.RichEmbed()
                .setColor(0x006dd3)
                .setDescription(text.replace(/`/g, '`' + String.fromCharCode(8203)))
                return embed
            } else if (type === 'search') {
                const embed = new Discord.RichEmbed()
                .setColor(0x13c100)
                .setDescription(text.replace(/`/g, '`' + String.fromCharCode(8203)))
                return embed
            } else {
                const embed = new Discord.RichEmbed()
                .setColor(codeBot.embedColor)
                .setDescription(text.replace(/`/g, '`' + String.fromCharCode(8203)))
                return embed
            }
        }

        codeBot.loadCommands = async () => {
            try {
                await codeBot.addCommand(codeBot.ContestsList)
                await codeBot.addCommand(codeBot.CodeforcesUserInfo)
                await codeBot.addCommand(codeBot.addChannelContestInfo)
            } catch (e) {
                return client.logger.error(e)
            }
        }

        codeBot.loadCommands()
    } catch (e) {
        return client.logger.error(e)
    }
}