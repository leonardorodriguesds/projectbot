const ytsr = require('ytsr')
const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
const Discord = require('discord.js')

Array.prototype.contains = function(element){
    return this.indexOf(element) > -1
}

Array.prototype.shuffle = function(i = 0) {
    let b = this.slice(i, this.length)
    let a = this.slice(0, i)
    for (let i = 0; i < b.length; i++) {
        const j = Math.round(Math.random() * (i + 1))
        const tmp = b[j]
        b[j] = b[i]
        b[i] = tmp
    }
    return a.concat(b)
}
Array.prototype.unshuffle = function(i = 0) {
    let b = this.slice(i, this.length)
    let a = this.slice(0, i)
    return a.concat(b.sort((x, y) => x - y))
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
            console.error(new Error(`[djBot] É necessário node v8+!`));
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
                this.timeToExit = null
                this.playlistCollections = client.db.collection('playlists')
                this.musicsCollections = client.db.collection('musics')
                this.playlistHelperCollections = client.db.collection('playlistsHelper')
                this.broadcast = client.createVoiceBroadcast()

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

                this.leave = {
                    enabled: true,
                    run: "leaveFunction",
                    alt: [],
                    help: "Comando para forçar o bot a sair do canal de voz.",
                    name: "leave",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "leavechannel"
                }
                if (options.leave) this.leave = Object.assign(this.leave, options.leave)

                this.pause = {
                    enabled: true,
                    run: "pauseFunction",
                    alt: [],
                    help: "Comando para pausar uma música.",
                    name: "pause",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "pausemusic"
                }
                if (options.pause) this.pause = Object.assign(this.pause, options.pause)

                this.resume = {
                    enabled: true,
                    run: "resumeFunction",
                    alt: [],
                    help: "Comando para despausar uma música.",
                    name: "resume",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "resumemusic"
                }
                if (options.resume) this.resume = Object.assign(this.resume, options.resume)

                this.clear = {
                    enabled: true,
                    run: "clearFunction",
                    alt: [],
                    help: "Comando para limpar a fila de músicas.",
                    name: "clear",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "clearmusic"
                }
                if (options.clear) this.clear = Object.assign(this.clear, options.clear)

                this.loop = {
                    enabled: true,
                    run: "loopFunction",
                    alt: [],
                    help: "Comando para ativar o looping na fila.",
                    name: "loop",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "loopmusic"
                }
                if (options.loop) this.loop = Object.assign(this.loop, options.loop)

                this.volume = {
                    enabled: true,
                    run: "volumeFunction",
                    alt: [],
                    help: "Comando para alterar o volume da música.",
                    name: "volume",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "volumemusic"
                }
                if (options.volume) this.volume = Object.assign(this.loop, options.volume)

                this.unshuffle = {
                    enabled: true,
                    run: "unshuffleFunction",
                    alt: [],
                    help: "Comando para retomar a ordem original das músicas.",
                    name: "unshuffle",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "unshufflequeue"
                }
                if (options.unshuffle) this.unshuffle = Object.assign(this.unshuffle, options.unshuffle)

                this.addAdminBot = {
                    enabled: true,
                    run: "adminBotFunction",
                    alt: [],
                    help: "Comando para adicionar um administrador ao bot.",
                    name: "addadmin",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "addadminmusic"
                }
                if (options.addAdminBot) this.addAdminBot = Object.assign(this.addAdminBot, options.addAdminBot)

                this.createPlaylist = {
                    enabled: true,
                    run: "createPlaylistFunction",
                    alt: [],
                    help: "Comando para criar uma playlist.",
                    name: "addplaylist",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "createplaylist"
                }
                if (options.createPlaylist) this.createPlaylist = Object.assign(this.createPlaylist, options.createPlaylist)

                this.myPlaylists = {
                    enabled: true,
                    run: "myPlaylistslistFunction",
                    alt: [],
                    help: "Comando para listar suas playlists.",
                    name: "myplaylists",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "listmyplaylists"
                }
                if (options.myPlaylists) this.myPlaylists = Object.assign(this.myPlaylists, options.myPlaylists)

                this.deletePlaylist = {
                    enabled: true,
                    run: "deletePlaylistsFunction",
                    alt: [],
                    help: "Comando para deletar uma ou mais de suas playlists.",
                    name: "deleteplaylist",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "deleteplaylist"
                }
                if (options.deletePlaylist) this.deletePlaylist = Object.assign(this.deletePlaylist, options.deletePlaylist)

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
                this.leaveCmdFree = (options && options.leaveCmdFree) || false
                this.pauseControll = (options && options.pauseControll) || true
                this.clearControll = (options && options.clearControll) || true
                this.botAdmins = (options && options.botAdmins) || []
                this.freeCreatePlaylist = (options && options.freeCreatePlaylist) || true
            }

            queue(server) {
                if (!this.queueHelper.has(server))
                    this.queueHelper.set(server, { songs: new Array(), order: new Array(), playing: false, loop: 'disable', index: 0, volume: this.volume, playing: false })
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

            canCreatePlaylist(member) {
                if (this.freeCreatePlaylist) return true
                else if (this.botAdmins.includes(member.id)) return true
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
                    },
                    link: (e.link)? e.link : e.url_simple
                }, e)
            }

            destroyQueue(server) {
                return new Promise((resolve, reject) => {
                    if (!this.queueHelper.has(server)) reject(`nenhuma fila encontrada no servidor ${server}`);
                    this.queueHelper.set(server, { songs: new Array(), order: new Array(), playing: false, loop: 'disable', index: 0, volume: this.volume, playing: false })
                    resolve(this.queueHelper.get(server))
                });
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

        djBot.loadPlaylist = async (playlist, max = null) => {
            return new Promise((resolve, reject) => {
                ytpl(playlist, max? { limit: max } : {}, async (err, result) => {
                    if (err) reject(err)
                    if (!result.items.length) reject('Playlist não encontrada!')
                    resolve(result.items)
                })
            })
        }

        djBot.loadMusic = async (music, limit = 1) => {
            return new Promise((resolve, reject) => {
                ytsr.getFilters(music, function(err, filters) {
                    if (err) reject(err)
                    filter = filters.get('Type').find(o => o.name === 'Video')
                    const options = {
                        limit: limit,
                        nextpageRef: filter.ref
                    }
                    ytsr(null, options, (err, result) => {
                        if (err) reject(err)
                        if (!result.items.length) reject('Nenhuma música encontrada!')
                        resolve(result.items)
                    })
                })
            })
        }

        djBot.updatePresence = async (queue, options = null) => {
            return new Promise((resolve, reject) => {
                if (!queue) reject('Argumentos inválidos')
                if (options && options.clear) 
                    resolve(client.user.setPresence({ game: { name: null }, status: 'online' }))
                else {
                    const music = queue.songs[queue.index - 1]
                    const opt = Object.assign({
                        game: {
                            name: `🎵 | ${music.title}`,
                            url: music.link,
                            type: 'LISTENING'
                        },
                        afk: false,
                        status: "idle"
                    }, (options && options.presence)? options.presence : {})
                    client.user.setPresence(opt).catch((res) => {
                        console.error("Não foi possível editar a presença do BOT\n" + res)
                        client.user.setPresence({ game: { name: null}, status: 'online' })
                        resolve(client.user.presence)
                    }).then((res) => resolve(res))
                }
            })
        }

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

            if (Array.isArray(music)) {
                const queueLength = queue.songs.length
                const ai = Array.from({ length: music.length }, (v, k) => k + queueLength)
                queue.songs = queue.songs.concat(music)
                if (filter.first) queue.order.splice(queue.index, 0, ...ai)
                else queue.order = queue.order.concat(ai)
                msg.channel.send(djBot.emote('note', `${music.length} músicas adicionadas`))
            } else {
                const i = (queue.songs.push(music) - 1)
                if (filter.first) queue.order.splice(queue.index, 0, i)
                else queue.order.push(i)
                msg.channel.send(djBot.emote('note', `**${music.title}** adicionada!`))
            }
            
            if (filter.start && !queue.playing) djBot.startQueue(msg, msg.guild.id)
        }

        djBot.startQueue = async (msg, server) => {
            try {
                if (!server) return msg.channel.send(djBot.emote('fail', 'Não existe uma fila neste servidor!'))

                const queue = djBot.queue(server)
                if (!queue.songs.length || !queue.order.length)
                    return msg.channel.send(djBot.emote('fail', 'Nenhuma música para tocar!'))
                if (queue.index >= queue.order.length) {
                    djBot.updatePresence(queue, { clear: true })
                    djBot.timeToExit = setTimeout(() => {https://www.youtube.com/watch?v=iI34LYmJ1Fs&list=PLw-VjHDlEOgsIgak3vJ7mrcy-OscZ6OAs
                        msg.channel.send(djBot.emote('note', 'Deixou o canal de voz por inatividade!'))
                        const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
                        if (voiceConnection !== null) return voiceConnection.disconnect()
                    }, 5 * 60 * 1000) // 5 min
                    return
                }
                
                const connection = await djBot.joinVoiceChannel(msg.member.voiceChannel, server)
                connection.on('error', (err) => {
                    throw(err)
                })
                const music = queue.songs[queue.order[queue.index++]]
                const player = connection.playStream(ytdl(music.link, { filter : 'audioonly' }), {
                    bitrate: djBot.bitRate,
                    volume: (queue.volume / 100)
                })
                player.on('error', (err) => {
                    throw(err)
                }).on('start', () => {
                    if (djBot.timeToExit) clearTimeout(djBot.timeToExit)
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
                    djBot.updatePresence(queue)
                }).on('speaking', (speaking) => queue.playing = speaking).on('end', () => {
                    setTimeout(() => {
                        if ((queue.index >= queue.order.length && queue.loop === 'queue'))
                            queue.index = 0
                        else if (queue.loop === 'song')
                            queue.index--
                        djBot.startQueue(msg, server)
                    }, 1250) // time to end connection
                })    
            } catch(e) {
                msg.channel.send(djBot.emote('fail', 'Desculpe! Ocorreu algum problema.'))
                client.logger.error(e)
            }
        }

        
        /**
         * Interface functions
         */
        djBot.playFunction = async (msg, suffix, args, cmdRun, flags) => {
            try {
                if (!msg.member.voiceChannel) return msg.channel.send(djBot.emote('fail', 'Você não está em um canal de voz!'))
                if (!suffix) return msg.channel.send(djBot.emote('fail', 'Você não informou nenhuma música!')) 
                const isYoutube = suffix.includes("youtube.com") || suffix.includes("youtu.be")
                const queue = djBot.queue(msg.guild.id) 
                const playFlags = {
                    first: (flags.first)? flags.first : false
                }
                if (isYoutube && suffix.includes("list=")) {
                    const idPlaylist = (suffix.split("list=")[1]).split("&")[0]
                    let musics = await djBot.loadPlaylist(idPlaylist, djBot.queueLimit - queue.songs.length)
                    musics = musics.map((music) => djBot.normalizeMusic(music, msg.author))
                    return djBot.enqueueMusic({
                        channel: msg.channel,
                        guild: {
                            id: msg.guild.id
                        },
                        member: {
                            voiceChannel: msg.member.voiceChannel
                        }
                    }, musics, playFlags)
                } else {
                    let music = await djBot.loadMusic(suffix)
                    music = djBot.normalizeMusic(music[0], msg.author)
                    return djBot.enqueueMusic({
                        channel: msg.channel,
                        guild: {
                            id: msg.guild.id
                        },
                        member: {
                            voiceChannel: msg.member.voiceChannel
                        }
                    }, music, playFlags)
                }
            } catch (e) {
                client.logger.error(e)
            }
        }

        djBot.searchMusicFunction = async (msg, suffix, args, cmdRun, flags) => {
            try {
                if (!msg.member.voiceChannel) return msg.channel.send(djBot.emote('fail', 'Você não está em um canal de voz!'))
                if (!suffix) {
                    msg.react(client.emoji.get('thumbsdown'))
                    return msg.channel.send(djBot.emote('fail', 'Nenhuma música informada!'))
                }
                const f = djBot.searchMusic // Function options
                const options = {
                    limit: (flags.limit)? parseInt(flags.limit) : 3
                } // applying search filters
                const playFlags = {
                    first: (flags.first)? flags.first : false
                }
                let musics = await djBot.loadMusic(suffix, (flags.limit)? parseInt(flags.limit) : 3)
                musics.forEach((e) => {
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
            } catch(e) {
                client.logger.error(e)
            }
        }

        djBot.nowPlayingFunction  = (msg, suffix, args, cmdRun, flags) => {
            const queue = djBot.queue(msg.guild.id)
            if (!queue.playing) return msg.channel.send(djBot.emote('fail', 'Nenhuma música tocando!'))

            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
            if (voiceConnection === null) return msg.channel.send(djBot.note('fail', 'Nenhuma música tocando.'))

            const f = djBot.searchMusic // Function options
            const music = queue.songs[queue.order[queue.index - 1]]
            const description = `${music.description? `${music.description} \n` : ''}${music.duration? `**Duração:** ${music.duration}. `: ''}${music.views? `**Visualizações:** ${music.views}. ` : ''}${music.uploaded_at? `**Data:** ${music.uploaded_at}` : ''}`
            const icon = new Discord.Attachment(`./assets/images/icons/youtube-verified.png`, 'verified.png')
            const embed = new Discord.RichEmbed()
            .setColor(f.embedColor)
            .setTitle(music.title)
            .setThumbnail(music.thumbnail)
            .setDescription(description)
            .setURL(music.link)
            .setTimestamp()
            .setFooter(music.user.username, music.user.displayAvatarURL)

            if (music.author.verified) embed.attachFile(icon), embed.setAuthor(`${music.author.name} - TOCANDO`, 'attachment://verified.png')
            else embed.setAuthor(`${music.author.name} - TOCANDO`)

            const dispatcher = voiceConnection.player.dispatcher
            if (dispatcher) {
                const progress = parseInt((dispatcher.time / 1000) / (toSeconds(music.duration) / 34))
                let text = '00:00 '
                for (let i = 0; i < 34; i++) text += i === progress? '◉' : '■'
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
                return msg.channel.send(djBot.emote('fail', 'Nenhuma fila neste servidor!'))
            const queue = djBot.queue(msg.guild.id)
            if (!queue.songs.length || !queue.order.length) 
                return msg.channel.send(djBot.emote('fail', 'Nenhuma música na fila'))

            const pages = new Array()
            let controll = 0, i = 0, page = '', pageID = 0
            queue.order.forEach((i, index) => {
                controll++
                const song = queue.songs[i]
                const actual = queue.index - 1 === i
                const size = 58 - (actual? 4 : 0) - ((i + 1).toString().length)
                page += `${index + 1}: ${actual? '> ' : ''}${song.title.length > 50? song.title.substring(0, size - 3) + '...' : song.title.padEnd(size)}${actual? ' <' : ''}\t${song.duration}\n`
                // pageID = (actual)? pages.length : pageID
                if (controll == 10 || queue.order.length - 1 === index)
                    controll = 0, pages.push(page), page = ''
                i++
            })
            msg.channel.send('```\n' + pages[pageID] + `Página ${pageID + 1} de ${pages.length}\n` + '```').then(m => {
                m.react('⏪').then( r => {
                    m.react('⏩')
                    let nextPage = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏩' && user.id === msg.author.id, { time: 120000 })
                    let prevPage = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏪' && user.id === msg.author.id, { time: 120000 })

                    nextPage.on('collect', r => {
                        if (pageID === pages.length - 1) return
                        pageID++
                        m.edit('```\n' + pages[pageID] + `Página ${pageID + 1} de ${pages.length}\n` + '```')
                    })
                    prevPage.on('collect', r => {
                        if (pageID === 0) return
                        pageID--
                        m.edit('```\n' + pages[pageID] + `Página ${pageID + 1} de ${pages.length}\n` + '```')
                    })
                })
            })
        }

        djBot.shuffleFunction = (msg, suffix, args, cmdRun, flags) => {
            if (!djBot.queueHelper.has(msg.guild.id))
                return msg.channel.send(djBot.emote('fail', 'Nenhuma fila neste servidor!'))
            const queue = djBot.queue(msg.guild.id)
            if (!queue.songs.length || !queue.order.length)
                return msg.channel.send(djBot.emote('fail', 'Nenhuma música na fila'))

            queue.order = queue.order.shuffle(queue.index)
        }

        djBot.unshuffleFunction = (msg, suffix, args, cmdRun, flags) => {
            if (!djBot.queueHelper.has(msg.guild.id))
                return msg.channel.send(djBot.emote('fail', 'Nenhuma fila neste servidor!'))
            const queue = djBot.queue(msg.guild.id)
            if (!queue.songs.length || !queue.order.length) 
                return msg.channel.send(djBot.emote('fail', 'Nenhuma música na fila'))

            queue.order = queue.order.unshuffle(queue.index)
        }

        djBot.leaveFunction = (msg, suffix, args, cmdRun, flags) => {
            try {
                djBot.updatePresence({}, { clear: true })
                if (djBot.isAdmin(msg.member) || djBot.leaveCmdFree === true) {
                    const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                    if (voiceConnection === null)
                        return msg.channel.send(djBot.emote('fail', 'Não estou em um canal de voz!'))
                    djBot.destroyQueue(msg.guild.id)
                    if (djBot.songEmbed) djBot.songEmbed.then((s) => s.delete()), djBot.songEmbed = null
                    
                    if (!voiceConnection.player.dispatcher) return
                    voiceConnection.player.dispatcher.end()
                    voiceConnection.disconnect()
                    msg.channel.send(djBot.emote('note', 'Deixou o canal de voz!'))
                } else msg.channel.send(djBot.emote('fail', 'Você não pode me expulsar!'))
            } catch (e) {
                client.logger.error(e)
            }
        }

        djBot.pauseFunction = (msg, suffix, args, cmdRun, flags) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
            if (voiceConnection === null) 
                return msg.channel.send(djBot.emote('fail', 'Nenhuma música tocando.'))
            if (!djBot.isAdmin(msg.member) && !djBot.pauseControll)
                return msg.channel.send(djBot.emote('fail', 'Você não pode pausar filas.'))

            const dispatcher = voiceConnection.player.dispatcher
            if (dispatcher.paused) return msg.channel.send(djBot.emote(`fail`, `A música já está pausada!`))
            else dispatcher.pause()
        }

        djBot.resumeFunction = (msg, suffix, args, cmdRun, flags) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
            if (voiceConnection === null) 
                return msg.channel.send(djBot.emote('fail', 'Nenhuma música tocando.'))
            if (!djBot.isAdmin(msg.member) && !djBot.pauseControll)
                return msg.channel.send(djBot.emote('fail', 'Você não pode despausar filas.'))

            const dispatcher = voiceConnection.player.dispatcher
            if (!dispatcher.paused) return msg.channel.send(djBot.emote(`fail`, `A música já está tocando!`))
            else dispatcher.resume()
        }

        djBot.clearFunction = (msg, suffix, args, cmdRun, flags) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
            if (voiceConnection === null) 
                return msg.channel.send(djBot.emote('fail', 'Nenhuma música tocando.'))
            if (!djBot.isAdmin(msg.member) && !djBot.clearControll)
                return msg.channel.send(djBot.emote('fail', 'Você não pode limpar filas.'))
            djBot.destroyQueue(msg.guild.id)
            if (djBot.songEmbed) djBot.songEmbed.then((s) => s.delete()), djBot.songEmbed = null
                
            if (!voiceConnection.player.dispatcher) return
            voiceConnection.player.dispatcher.end()
        }

        djBot.loopFunction = (msg, suffix, args, cmdRun, flags) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
            if (voiceConnection === null) return msg.channel.send(djBot.emote('fail', 'Nenhuma música tocando.'))
            const queue = djBot.queue(msg.guild.id)
            if (queue.loop == 'song') {
                queue.loop = 'queue'
                return msg.channel.send(djBot.emote('note', 'Loop na fila ativado!'))
            } else if (queue.loop == 'queue') {
                queue.loop = 'disable'
                return msg.channel.send(djBot.emote('note', 'Loop desativado!'))
            } else {
                queue.loop = 'song'
                return msg.channel.send(djBot.emote('note', 'Loop na música ativado!'))
            }
        }

        djBot.volumeFunction = (msg, suffix, args, cmdRun, flags) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id)
            if (voiceConnection === null) return msg.channel.send(djBot.emote('fail', 'Nenhuma música tocando.'))
            if (args.length == 0) return msg.channel.send(djBot.emote('error', 'Você precisa informar um volume!'))
            const queue = djBot.queue(msg.guild.id)
            const volume = parseInt(args[0])
            if (volume < 0 || volume > 200) return msg.channel.send(djBot.emote('error', 'O volume precisa estar entre 0 e 200!'))
            queue.volume = volume
            msg.channel.send(djBot.emote('note', `Volume alterado para ${volume}`))
        }

        djBot.adminBotFunction = (msg, suffix, args, cmdRun, flags) => {
            if (!djBot.isAdmin(msg.member)) return msg.channel.send(djBot.emote('fail', 'Você não tem autorização para isso.'))
            const flag = false
            client.users.forEach((u) => {
                if (u.username === suffix) {
                    flag = true
                    djBot.botAdmins.push(u.id)
                    return msg.channel.send(djBot.emote('note', `${u.username} adicionado como admin!`))
                }
            })
            if (!flag) return msg.channel.send(djBot.emote('fail', `${u.username} não encontrado!`))
        }

        djBot.createPlaylistFunction = async (msg, suffix, args, cmdRun, flags) => {
            if (!djBot.canCreatePlaylist(msg.member)) return msg.channel.send(djBot.emote('fail', 'Você não tem autorização para criar uma playlist.'))

            const filter = m => !m.author.bot
            const playlist = {
                name: '',
                public: false,
                id: -1
            }
            const musics = new Array()

            const readInput = m => m.channel.awaitMessages(filter, { max: 1, time: 300000 })

            const normalizeInput = m => {
                let input = m.first()
                input.react(client.emoji.get('ok_hand'))
                return input
            }

            const name = () => 
                msg.author.send('Comece me dizendo um nome para esta playlist')
                .then(readInput).then(normalizeInput).then(confirmName)

            const confirmName = r => {
                playlist.name = r.content
                return djBot.playlistCollections.findOne({ userID: msg.author.id, name: playlist.name })
                .then((p) => {
                    if (p)
                        return r.channel.send('Você já possui uma playlist com este nome\nTente outro nome')
                        .then(readInput).then(normalizeInput).then(confirmName)
                    else 
                        return r.channel.send(`**${playlist.name}** é um bom nome\nMe diga, essa playlist é pública?`)
                        .then(readInput).then(normalizeInput).then(public)
                })
            }

            const public = r => {
                const result = r.content.trim().toLowerCase()
                playlist.public = (result === 'y' || result === 'yes' || result === 'sim' || result === 'ok')
                return r.channel.send(`Ok, a sua playlist é **${playlist.public? 'pública' : 'privada'}**`)
                .then(createPlaylist)
            }

            const createPlaylist = async r => {
                return djBot.playlistCollections.insertOne({ 
                    name: playlist.name,
                    public: playlist.public,
                    userID: msg.author.id
                }).then((p) => {
                    playlist.id = p.ops[0]._id
                    return r.channel.send(`Playlist **criada**... Agora precisamos inserir músicas nela`)
                    .then(insertMusicHelper)
                })
            }

            const insertMusicHelper = async m => 
                m.channel.send(`Insire um **link/nome** de uma playlist/música do **youtube**\n(Use **.** para finalizar)`)
                .then(readInput).then(normalizeInput).then(insertMusic)
            

            const insertMusic = async r => {
                const music = r.content
                if (!music || music === '.') return r.channel.send(`Ok... terminamos de configurar a sua playlist.`)
                    .then(finalizePlaylist)
                const isYoutube = music.includes("youtube.com") || music.includes("youtu.be")

                if (isYoutube && music.includes('&list')) {
                    const idPlaylist = (suffix.split("list=")[1]).split("&")[0]
                    let songs = await djBot.loadPlaylist(idPlaylist)
                    if (!songs.length) 
                        return r.channel.send(`Ocorreu algum problema ao inserir essa playlist, tente outra`).then(insertMusicHelper)

                    songs.map((s) => {
                        return {
                            title: s.title,
                            link: s.url_simple
                        }
                    })
                    musics = musics.concat(songs)

                    return r.channel.send(`**${songs.length}** músicas inseridas em sua playlist.`).then(insertMusicHelper)
                } else {
                    let song = await djBot.loadMusic(music)
                    if (!song.length)
                        return r.channel.send(`Ocorreu algum problema ao inserir essa música, tente outra`).then(insertMusicHelper)
                    
                    song = song[0]
                    musics.push({
                        title: song.title,
                        link: song.link
                    })

                    return r.channel.send(`**${song.title}** inserido`).then(insertMusicHelper)
                }
            }

            const finalizePlaylist = async r => {
                try {
                    musics.forEach((m) => {
                        djBot.musicsCollections.findOneAndUpdate({ link: m.link }, {
                            $set: { name: m.title, link: m.link}
                        }).then((m) => {
                            djBot.playlistHelperCollections.findOneAndUpdate({ playlistID: playlist.id, musicID: m.value._id },
                                { $set: { playlistID: playlist.id, musicID: m.value._id } }, { upsert: true }, (err, result) => {
                                if (err) {
                                    r.channel.send(`Não foi possível inserir **${m.title}** em sua playlist.`)
                                    console.log(err)
                                }
                            })
                        })
                    })
                    r.channel.send(`A sua playlist(**${playlist.name}**) está pronta!`)
                } catch (e) {
                    client.logger.error(e)
                }
            }

            msg.author.send('Você quer criar uma playlist? Ok, vamos lá...').then(name).catch(console.log)
        }

        djBot.myPlaylistslistFunction = (msg, suffix, args, cmdRun, flags) => {
            if (!suffix) {
                djBot.playlistCollections.find({ userID: msg.author.id }).toArray((err, result) => {
                    if (err) return msg.channel.send(djBot.emote('fail', 'Ocorreu um erro ao tentar listar suas playlists.'))
                    if (result.length) {
                        let aux = ''
                        result.forEach(async (p) => aux += `**${p.name}** :: ${p.public? 'Pública' : 'Privada'}\n`)
                        return msg.channel.send(aux)
                    } else return msg.channel.send(djBot.emote('fail', 'Você não possui nenhuma playlist!'))
                })
            }
        }

        djBot.deletePlaylistsFunction = async (msg, suffix, args, cmdRun, flags) => {
            if (!suffix) {
                djBot.playlistCollections.deleteMany({ userID: msg.author.id }, (err, result) => {
                    if (err) { 
                        msg.channel.send(djBot.emote('fail', 'Ocorreu um erro ao deletar suas playlists'))
                        return
                    }
                    return msg.channel.send(djBot.emote('note', 'Suas playlists foram deletadas!'))
                })
            }
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
                await djBot.addCommand(djBot.leave)
                await djBot.addCommand(djBot.pause)
                await djBot.addCommand(djBot.resume)
                await djBot.addCommand(djBot.clear)
                await djBot.addCommand(djBot.unshuffle)
                await djBot.addCommand(djBot.addAdminBot)
                await djBot.addCommand(djBot.createPlaylist)
                await djBot.addCommand(djBot.myPlaylists)
                await djBot.addCommand(djBot.deletePlaylist)
                await djBot.addCommand(djBot.loop)
                await djBot.addCommand(djBot.volume)
            } catch (e) {
                client.logger.error(e)
            }
        }

        djBot.loadCommands()
    } catch(e) {
        client.logger.error(e)
    }
}