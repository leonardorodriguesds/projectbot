const Discord = require('discord.js')
const schedule = require('node-schedule')

exports.start = (client, options) => {
    try {
        if (!client.mongo || !client.db) throw('[CORE] Não foi possível encontrar o link com o mongoDB.')

        class Core {
            constructor(client, options) {
                this.commands = new Map()
                this.aliases = new Map()
                this.client = client
                this.defaultPrefix = (options && options.defaultPrefix) || "-"
                this.botPrefix = (options && options.botPrefix) || "-"
                this.embedColor = (options && options.embedColor) || "0x006bd6"

                this.signUp = {
                    enabled: true,
                    run: "signUpFunction",
                    alt: [],
                    help: "Comando para cadastrar um usuário.",
                    name: "signup",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "signup"
                }
                if (options.signUp) this.signUp = Object.assign(this.signUp, options.signUp)

                this.userInfo = {
                    enabled: true,
                    run: "userInfoFunction",
                    alt: [],
                    help: "Comando para obter informações do seu cadastro.",
                    name: "userinfo",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "userinfo"
                }
                if (options.userInfo) this.userInfo = Object.assign(this.userInfo, options.userInfo)

                this.userLol = {
                    enabled: true,
                    run: "userLolFunction",
                    alt: [],
                    help: "Comando para obter informações da sua conta do lol.",
                    name: "userlol",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "userlol"
                }
                if (options.userLol) this.userLol = Object.assign(this.userLol, options.userLol)

                this.deleteUser = {
                    enabled: true,
                    run: "deleteUserFunction",
                    alt: [],
                    help: "Comando para deletar seu usuário.",
                    name: "deleteuser",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "deleteuser"
                }
                if (options.deleteUser) this.deleteUser = Object.assign(this.deleteUser, options.deleteUser)

                this.gameUser = {
                    enabled: true,
                    run: "gameUserFunction",
                    alt: [],
                    help: "Comando para obter informações do seu jogo.",
                    name: "gameuser",
                    usage: null,
                    embedColor: this.embedColor,
                    controll: "gameuser"
                }
                if (options.gameUser) this.gameUser = Object.assign(this.gameUser, options.gameUser)

                this.clearChat = {
                    enabled: true,
                    run: "clearChatFunction",
                    alt: [],
                    help: "Comando para limpar mensagens do chat.",
                    name: "clearchat",
                    usage: `Use ${this.botPrefix}${(options && options.clearChat && options.clearChat.name) || "clearchat"} N(0 <= n <= 99), ou ${this.botPrefix}${(options && options.clearChat && options.clearChat.name) || "clearchat"} para limpar tudo`,
                    embedColor: this.embedColor,
                    controll: "clearchat"
                }
                if (options.clearChat) this.clearChat = Object.assign(this.clearChat, options.clearChat)
                
                this.codeforcesUserInfo = {
                    enabled: true,
                    run: "codeforcesUserInfoFunction",
                    alt: [],
                    help: "Comando para limpar mensagens do chat.",
                    name: "mecodeforces",
                    usage: `Use ${this.botPrefix}${(options && options.codeforcesUserInfo && options.codeforcesUserInfo.name) || "codeforcesUserInfo"} N(0 <= n <= 99), ou ${this.botPrefix}${(options && options.codeforcesUserInfo && options.codeforcesUserInfo.name) || "codeforcesUserInfo"} para limpar tudo`,
                    embedColor: this.embedColor,
                    controll: "mecodeforces"
                }
                if (options.clearChat) this.clearChat = Object.assign(this.clearChat, options.clearChat)
                
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
                
                /**
                 * MongoDB
                 */
                this.usersCollection = client.db.collection('users')
            }

            isAdmin(member) {
                if (member.roles.find(r => r.name == this.djRole)) return true;
                if (this.ownerOverMember && member.id === this.botOwner) return true;
                if (this.botAdmins.includes(member.id)) return true;
                return member.hasPermission("ADMINISTRATOR");
            }
        }

        var coreBot = new Core(client, options)

        coreBot.addCommand = (cmd) => {
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
                cmd.alt.forEach((c) => coreBot.aliases.set(c, cmd.name))
                coreBot.commands.set(cmd.name, props)
                resolve(coreBot.commands.get(cmd.name))
            })
        }

        client.on('ready', () => {
            client.user.setActivity('type -help', { type: 'PLAYING' })
        })

        client.on("message", (msg) => {
            if (msg.author.bot || coreBot.channelBlacklist.includes(msg.channel.id) || 
            (coreBot.channelWhitelist.length > 0 && !coreBot.channelWhitelist.includes(msg.channel.id))) return
            const message = msg.content.trim()
            const prefix = typeof coreBot.botPrefix == "object" ? (coreBot.botPrefix.has(msg.guild.id) ? coreBot.botPrefix.get(msg.guild.id).prefix : coreBot.defaultPrefix) : coreBot.botPrefix
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
                if (coreBot.commands.has(command))
                    cmd = coreBot.commands.get(command)
                else if (coreBot.aliases.has(command))
                    cmd = coreBot.commands.get(coreBot.aliases.get(command))
                if (!cmd) return
                if (cmd.enabled) {
                    if (coreBot.cooldown.enabled && !coreBot.cooldown.exclude.includes(cmd.controll)) {
                        if (coreBot.spamControll.has(msg.author.id))
                            return msg.channel.send(coreBot.emote("fail", "Você precisa esperar antes de enviar outro comando."))
                        coreBot.spamControll.add(msg.author.id)
                        setTimeout(() => { coreBot.spamControll.delete(msg.author.id) }, coreBot.cooldown.timer)
                    }
                    msg.react(client.emoji.get('ok_hand'))
                    return coreBot[cmd.run](msg, suffix, args, cmd.run, flags)
                }
            }
        })

        /**
         * Core functions
         */
        coreBot.signUpFunction = async (msg, suffix, args, cmdRun, flags) => {
            try {
                msg.react(client.emoji.get('ok_hand'))
                coreBot.usersCollection.findOne({ userID: msg.author.id }).then(data => {
                    if (!data) {
                        var user = {
                            name: "",
                            lolNick: "",
                            unbR: "",
                            uriID: "",
                            codeforcesHandle: ""
                        }
                        const filter = m => !m.author.bot
                        msg.author.send('Vamos lá então...\nComece me dizendo seu nome completo\n(OBS.: Digite apenas o necessário)')
                        .then(m => m.channel.awaitMessages(filter, { max: 1, time: 300000 }))
                        .then(n => {
                            user.name = n.first().content
                            return n.first().channel.send(`Entendi, ${n.first().content}\nBeleza, diga-me seu nick no league of legends`)
                        })
                        .then(m => m.channel.awaitMessages(filter, { max: 1, time: 300000 }))
                        .then(async (n) => {
                            n.first().channel.send(`${n.first().content}, entendi...`)
                            user.lolNick = n.first().content
                            await client.riot.playerInfoFunction(n.first(), n.first().content, [], [])
                            return n.first().channel.send(`Estamos quase terminando...\nDiga-me agora sua matricula da UnB`)
                        })
                        .then(m => m.channel.awaitMessages(filter, { max: 1, time:  300000}))
                        .then(r => { 
                            user.unbR = r.first().content
                            return r.first().channel.send(`Ótimo, sua matricula ${r.first().content} foi salva\nDiga-me agora seu id no URI\n(Seu ID é aquele no final do link do seu perfil: 'judge/pt/profile/<ID>')`)
                        })
                        .then(m => m.channel.awaitMessages(filter, { max: 1, time:  300000}))
                        .then(u => { 
                            user.uriID = u.first().content
                            return u.first().channel.send(`Beleza, seu id no uri é ${u.first().content}\nPara finalizar, me diga sua handle no codeforces`)
                        })
                        .then(m => m.channel.awaitMessages(filter, { max: 1, time:  300000}))
                        .then(async (u) => { 
                            user.codeforcesHandle = u.first().content
                            u.first().channel.send(`${u.first().content}, entendi...`)
                            await client.code.CodeforcesUserInfoFunction(u.first(), u.first().content)
                            return u.first().channel.send(`Okay, tudo pronto, obrigado!`)
                        })
                        .then(() => 
                            coreBot.usersCollection.insertOne({ 
                                userID: msg.author.id,
                                nick: msg.author.username,
                                name: user.name,
                                lolNick: user.lolNick,
                                unbR: user.unbR,
                                uriID: user.uriID,
                                codeforcesHandle: user.codeforcesHandle
                            })
                        ).catch(console.log)
                    } else msg.reply(`você já está cadastrado${coreBot.userInfo.enabled? `\nUse ${coreBot.botPrefix}${coreBot.userInfo.name} para ver suas informações` : '.'}`)
                }).catch(e => client.logger.error(e))
            } catch(e) {
                client.logger.error(e)
            }
        }

        coreBot.userInfoFunction = (msg, suffix, args, cmdRun, flags) => {
            coreBot.usersCollection.findOne({ userID: msg.author.id }).then(data => {
                if (!data) return msg.reply(`você não está cadastrado${coreBot.signUp.enabled? `\nUser ${coreBot.botPrefix}${coreBot.signUp.name} para cadastrar-se.` : ''}`)
                msg.author.send(`Aqui vai as suas informações...\n`).then(async m => {
                    m.channel.send(`**Nome:** ${data.name}\n**Discord nick:** ${data.nick}\n**UnB Matricula:** ${data.unbR}\n**Nick league of legends:** ${data.lolNick}\n**ID URI:** ${data.uriID}\n**Handle codeforces:** ${data.codeforcesHandle}`)
                    client.riot.playerInfoFunction(m, data.lolNick)
                    client.code.CodeforcesUserInfoFunction(m, data.codeforcesHandle)
                })
            }).catch(e => client.logger.error(e))
        }

        coreBot.userLolFunction = (msg, suffix, args, cmdRun, flags) => {
            coreBot.usersCollection.findOne({ userID: msg.author.id }).then(data => {
                if (!data) return msg.reply(`você não está cadastrado.`)
                client.riot.playerInfoFunction(msg, data.lolNick)
            }).catch(e => client.logger.error(e))
        }

        coreBot.deleteUserFunction = (msg, suffix, args, cmdRun, flags) => {
            coreBot.usersCollection.findOne({ userID: msg.author.id }).then(data => {
                if (!data) msg.reply(`você não está cadastrado.`)
                coreBot.usersCollection.deleteOne({ userID: msg.author.id })
                .then(() => msg.reply(`seu cadastro foi deletado!`))
            }).catch(e => client.logger.error(e))
        }

        coreBot.gameUserFunction = (msg, suffix, args, cmdRun, flags) => {
            coreBot.usersCollection.findOne({ userID: msg.author.id }).then(data => {
                if (!data) msg.reply(`você não está cadastrado.`)
                client.riot.gameInfoFunction(msg, data.lolNick)
            }).catch(e => client.logger.error(e))
        }

        coreBot.codeforcesUserInfoFunction = (msg, suffix, args, cmdRun, flags) => {
            coreBot.usersCollection.findOne({ userID: msg.author.id }).then(data => {
                if (!data) msg.reply(`você não está cadastrado.`)
                client.code.CodeforcesUserInfoFunction(msg, data.codeforcesHandle)
            }).catch(e => client.logger.error(e))
        }

        coreBot.clearChatFunction = async (msg, suffix, args, cmdRun, flags) => {
            try {
                if (args.length) {
                    const x = args.length? parseInt(args[0]) + 1 : 100
                    if (x >= 100) {
                        var embed = new Discord.RichEmbed()
                        .setColor(coreBot.clearChat.embedColor)
                        .setDescription('Máximo de 99 mensagens')
                        msg.channel.send(embed).then(m => m.delete(10000))
                        return 
                    }
                    const clear = async () => {
                        msg.delete();
                        const fetched = await msg.channel.fetchMessages({limit: x});
                        msg.channel.bulkDelete(fetched);
                    }
                    await clear()
                } else
                    msg.channel.clone()
                    .then(c => c.setParent(msg.channel.parent))
                    .then(msg.channel.delete())
            } catch(e) {
                client.logger.error(e)
            }
        }

        coreBot.emote = (type, text) => {
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
                .setColor(coreBot.embedColor)
                .setDescription(text.replace(/`/g, '`' + String.fromCharCode(8203)))
                return embed
            }
        }

        coreBot.loadCommands = async () => {
            try {
                await coreBot.addCommand(coreBot.signUp)
                await coreBot.addCommand(coreBot.userInfo)
                await coreBot.addCommand(coreBot.userLol)
                await coreBot.addCommand(coreBot.deleteUser)
                await coreBot.addCommand(coreBot.gameUser)
                await coreBot.addCommand(coreBot.clearChat)
                await coreBot.addCommand(coreBot.codeforcesUserInfo)
            } catch (e) {
                client.logger.error(e)
            }
        }

        coreBot.loadCommands()
    } catch (e) {
        client.logger.error(e)
    }
}