const ytsr = require('ytsr')
const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
const Discord = require('discord.js')
const PACKAGE = require('./package.json')

Array.prototype.contains = function(element){
    return this.indexOf(element) > -1
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }
  
    return array;
}

toSeconds = (str) => {
    var p = str.split(':'), s = 0, m = 1;
    
    while (p.length > 0) {
        s += m * parseInt(p.pop(), 10);
        m *= 60;
    }
    
    return s;
}

exports.start = (client, options) => {
    try {
        if (process.version.slice(1).split('.')[0] < 8) {
            console.error(new Error(`[MusicBot] É necessário node v8+!`));
            process.exit(1);
        }

        class Music {
            constructor(client, options) {
                this.commands = new Map()
                this.aliases = new Map()
                this.queues = new Map()
                this.client = client
                this.defaultPrefix = (options && options.defaultPrefix) || "-"
                this.botPrefix = (options && options.botPrefix) || "-"
                this.embedColor = (options && options.embedColor) || "0x006bd6"
                this.musicEmbedColor = (options && options.musicEmbedColor) ||this.embedColor
                this.flagPrefix = (options && options.flagPrefix) || '--'
                this.queueHelper = new Map()
                this.queueLimit = (options && options.queueLimit) || 200
                this.songEmbed = null

                this.play = {
                    enabled: true,
                    run: "playFunction",
                    alt: [],
                    help: "Comando tocar uma música/playlist.",
                    name: "play",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "playsong"
                }
                if (options.play) this.play = Object.assign(this.play, options.play)

                this.searchMusic = {
                    enabled: true,
                    run: "searchMusicFunction",
                    alt: [],
                    help: "Comando pesquisar uma música.",
                    name: "search",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "searchmusic"
                }
                if (options.searchMusic) this.searchMusic = Object.assign(this.searchMusic, options.searchMusic)

                this.songPlaying = {
                    enabled: true,
                    run: "nowPlayingFunction",
                    alt: [],
                    help: "Comando para exibir informações da música atual.",
                    name: "song",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "songplaying"
                }
                if (options.songPlaying) this.songPlaying = Object.assign(this.songPlaying, options.songPlaying)

                this.skip = {
                    enabled: true,
                    run: "skipFunction",
                    alt: [],
                    help: "Comando para pular uma música.",
                    name: "skip",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "skipsong"
                }
                if (options.skip) this.skip = Object.assign(this.skip, options.skip)

                this.queueList = {
                    enabled: true,
                    run: "queueFunction",
                    alt: [],
                    help: "Comando para exibir a fila de músicas.",
                    name: "queue",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "queuelist"
                }
                if (options.queueList) this.queueList = Object.assign(this.queueList, options.queueList)

                this.shuffle = {
                    enabled: true,
                    run: "shuffleFunction",
                    alt: [],
                    help: "Comando para aleatorizar a fila.",
                    name: "shuffle",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "shufflequeue"
                }
                if (options.shuffle) this.shuffle = Object.assign(this.shuffle, options.shuffle)

                this.channelWhitelist = (options && options.channelWhitelist) || []
                this.channelBlacklist = (options && options.channelBlacklist) || []
                this.spamControll = new Set()
                this.logging = (options && options.logging)? options && options.logging : false

                this.cooldown = {
                    enabled: true,
                    timer: 1000,
                    exclude: []
                }
                if (options.cooldown) this.cooldown = Object.assign(this.cooldown, options.cooldown)

                this.volume = 100
                this.bitRate = (options && options.bitRate) || "120000"
                this.freeSkip = (options && options.freeSkip) || false
                this.botManagers = (options && options.botManagers) || []
            }

            queue(server) {
                if (!this.queueHelper.has(server))
                    this.queueHelper.set(server, { songs: new Array(), playing: false, loop: 'disable', index: 0, volume: this.volume, playing: false })
                return this.queueHelper.get(server)
            }

            isAdmin(member) {
                if (member.roles.find(r => r.name == this.djRole)) return true
                if (this.botManagers.includes(member.id)) return true
                return member.hasPermission("ADMINISTRATOR")
            }

            canSkip(member, queue) {
                const music = queue.songs[queue.index - 1]
                if (this.freeSkip) return true
                else if (this.botAdmins.includes(member.id)) return true
                else if (music && music.user.id === member.id) return true
                else if (this.isAdmin(member)) return true
                else return false
            }

            normalizeMusic(e, author) {
                return e = Object.assign({
                    author: {
                        verified: false
                    },
                    user: {
                        username: author.username,
                        displayAvatarURL: author.displayAvatarURL
                    }
                }, e)
            }
        }

        var djBot = new Music(client, options)

        djBot.addCommand = (cmd) => {
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
                cmd.alt.forEach((c) => djBot.aliases.set(c, cmd.name))
                djBot.commands.set(cmd.name, props)
                resolve(djBot.commands.get(cmd.name))
            })
        }

        client.on("message", (msg) => {
            if (msg.author.bot || djBot.channelBlacklist.includes(msg.channel.id) || 
            (djBot.channelWhitelist.length > 0 && !djBot.channelWhitelist.includes(msg.channel.id))) return
            const message = msg.content.trim()
            const prefix = typeof djBot.botPrefix == "object" ? (djBot.botPrefix.has(msg.guild.id) ? djBot.botPrefix.get(msg.guild.id).prefix : djBot.defaultPrefix) : djBot.botPrefix
            const command = message.substring(prefix.length).split(/[ \n]/)[0].trim()
            var args = message.slice(prefix.length + command.length).trim().split(/ +/g)
            const flags = new Object()
            let foundFlag = false
            let flagName = null
            args = args.filter((value, index) => {
                if (foundFlag && flagName && !value.startsWith(djBot.flagPrefix)) 
                    flags[flagName] = value, foundFlag = false, flagName = null
                else if (value.startsWith(djBot.flagPrefix)) {
                    if (foundFlag && flagName) flags[flagName] = true
                    if (index === args.length - 1) flags[value.substring(djBot.flagPrefix.length)] = true
                    else foundFlag = true, flagName = value.substring(djBot.flagPrefix.length)
                }
                else return value
            })
            const suffix = args.join(' ')

            if (message.startsWith(prefix) && msg.channel.type == "text") {
                let cmd = null
                if (djBot.commands.has(command))
                    cmd = djBot.commands.get(command)
                else if (djBot.aliases.has(command))
                    cmd = djBot.commands.get(djBot.aliases.get(command))
                if (!cmd) return
                if (cmd.enabled) {
                    if (djBot.cooldown.enabled && !djBot.cooldown.exclude.includes(cmd.controll)) {
                        if (djBot.spamControll.has(msg.author.id))
                            return msg.channel.send(djBot.emote("fail", "Você precisa esperar antes de enviar outro comando."))
                        djBot.spamControll.add(msg.author.id)
                        setTimeout(() => { djBot.spamControll.delete(msg.author.id) }, djBot.cooldown.timer)
                    }
                    msg.react(client.emoji.get('ok_hand'))
                    return djBot[cmd.run](msg, suffix, args, cmd.run, flags)
                }
            }
        })

        /**
         * CORE FUNCTIONS
         */

        djBot.joinVoiceChannel = (voiceChannel, server) => {
            return new Promise((resolve, reject) => {
                const channelConnection = client.voiceConnections.find(val => val.channel.guild.id == server)
                if (channelConnection === null) {
                    if (voiceChannel && voiceChannel.joinable)
                        voiceChannel.join().then(connection => resolve(connection))
                    else if (!voiceChannel.joinable || voiceChannel.full)
                        reject("Não tenho permissão para entrar nesse canal!")
                } else resolve(channelConnection)
            })
        }

        djBot.enqueueMusic = (msg, music, flags = null) => {
            if (!music) return msg.channel.send(djBot.emote('fail', 'Nenhuma música informada!'))

            const filter = Object.assign({
                first: false,
                start: true
            }, (flags)? flags : {}) //applying filters

            const queue = djBot.queue(msg.guild.id) // get queue for this channel

            if (queue.songs.length > djBot.queueLimit) 
                return msg.channel.send(djBot.emote('fail', 'Limite de músicas na fila excedido!'))

            if (filter.first) queue.songs.splice(queue.index, 0, music), queue.index--
            else if (Array.isArray(music)) 
                queue.songs = queue.songs.concat(music), msg.channel.send(djBot.emote('note', `${music.length} músicas adicionadas`))
            else queue.songs.push(music), msg.channel.send(djBot.emote('note', 'Música adicionada!'))

            if (filter.start && !queue.playing) djBot.startQueue(msg, msg.guild.id)
        }

        djBot.startQueue = async (msg, server) => {
            try {
                if (!server) return msg.channel.send(djBot.emote('fail', 'Não existe uma fila neste servidor!'))

                const queue = djBot.queue(server)
                if (!queue.songs.length) return msg.channel.send(djBot.emote('fail', 'Nenhuma música na fila!'))

                const connection = await djBot.joinVoiceChannel(msg.member.voiceChannel, server)
                connection.on('error', (err) => {
                    throw(err)
                })
                const music = queue.songs[queue.index++]
                const player = connection.playStream(ytdl(music.link, { filter : 'audioonly' }), {
                    bitrate: djBot.bitRate,
                    volume: (queue.volume / 100)
                })
                djBot.dispatcher = player
                player.on('error', (err) => {
                    throw(err)
                }).on('start', () => {
                    const icon = new Discord.Attachment(`./assets/images/icons/youtube-verified.png`, 'verified.png')
                    const embed = new Discord.RichEmbed()
                    .setColor(djBot.musicEmbedColor)
                    .setTimestamp()
                    .setFooter(music.user.username, music.user.displayAvatarURL)
                    .setThumbnail(music.thumbnail)
                    .setDescription(`**__[${music.title}](${music.link})__**`)
                    .setURL(music.link)
                    if (music.author.verified) embed.attachFile(icon), embed.setAuthor(`${music.author.name} - TOCANDO`, 'attachment://verified.png')
                    else embed.setAuthor(`${music.author.name} - TOCANDO`)

                    if (djBot.songEmbed) djBot.songEmbed.then((s) => s.delete())
                    djBot.songEmbed = msg.channel.send(embed)

                    client.user.setActivity(music.title, { type: 'LISTENING' })
                }).on('speaking', (speaking) => queue.playing = speaking).on('end', () => {
                    setTimeout(() => {
                        if ((queue.index >= queue.songs.length && queue.loop === 'queue'))
                            queue.index = 0
                        else if (queue.loop === 'song')
                            queue.index--
                        if (queue.index < queue.songs.length)
                            djBot.startQueue(msg, server)
                    }, 1250) // time to end connection
                })                
            } catch(e) {
                msg.channel.send(djBot.emote('fail', 'Desculpe! Ocorreu algum problema.'))
                console.log('[startQueue]')
                console.log(e)
            }
        }

        
        /**
         * Interface functions
         */
        djBot.playFunction = (msg, suffix, args, cmdRun, flags) => {
            const isYoutube = suffix.includes("youtube.com") || suffix.includes("youtu.be")
            const queue = djBot.queue(msg.guild.id) 

            if (isYoutube && suffix.includes("list=")) {
                const idPlaylist = (suffix.split("list=")[1]).split("&")[0]
                const musics = new Array()
                ytpl(idPlaylist, {
                    limit: djBot.queueLimit - queue.songs.length
                }, async (err, result) => {
                    if (err) {
                        console.log(`[${cmdRun}]`)
                        console.log(err)
                        return msg.channel.send(djBot.emote('fail', 'Não foi possível encontrar essa playlist'))
                    }
                    if (!result.items.length)
                        return msg.channel.send(djBot.emote('fail', 'Playlist não encontrada!'))
                    await result.items.forEach((song) => {
                        song = djBot.normalizeMusic(song, msg.author)
                        song.link = song.url_simple
                        musics.push(song)
                    })
                    return djBot.enqueueMusic({
                        channel: msg.channel,
                        guild: {
                            id: msg.guild.id
                        },
                        member: {
                            voiceChannel: msg.member.voiceChannel
                        }
                    }, musics)
                })
            } else {
                ytsr(suffix, { limit: 1 }, (err, result) => {
                    if (err) {
                        console.log(`[${cmdRun}]`)
                        console.log(err)
                        return msg.channel.send(djBot.emote('fail', 'Não foi possível encontrar essa música'))
                    }
                    if (!result.items.length)
                        return msg.channel.send(djBot.emote('fail', 'Nenhuma música encontrada!'))
                    return djBot.enqueueMusic({
                        channel: msg.channel,
                        guild: {
                            id: msg.guild.id
                        },
                        member: {
                            voiceChannel: msg.member.voiceChannel
                        }
                    }, djBot.normalizeMusic(result.items[0], msg.author))
                })
            }
        }

        djBot.searchMusicFunction = async (msg, suffix, args, cmdRun, flags) => {
            try {
                if (!suffix) {
                    msg.react(client.emoji.get('thumbsdown'))
                    return msg.channel.send(djBot.emote('fail', 'Nenhuma música informada!'))
                }
                const f = djBot.searchMusic // Function options
                const filter = {
                    limit: (flags.limit)? parseInt(flags.limit) : 5
                } // applying search filters
                const playFlags = {
                    first: (flags.first)? flags.first : false
                }

                ytsr(suffix, filter, (err, result) => {
                    if (err) throw(err)
                    result['items'].forEach((e) => {
                        e = djBot.normalizeMusic(e, msg.author)
                        const icon = new Discord.Attachment(`./assets/images/icons/youtube-verified.png`, 'verified.png')
                        const embed = new Discord.RichEmbed()
                        .setColor(f.embedColor)
                        .setTitle(e.title)
                        .setThumbnail(e.thumbnail)
                        .setDescription(`${e.description}\n**Duração:** ${e.duration}. **Visualizações:** ${e.views}. **Data:** ${e.uploaded_at}`)
                        .setURL(e.link)
                        .setTimestamp()
                        .setFooter(msg.author.username, msg.author.displayAvatarURL)

                        if (e.author.verified) embed.attachFile(icon), embed.setAuthor(e.author.name, 'attachment://verified.png')
                        else embed.setAuthor(e.author.name)

                        msg.channel.send(embed).then((m) => {
                            m.react('▶')
                            let play = m.createReactionCollector((reaction, user) => reaction.emoji.name === '▶' && user.id === msg.author.id, { time: 120000 });

                            play.on('collect', r => djBot.enqueueMusic({
                                channel: msg.channel,
                                guild: {
                                    id: msg.guild.id
                                },
                                member: {
                                    voiceChannel: msg.member.voiceChannel
                                }
                            }, e, playFlags))
                        })
                    })
                })
            } catch(e) {
                console.log(`[${cmdRun}]`)
                console.log(e)
            }
        }

        djBot.nowPlayingFunction  = (msg, suffix, args, cmdRun, flags) => {
            const queue = djBot.queue(msg.guild.id)
            if (!queue.playing) return msg.channel.send(djBot.emote('fail', 'Nenhuma música tocando!'))

            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
            if (voiceConnection === null) return msg.channel.send(djBot.note('fail', 'Nenhuma música tocando.'))

            const f = djBot.searchMusic // Function options
            const music = queue.songs[queue.index - 1]
            const icon = new Discord.Attachment(`./assets/images/icons/youtube-verified.png`, 'verified.png')
            const embed = new Discord.RichEmbed()
            .setColor(f.embedColor)
            .setTitle(music.title)
            .setThumbnail(music.thumbnail)
            .setDescription(`${music.description}\n**Duração:** ${music.duration}. **Visualizações:** ${music.views}. **Data:** ${music.uploaded_at}`)
            .setURL(music.link)
            .setTimestamp()
            .setFooter(music.user.username, music.user.displayAvatarURL)

            if (music.author.verified) embed.attachFile(icon), embed.setAuthor(`${music.author.name} - TOCANDO`, 'attachment://verified.png')
            else embed.setAuthor(`${music.author.name} - TOCANDO`)

            const dispatcher = voiceConnection.player.dispatcher
            if (dispatcher) {
                const progress = parseInt((dispatcher.time / 1000) / (toSeconds(music.duration) / 34))
                let text = '00:00 '
                for (let i = 0; i < 34; i++) text += i == progress? '◉' : '■'
                text += ' ' + music.duration
                embed.addField('**Progresso**', text)
            }
            
            msg.channel.send(embed)
        }

        djBot.skipFunction = (msg, suffix, args, cmdRun, flags) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
            if (voiceConnection === null) return msg.channel.send(djBot.note('fail', 'Nenhuma música para ser tocada.'))

            const queue = djBot.queue(msg.guild.id)
            if (!djBot.canSkip(msg.member, queue)) return msg.channel.send(djBot.note('fail', `Você não pode pular já que você não a colocou.`))

            queue.loop = 'disable'
            if (args.length) queue.index += parseInt(args[0]) - 1

            const dispatcher = voiceConnection.player.dispatcher
            if (!dispatcher || dispatcher === null) return msg.channel.send(djBot.note('fail', 'Desculpe! Ocorreu algum erro.'))
            if (voiceConnection.paused) dispatcher.end()
            dispatcher.end()
        }

        djBot.queueFunction = (msg, suffix, args, cmdRun, flags) => {
            if (!djBot.queueHelper.has(msg.guild.id))
                msg.channel.send(djBot.emote('fail', 'Nenhuma fila neste servidor!'))
            const queue = djBot.queue(msg.guild.id)
            if (!queue.songs.length) msg.channel.send(djBot.emote('fail', 'Nenhuma música na fila'))

            const pages = new Array()
            let controll = 0, i = 0, page = '', pageID = 0
            queue.songs.forEach((song, index) => {
                controll++
                const size = 58 - (queue.index - 1 === i? 4 : 0) - ((i + 1).toString().length)
                page += `${i+1}: ${queue.index - 1 === i? '> ' : ''}${song.title.length > 50? song.title.substring(0, size - 3) + '...' : song.title.padEnd(size)}${queue.index - 1 === i? ' <' : ''}\t${song.duration}\n`
                if (controll == 10 || queue.songs.length - 1 === index)
                    controll = 0, pages.push(page), page = ''
                i++
            })
            msg.channel.send('```Markdown\n' + pages[pageID] + `Página ${pageID + 1} de ${pages.length}\n` + '```').then(m => {
                m.react('⏪').then( r => {
                    m.react('⏩')
                    let nextPage = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏩' && user.id === msg.author.id, { time: 120000 })
                    let prevPage = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏪' && user.id === msg.author.id, { time: 120000 })

                    nextPage.on('collect', r => {
                        if (pageID === pages.length - 1) return
                        pageID++
                        m.edit('```Markdown\n' + pages[pageID] + `Página ${pageID + 1} de ${pages.length}\n` + '```')
                    })
                    prevPage.on('collect', r => {
                        if (pageID === 0) return
                        pageID--
                        m.edit('```Markdown\n' + pages[pageID] + `Página ${pageID + 1} de ${pages.length}\n` + '```')
                    })
                })
            })
        }

        djBot.shuffleFunction = (msg, suffix, args, cmdRun, flags) => {
            if (!djBot.queueHelper.has(msg.guild.id))
                msg.channel.send(djBot.emote('fail', 'Nenhuma fila neste servidor!'))
            const queue = djBot.queue(msg.guild.id)
            if (!queue.songs.length) msg.channel.send(djBot.emote('fail', 'Nenhuma música na fila'))

            queue.songs = shuffle(queue.songs)
        }

        djBot.emote = (type, text) => {
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
                .setColor(djBot.embedColor)
                .setDescription(text.replace(/`/g, '`' + String.fromCharCode(8203)))
                return embed
            }
        }

        djBot.loadCommands = async () => {
            try {
                await djBot.addCommand(djBot.searchMusic)
                await djBot.addCommand(djBot.songPlaying)
                await djBot.addCommand(djBot.skip)
                await djBot.addCommand(djBot.play)
                await djBot.addCommand(djBot.queueList)
                await djBot.addCommand(djBot.shuffle)
            } catch (e) {
                throw('Error on load commands')
                throw(e)
            }
        }

        djBot.loadCommands()
    } catch(e) {
        console.log(e)
    }
}