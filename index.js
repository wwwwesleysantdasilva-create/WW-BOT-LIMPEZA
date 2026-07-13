require('dotenv').config(); 

const { 
    Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, 
    ButtonBuilder, ButtonStyle, PermissionFlagsBits, ContainerBuilder, 
    TextDisplayBuilder, SeparatorBuilder, MessageFlags, ModalBuilder, 
    TextInputBuilder, TextInputStyle, EmbedBuilder, ChannelSelectMenuBuilder, ChannelType 
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.TOKEN;
let ID_CANAL_LIMPEZA = null; 
const rascunhos = new Map();

client.once('ready', async () => {
    console.log(`✅ Bot online como: ${client.user.tag}`);
    await client.application.commands.set([{
        name: 'painel',
        description: 'Painel administrativo v2.',
        defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
    }]);
});

// 1. LIMPEZA AUTOMÁTICA
client.on('messageCreate', async (message) => {
    if (message.author.bot || !ID_CANAL_LIMPEZA || message.channel.id !== ID_CANAL_LIMPEZA) return;
    try {
        await message.delete();
        await message.channel.send({ content: `💬 **Este canal não é de uso público.**`, flags: [MessageFlags.Ephemeral] });
    } catch (e) { console.error('Erro na limpeza:', e.message); }
});

// 2. INTERAÇÕES
client.on('interactionCreate', async (interaction) => {
    const flagEphemeral = MessageFlags.Ephemeral;
    const flagComponentsV2 = MessageFlags.IsComponentsV2 || 32768;

    if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
        return interaction.reply({ components: [gerarPainelLayoutV2()], flags: [flagEphemeral, flagComponentsV2] });
    }

    // --- BOTÕES DO PAINEL ---
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_limpeza') {
            const seletor = new ChannelSelectMenuBuilder().setCustomId('selecionar_canal_limpeza').setPlaceholder('Selecione o canal...').addChannelTypes([ChannelType.GuildText]);
            return interaction.reply({ content: '📍 Selecione abaixo o canal para limpeza:', components: [new ActionRowBuilder().addComponents(seletor)], flags: [flagEphemeral] });
        }
        if (interaction.customId === 'btn_enviar') {
            const menu = new StringSelectMenuBuilder().setCustomId('painel_selecao').setPlaceholder('Escolha o formato...')
                .addOptions([
                    { label: 'Mensagem Simples', value: 'simples' },
                    { label: 'Embed', value: 'embed' },
                    { label: 'Contêiner V2', value: 'container_v2' }
                ]);
            return interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], flags: [flagEphemeral] });
        }
    }

    // --- SELEÇÃO DE FORMATO E MODAL ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'painel_selecao') {
        rascunhos.set(interaction.user.id, { formato: interaction.values[0] });
        const modal = new ModalBuilder().setCustomId('modal_dados_mensagem').setTitle('Configurar Mensagem');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_texto').setLabel('Conteúdo').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_btn_nome').setLabel('Texto Botão (Opcional)').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_btn_url').setLabel('Link Botão (Opcional)').setStyle(TextInputStyle.Short).setRequired(false))
        );
        return interaction.showModal(modal);
    }

    // --- CONFIGURAÇÃO DE CANAL ---
    if (interaction.isChannelSelectMenu() && interaction.customId === 'selecionar_canal_limpeza') {
        ID_CANAL_LIMPEZA = interaction.values[0];
        return interaction.update({ content: `✅ Canal de limpeza definido como <#${ID_CANAL_LIMPEZA}>!`, components: [], flags: [flagEphemeral] });
    }

    // --- SUBMISSÃO E ENVIO ---
    if (interaction.isModalSubmit() && interaction.customId === 'modal_dados_mensagem') {
        const rascunho = rascunhos.get(interaction.user.id);
        rascunho.texto = interaction.fields.getTextInputValue('m_texto');
        rascunho.btnNome = interaction.fields.getTextInputValue('m_btn_nome');
        rascunho.btnUrl = interaction.fields.getTextInputValue('m_btn_url');
        
        const seletor = new ChannelSelectMenuBuilder().setCustomId('selecionar_canal_envio').setPlaceholder('Onde enviar?').addChannelTypes([ChannelType.GuildText]);
        return interaction.reply({ content: '📤 Selecione o canal de destino:', components: [new ActionRowBuilder().addComponents(seletor)], flags: [flagEphemeral] });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'selecionar_canal_envio') {
        const canal = await client.channels.fetch(interaction.values[0]);
        const rascunho = rascunhos.get(interaction.user.id);
        
        let payload = { content: rascunho.texto };
        if (rascunho.btnNome && rascunho.btnUrl) {
            const btn = new ButtonBuilder().setLabel(rascunho.btnNome).setStyle(ButtonStyle.Link).setURL(rascunho.btnUrl);
            const row = new ActionRowBuilder().addComponents(btn);
            
            if (rascunho.formato === 'container_v2') {
                payload = { components: [new ContainerBuilder().setAccentColor(0x2b2d31).addTextDisplayComponents(new TextDisplayBuilder().setContent(rascunho.texto)).addActionRowComponents(row)] };
            } else if (rascunho.formato === 'embed') {
                payload = { embeds: [new EmbedBuilder().setDescription(rascunho.texto).setColor('#2b2d31')], components: [row] };
            } else {
                payload.components = [row];
            }
        }
        
        await canal.send(payload);
        return interaction.update({ content: '✅ Mensagem enviada!', components: [], flags: [flagEphemeral] });
    }
});

function gerarPainelLayoutV2() {
    const container = new ContainerBuilder().setAccentColor(0x2b2d31);
    container.addImageDisplayComponents({ url: 'https://cdn.discordapp.com/attachments/1497746808292511835/1526312049997779144/3E253502-A13F-4441-8D2E-E10F8B291422.jpg' });
    
    const btnLimpeza = new ButtonBuilder().setCustomId('btn_limpeza').setLabel('Limpeza').setStyle(ButtonStyle.Secondary).setEmoji('1478553904848306257');
    const btnEnviar = new ButtonBuilder().setCustomId('btn_enviar').setLabel('Enviar Mensagem').setStyle(ButtonStyle.Primary).setEmoji('📥');
    
    return container.addActionRowComponents(new ActionRowBuilder().addComponents(btnLimpeza, btnEnviar));
}

client.login(TOKEN);
