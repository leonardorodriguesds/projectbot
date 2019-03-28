'use strict';
const Discord = require('discord.js')
const request = require('request')
const fs = require('fs')

Number.prototype.toTime = function () {
    var sec_num = parseInt(this, 10)
    var hours   = Math.floor(sec_num / 3600)
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60)
    var seconds = sec_num - (hours * 3600) - (minutes * 60)
    var result = hours > 0? hours + ' hora' + ((hours > 1)? 's ' : ' ') : ''
    result += (minutes > 0)? ((result != '')? 'e ' : '') + minutes + ' minuto' + ((minutes > 1)? 's ' : ' ') : ''
    result += (seconds > 0)? ((result != '')? 'e ' : '') + seconds + ' segundo' + ((seconds > 1)? 's' : '') : ''
    return result 
}

exports.start = (client, options) => {
    try {
        if (options.apiKey == undefined) {
            console.log('RiotBOT: Informe sua apiKey')
            return
        }

        class Chamption {
            constructor(data) {
                this.version        = data.version
                this.id             = data.id
                this.name           = data.name
                this.key            = data.key
                this.title          = data.title
                this.blurb          = data.blurb
                this.lore           = data.lore
                this.allytips       = data.allytips //Array
                this.enemytips      = data.enemytips //Aray
                /**
                 * skins: {
                 *      i : {
                 *          id: number,
                 *          num: number,
                 *          name: string,
                 *          chromas: boolean,
                 *      }
                 * }
                 */
                this.skins          = data.skins

                /**
                 * attackinfo: { 
                 * 'attack':Int, 
                 * 'defense':Int, 
                 * 'magic':Int, 
                 * 'difficulty':Int 
                 * }
                 */
                this.info           = data.info

                /**
                 * image: {
                 * 'full':string, 
                 * 'sprite':string, 
                 * 'group':string, 
                 * 'x':int, 
                 * 'y':int, 
                 * 'w':int, 
                 * 'h':int 
                 * }
                */
                this.image          = data.image
                this.tags           = data.tags
                this.partype        = data.partype
                /** 
                 * stats: { 
                 *  "hp": int,
                 *  "hpperlevel": int,
                 *  "mp": int,
                 *  "mpperlevel": int,
                 *  "movespeed": int,
                 *  "armor": int,
                 *  "armorperlevel": int,
                 *  "spellblock": int,
                 *  "spellblockperlevel": int,
                 *  "attackrange": int,
                 *  "hpregen": int,
                 *  "hpregenperlevel": int,
                 *  "mpregen": int,
                 *  "mpregenperlevel": int,
                 *  "crit": int,
                 *  "critperlevel": int,
                 *  "attackdamage": int,
                 *  "attackdamageperlevel": int,
                 *  "attackspeedoffset": int,
                 *  "attackspeedperlevel": int
                 * } */
                this.stats          = data.stats
                this.fullload       = false
                this.spells         = data.spells
                this.passive        = data.passive
                this.recommended    = data.recommended
            }
        }

        class Riot {
            constructor(client, options) {
                this.commands = new Map()
                this.aliases = new Map()
                this.client = client
                this.champtions = new Map()
                this.aliasesChamp = new Map()
                this.embedColor = (options && options.embedColor) || '0x151135'
                this.seasons = [
                    'PRESEASON 3', 'SEASON 3', 'PRESEASON 2014', 'SEASON 2014',
                    'PRESEASON 2015', 'SEASON 2015', 'PRESEASON 2016', 'SEASON 2016',
                    'PRESEASON 2017', 'SEASON 2017', 'PRESEASON 2018', 'SEASON 2018'
                ]
                this.role = {
                    'DUO': 'Duo',
                    'NONE': '',
                    'SOLO': 'Solo',
                    'DUO_CARRY': 'ADC',
                    'DUO_SUPPORT': 'Suporte'
                }
                this.apiVersion = '9.4.1'

                this.playerInfo = {
                    enabled: true,
                    run: "playerInfoFunction",
                    alt: [],
                    help: "Comando para obter informações de um player.",
                    name: "player",
                    usage: null,
                    embedColor: this.embedColor,
                    masked: "player"
                }
                if (options.playerInfo) this.playerInfo = Object.assign(this.playerInfo, options.playerInfo)

                this.gameInfo = {
                    enabled: true,
                    run: "gameInfoFunction",
                    alt: [],
                    help: "Comando para obter informações da partida de um player.",
                    name: "game",
                    usage: null,
                    embedColor: this.embedColor,
                    masked: "game"
                }
                if (options.gameInfo) this.gameInfo = Object.assign(this.gameInfo, options.gameInfo)

                this.champtionInfo = {
                    enabled: true,
                    run: "champtionInfoFunction",
                    alt: [],
                    help: "Comando para obter informações de um campeões.",
                    name: "chamption",
                    usage: null,
                    embedColor: this.embedColor,
                    masked: "chamption"
                }
                if (options.champtionInfo) this.champtionInfo = Object.assign(this.champtionInfo, options.champtionInfo)

                this.matchesInfo = {
                    enabled: true,
                    run: "matchesInfoFunction",
                    alt: [],
                    help: "Comando para obter informações do histórico de um player.",
                    name: "matches",
                    usage: null,
                    embedColor: this.embedColor,
                    masked: "matches"
                }
                if (options.matchesInfo) this.matchesInfo = Object.assign(this.matchesInfo, options.matchesInfo)

                this.apiKey = options.apiKey
                this.region = (options.region == undefined)? 'br' : options.region
                this.botPrefix = (options && options.botPrefix) || "-";
                this.defaultPrefix = (options && options.defaultPrefix) || "-"
                this.channelWhitelist = (options && options.channelWhitelist) || []
                this.channelBlacklist = (options && options.channelBlacklist) || []
                this.spamControll = new Set()
                this.logging = (options && typeof options.logging !== 'undefined' ? options && options.logging : true)

                this.cooldown = {
                    enabled: true,
                    timer: 2000,
                    exclude: []
                }
                if (options.cooldown) this.cooldown = Object.assign(this.cooldown, options.cooldown)

                this.ddragonEndPoints = {
                    'champions': {
                        'list': '/champion.json'
                    }
                }

                this.apiEndPoints = {
                    'summoners': {
                        'by-name': 'summoner/v4/summoners/by-name/'
                    },
                    'spectator': {
                        'active-game': 'spectator/v4/active-games/by-summoner/'
                    },
                    'league': {
                        'by-summoner': 'league/v4/positions/by-summoner/'
                    },
                    'matches': {
                        'by-account': 'match/v4/matchlists/by-account/',
                        'match': 'match/v4/matches/'
                    }
                }
                this.language = 'pt_BR'
            }

            getDdragonUrl(path, args = null, options = null) {
                if (path) {
                    const language = ((options && options.language)? options.language : this.language)
                    var url = `https://ddragon.leagueoflegends.com/cdn/${this.apiVersion}/data/${language}`
                    var tmpPath = this.ddragonEndPoints
                    while (path.length) {
                        if (path[0] in tmpPath) {
                            tmpPath = tmpPath[path[0]]
                            path.shift()
                            if (!path.length && typeof tmpPath === 'string') url += tmpPath
                        } else throw(`Não foi possível encontrar essa endpoint.\nPath: ${path.join('>')}`)
                    }
                    url += (args)? `&${Object.keys(args).map(e => e + '=' + args[e]).join('&')}` : ''
                    return url
                }
                return null
            }

            getUrl(path, userKey = null, args = null, options = null) {
                if (path) {
                    const region = ((options && options.region)? options.region : this.region) + '1'
                    var url = `https://${region}.api.riotgames.com/lol/`
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
                    url += (userKey? userKey : '') + `?api_key=${riotBot.apiKey}${args? `&${Object.keys(args).map(e => e + '=' + args[e]).join('&')}` : ''}`
                    return url
                }
                return null
            }

            isAdmin(member) {
                if (member.roles.find(r => r.name == this.djRole)) return true;
                if (this.ownerOverMember && member.id === this.botOwner) return true;
                if (this.botAdmins.includes(member.id)) return true;
                return member.hasPermission("ADMINISTRATOR");
            }

            getChamption(id) {
                if (this.aliasesChamp.has(id)) return this.champtions.get(this.aliasesChamp.get(id))
                else return null
            }

            getChamptionByName(name) {
                if (this.champtions.has(name)) return this.champtions.get(name)
                else return null
            }

            getChamptionName(id) {
                if (this.aliasesChamp.has(id)) return this.champtions.get(this.aliasesChamp.get(id)).name
                else return null
            }
        }

        var riotBot = new Riot(client, options);
        client.riot = riotBot

        client.on("ready", () => {
            riotBot.getChampions()
        })

        riotBot.addChamption = (name, obj) => {
            return new Promise((resolve) => {
                riotBot.champtions.set(name, new Chamption(obj))
                riotBot.aliasesChamp.set(parseInt(obj.key), name)
                resolve(obj)
            })  
        }

        riotBot.addCommand = (cmd) => {
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
                cmd.alt.forEach((c) => riotBot.aliases.set(c, cmd.name))
                riotBot.commands.set(cmd.name, props)
                resolve(riotBot.commands.get(cmd.name))
            })
        }

        client.on("message", (msg) => {
            if (msg.author.bot || riotBot.channelBlacklist.includes(msg.channel.id) || 
            (riotBot.channelWhitelist.length > 0 && !riotBot.channelWhitelist.includes(msg.channel.id))) return
            const message = msg.content.trim()
            const prefix = typeof riotBot.botPrefix == "object" ? (riotBot.botPrefix.has(msg.guild.id) ? riotBot.botPrefix.get(msg.guild.id).prefix : riotBot.defaultPrefix) : riotBot.botPrefix
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
                if (riotBot.commands.has(command))
                    cmd = riotBot.commands.get(command)
                else if (riotBot.aliases.has(command))
                    cmd = riotBot.commands.get(riotBot.aliases.get(command))
                if (!cmd) return
                if (cmd.enabled) {
                    if (riotBot.cooldown.enabled && !riotBot.cooldown.exclude.includes(cmd.controll)) {
                        if (riotBot.spamControll.has(msg.author.id))
                            return msg.channel.send(riotBot.emote("fail", "Você precisa esperar antes de enviar outro comando."))
                        riotBot.spamControll.add(msg.author.id)
                        setTimeout(() => { riotBot.spamControll.delete(msg.author.id) }, riotBot.cooldown.timer)
                    }
                    msg.react(client.emoji.get('ok_hand'))
                    return riotBot[cmd.run](msg, suffix, args, cmd.run, flags)
                }
            }
        })

        riotBot.getApiEndPoint = async (url) => {
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

        riotBot.getChampions = async () => {
            try {
                const champs = await riotBot.getApiEndPoint(riotBot.getDdragonUrl([ 'champions', 'list' ]))
                Object.keys(champs.data).forEach(async (key) => {
                    await riotBot.addChamption(key.toLowerCase(), champs.data[key])
                })
            } catch (e) {
                console.log(e)
            }
        }

        riotBot.printUser = async (msg, suffix, args, flags, user, league) => {
            if (user && league) {
                const player = suffix.replace(/ /g, '').toLowerCase()
                const icon = new Discord.Attachment(`./assets/images/profileicon/${user.profileIconId}.png`, 'profileicon.png')
                var embed = new Discord.RichEmbed()
                .setColor(riotBot.playerInfo.embedColor)
                .setDescription(`Nível ${user.summonerLevel}`)
                .addField("**op.gg**", `[${user.name}](https://br.op.gg/summoner/userName=${player})`, false)
                .setFooter(`Por ${msg.author.username}`, msg.author.displayAvatarURL)
                .setTimestamp()
                .setURL(`https://br.op.gg/summoner/userName=${player}`)
                .setThumbnail('attachment://profileicon.png')
                .setAuthor(user.name, `http://ddragon.leagueoflegends.com/cdn/${riotBot.apiVersion}/img/profileicon/${user.profileIconId}.png`)
                if (league && league.length != 0) {
                    const tier = {
                        'IRON': 1,
                        'BRONZE': 2,
                        'SILVER': 3,
                        'GOLD': 4,
                        'PLATINUM': 5,
                        'DIAMOND': 6,
                        'MASTER': 7,
                        'GRANDMASTER': 8, 
                        'CHALLENGER': 9
                    }
                    var maxTier = 1
                    embed.addField("**RANQUEADA:**", 'veja abaixo informações das ranqueadas', false)
                    league.forEach((e) => {
                        maxTier = (maxTier > tier[e.tier]? maxTier : tier[e.tier])
                        embed.addField(e.queueType == "RANKED_SOLO_5x5"? "**SoloQueue**" : e.queueType =="RANKED_FLEX_SR"? "**Flex**" : "**Desconhecido**", `**${e.tier} ${e.rank}** - ${e.leaguePoints} pontos\n**${e.wins}** vitórias e **${e.losses}** derrotas`, true)
                    })
                    const emblem = new Discord.Attachment(`./assets/images/emblems/Emblem_${maxTier}.png`, 'emblem.png')
                    embed.attachFile(emblem)
                    embed.setThumbnail('attachment://emblem.png')
                } else {
                    embed.addField("RANQUEADA:", 'Este jogador não possui estatísticas ranqueada', false)
                    embed.setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${riotBot.apiVersion}/img/profileicon/${user.profileIconId}.png`)
                }
                await msg.channel.send(embed).then(m => {
                    m.react('⏪').then(r => {
                        m.react('⏩')
                        let next = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏩' && user.id === msg.author.id, { time: 120000 });
                        let back = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏪' && user.id === msg.author.id, { time: 120000 });

                        next.on('collect', r => {
                            embed.setDescription('**Carregando histórico das ultimas 5 partidas...**')
                            m.edit(embed)
                        })
                    })
                })
            } else msg.channel.send('Não foi possível exibir informações deste player!')
        }

        riotBot.printGame = (msg, suffix, args, flags, user, game) => {
            if (user && game) {
                var embed = new Discord.RichEmbed()
                .setColor(riotBot.gameInfo.embedColor)
                .setAuthor(user.name, `http://ddragon.leagueoflegends.com/cdn/${riotBot.apiVersion}/img/profileicon/${user.profileIconId}.png`)
                .setDescription(`Nível ${user.summonerLevel}`)
                .setFooter(`Por ${msg.author.username}`, msg.author.displayAvatarURL)
                .setTimestamp()
                if (game) {
                    embed.addField('**PARTIDA AOVIVO**', `Jogando a **__${game.gameLength.toTime()}__**`)
                    embed.setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${riotBot.apiVersion}/img/map/map${game.mapId}.png`)
                    var playersBlue = new Array()
                    var playersRed = new Array()
                    if (game.participants) {
                        var bluetim = ''
                        var redtim = ''
                        game.participants.forEach((u) => {
                            if (u.teamId == 200) playersBlue.push(u)
                            else playersRed.push(u)
                        })
                        for(var i = 0; i < playersBlue.length; i++) {
                            bluetim += '**' + playersBlue[i].summonerName + '** - ' + riotBot.getChamptionName(playersBlue[i].championId) + '\n'
                            redtim += '**' + playersRed[i].summonerName + '** - ' + riotBot.getChamptionName(playersRed[i].championId) + '\n'
                        }
                        embed.addField('**Time azul**', bluetim, true)
                        embed.addField('**Time vermelho**', redtim, true)
                    }
                    if (game.bannedChampions && game.bannedChampions.length) {
                        var bansblue = ''
                        var bansred = ''
                        playersBlue = new Array()
                        playersRed = new Array()
                        game.bannedChampions.forEach((c) => {
                            if (c.teamId == 200) playersBlue.push(c)
                            else playersRed.push(c)
                        })
                        for(var i = 0; i < playersBlue.length; i++) {
                            if (playersBlue[i].championId != -1)
                                bansblue += '**' + riotBot.getChamption(playersBlue[i].championId).name + '** - ' + game.participants[playersBlue[i].pickTurn - 1].summonerName + '\n'
                            if (playersRed[i].championId != -1)
                                bansred += '**' + riotBot.getChamption(playersRed[i].championId).name + '** - ' + game.participants[playersRed[i].pickTurn - 1].summonerName + '\n'
                        }
                        embed.addField('**Bans time azul**', bansblue, true)
                        embed.addField('**Bans time vermelho**', bansred, true)
                    }
                } else {
                    embed.addField('Game', 'Não foi possível obter informações da partida desse jogador!')
                }
                msg.channel.send(embed)
            } else msg.channel.send('Não foi possível exibir informações do jogo deste player!')
        }

        riotBot.printMatches = async (msg, suffix, args, flags, user) => {
            try {
                if (!user || !user.id) throw('Player inválido')
                const matches = await riotBot.getApiEndPoint(riotBot.getUrl([ 'matches', 'by-account' ], user.accountId, { 'endIndex': 1 }))
                const embed = new Discord.RichEmbed()
                .setColor(riotBot.matchesInfo.embedColor)
                .setAuthor(user.name, `http://ddragon.leagueoflegends.com/cdn/${riotBot.apiVersion}/img/profileicon/${user.profileIconId}.png`)
                .setDescription('Informações da ultima partida')
                msg.channel.send(embed)
                for(let match of matches.matches) {
                    const game = await riotBot.getApiEndPoint(riotBot.getUrl([ 'matches', 'match' ], match.gameId, { 'endIndex': 10 }))
                    const champ = riotBot.getChamption(match.champion)
                    const blueTime = Array()
                    const redTime = Array()
                    let win = false
                    game.participantIdentities.forEach((summoner) => {
                        const player = game.participants[summoner.participantId - 1]
                        if (summoner.player.accountId == user.accountId) win = player.stats.win
                        const title = `**${summoner.player.summonerName}** - ${riotBot.getChamptionName(player.championId)}`
                        const content = `**${player.stats.kills}/${player.stats.deaths}/${player.stats.assists}::${player.stats.totalMinionsKilled}**. **Dano total:** ${player.stats.totalDamageDealtToChampions}.`
                        if (player.teamId == 100) blueTime.push([ title, content ])
                        else redTime.push([ title, content ])
                    })
                    const embed = new Discord.RichEmbed()
                    .setColor(riotBot.matchesInfo.embedColor)
                    .setAuthor(`${win? "VITÓRIA" : "DERROTA"}: ` + champ.name, `http://ddragon.leagueoflegends.com/cdn/${riotBot.apiVersion}/img/champion/${champ.id}.png`)
                    .setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${riotBot.apiVersion}/img/map/map${game.mapId}.png`)
                    .setDescription(`__${game.gameDuration.toTime()}__`)
                    for(var i = 0; i < blueTime.length; i++) {
                        embed.addField(blueTime[i][0], blueTime[i][1], true)
                        embed.addField(redTime[i][0], redTime[i][1], true)
                    }
                    msg.channel.send(embed)
                }
            } catch (e) {
                console.log(e)
            }
        }

        riotBot.playerInfoFunction = async (msg, suffix, args, flags) => {
            try {
                if (!suffix) return msg.channel.send(riotBot.emote('fail', 'Você não informou o nick do player!'));
                const player = suffix.replace(/ /g, '').toLowerCase()
                const tmp = msg.channel.send(riotBot.emote('search', `Buscando informações de ${suffix}...`))
                const user = await riotBot.getApiEndPoint(riotBot.getUrl([ 'summoners', 'by-name' ], player))
                const league = await riotBot.getApiEndPoint(riotBot.getUrl([ 'league', 'by-summoner' ], user.id))
                await riotBot.printUser(msg, suffix, args, flags, user, league)
                tmp.then(m => m.delete())
            } catch(e) {
                console.log(e)
                msg.channel.send(riotBot.emote('fail', 'Ocorreu um erro ao buscar esse jogador!'))
            }
        }

        riotBot.gameInfoFunction = async (msg, suffix, args, flags) => {
            try {
                const player = suffix.replace(' ', '')
                const tmp = msg.channel.send(riotBot.emote('search', `Buscando informações de ${suffix}...`))
                const user = await riotBot.getApiEndPoint(riotBot.getUrl([ 'summoners', 'by-name' ], player))
                const game = await riotBot.getApiEndPoint(riotBot.getUrl([ 'spectator', 'active-game' ], user.id))
                await riotBot.printGame(msg, suffix, args, flags, user, game)
                tmp.then(m => m.delete())
            } catch (e) {
                console.log(e)
                msg.channel.send(riotBot.emote('fail', 'Não foi possível obter informações da partida deste jogador!'))
            }
        }

        riotBot.champtionInfoFunction = (msg, suffix, args, flags) => {
            const champ = riotBot.getChamptionByName(suffix.toLowerCase())
            if (champ) {
                const embed = new Discord.RichEmbed()
                .setColor(riotBot.champtionInfo.embedColor)
                .setAuthor(champ.name + ' - ' + champ.title, `https://ddragon.leagueoflegends.com/cdn/9.4.1/img/champion/${champ.image.full}`)
                .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_0.jpg`)
                .setDescription(champ.blurb)
                .addField('**ATRIBUTOS**', `**Ataque:** ${champ.info.attack}. **Defesa:** ${champ.info.defense}. **Magic:** ${champ.info.magic}. **Dificuldade:** ${champ.info.difficulty}.`)
                .addField('**ATRIBUTOS INICIAIS:**', 'Atributos iniciais e ganhos por level')
                .addField('HP', `**${champ.stats.hp}**, +**${champ.stats.hpperlevel}** por level`, true)
                .addField('MP', `**${champ.stats.mp}**, +**${champ.stats.mpperlevel}** por level`, true)
                .addField('Armadura', `**${champ.stats.armor}**, +**${champ.stats.armorperlevel}** por level`, true)
                .addField('Spell block', `**${champ.stats.spellblock}**, +**${champ.stats.spellblockperlevel}** por level`, true)
                .addField('HP Regen', `**${champ.stats.hpregen}**, +**${champ.stats.hpregenperlevel}** por level`, true)
                .addField('MP Regen', `**${champ.stats.mpregen}**, +**${champ.stats.mpregenperlevel}** por level`, true)
                .addField('Chance de acerto crítico', `**${champ.stats.crit}**, +**${champ.stats.critperlevel}** por level`, true)
                .addField('Dano de ataque', `**${champ.stats.attackdamage}**, +**${champ.stats.attackdamageperlevel}** por level`, true)
                .addField('Velocidade de ataque', `**${champ.stats.attackspeed}**, +**${champ.stats.attackspeedperlevel}** por level`, true)
                .setFooter(`Por ${msg.author.username}. Página 1 de 4`, msg.author.displayAvatarURL)
                msg.channel.send(embed).then(m => {
                    m.react('⏪').then(r => {
                        var page = 1
                        m.react('⏩')
                        let next = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏩' && user.id === msg.author.id, { time: 120000 });
                        let back = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏪' && user.id === msg.author.id, { time: 120000 });

                        next.on('collect', () => {
                            if (page < 4) page += 1
                            if (page == 2) {
                                embed.setDescription('**Carregando habilidades deste personagem...**')
                            }
                            embed.setFooter(`Por ${msg.author.username}. Página ${page} de 4`, msg.author.displayAvatarURL)
                            m.edit(embed)
                        })
                        back.on('collect', () => {
                            page -= 1
                            if (page == 1) {
                                embed.setDescription(champ.blurb)
                            }
                            m.edit(embed)
                        })
                    })
                })
                return
            }
            msg.channel.send(riotBot.emote('fail', 'Campeão não encontrado!'))
        }

        riotBot.matchesInfoFunction = async (msg, suffix, args, flags) => {
            try {
                if (!suffix) return msg.channel.send(riotBot.emote('fail', 'Você não informou o nick do player!'));
                const player = suffix.replace(' ', '')
                const tmp = msg.channel.send(riotBot.emote('search', `Buscando informações de ${suffix}...`))
                const user = await riotBot.getApiEndPoint(riotBot.getUrl([ 'summoners', 'by-name' ], player))
                await riotBot.printMatches(msg, suffix, args, flags, user)
                tmp.then(m => m.delete())
            } catch(e) {
                console.log(e)
                msg.channel.send(riotBot.emote('fail', 'Ocorreu um erro ao buscar esse jogador!'))
            }
        }

        riotBot.emote = (type, text) => {
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
                .setColor(riotBot.embedColor)
                .setDescription(text.replace(/`/g, '`' + String.fromCharCode(8203)))
                return embed
            }
        }

        riotBot.loadCommands = async () => {
            try {
                await riotBot.addCommand(riotBot.playerInfo)
                await riotBot.addCommand(riotBot.gameInfo)
                await riotBot.addCommand(riotBot.champtionInfo)
                await riotBot.addCommand(riotBot.matchesInfo)
            } catch (e) {
                throw('Error on load commands')
                throw(e)
            }
        }
        
        riotBot.loadCommands();
    } catch(e) {
        console.log(e)
    }
}