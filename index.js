require('dotenv').config();
const { 
    Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, 
    ButtonBuilder, ButtonStyle, PermissionFlagsBits, ContainerBuilder, 
    TextDisplayBuilder, MessageFlags, ModalBuilder, TextInputBuilder, 
    TextInputStyle, EmbedBuilder, ChannelSelectMenuBuilder, ChannelType 
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.DISCORD_TOKEN;
let ID_CANAL_LIMPEZA = process.env.CANAL_ID || null;
let mensagensApagadasTotal = 0;
const botStartTime = Date.now();
const rascunhos = new Map();

client.once('ready', async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    await client.application.commands.set([{
        name: 'painel',
        description: 'Painel administrativo moderno v2.',
        defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
    }]);
});

// 1. LIMPEZA AUTOMÁTICA (Lógica do Código 1)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !ID_CANAL_LIMPEZA || message.channel.id !== ID_CANAL_LIMPEZA) return;
    try {
        await message.delete();
        mensagensApagadasTotal++;
        await message.channel.send({ content: `💬 **Canal restrito.**`, flags: [MessageFlags.Ephemeral] });
    } catch (e) { console.error('Erro na limpeza:', e.message); }
});

// 2. INTERAÇÕES E PAINEL
client.on('interactionCreate', async (interaction) => {
    const flagEphemeral = 64; 

    // Comando Slash /painel
    if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
        return interaction.reply({ components: [gerarPainelLayoutV2()], flags: [flagEphemeral] });
    }

    // Botões do Painel
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_limpeza') {
            const seletor = new ChannelSelectMenuBuilder().setCustomId('selecionar_canal_limpeza').setPlaceholder('Selecione o canal...').addChannelTypes([ChannelType.GuildText]);
            return interaction.reply({ content: '📍 Selecione o canal de limpeza:', components: [new ActionRowBuilder().addComponents(seletor)], flags: [flagEphemeral] });
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

    // Seleção de formato
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

    // Configuração de Canal
    if (interaction.isChannelSelectMenu() && interaction.customId === 'selecionar_canal_limpeza') {
        ID_CANAL_LIMPEZA = interaction.values[0];
        return interaction.update({ content: `✅ Canal definido: <#${ID_CANAL_LIMPEZA}>`, components: [], flags: [flagEphemeral] });
    }

    // Submissão do Modal e Envio
    if (interaction.isModalSubmit() && interaction.customId === 'modal_dados_mensagem') {
        const rascunho = rascunhos.get(interaction.user.id);
        rascunho.texto = interaction.fields.getTextInputValue('m_texto');
        rascunho.btnNome = interaction.fields.getTextInputValue('m_btn_nome');
        rascunho.btnUrl = interaction.fields.getTextInputValue('m_btn_url');
        
        const seletor = new ChannelSelectMenuBuilder().setCustomId('selecionar_canal_envio').setPlaceholder('Onde enviar?').addChannelTypes([ChannelType.GuildText]);
        return interaction.reply({ content: '📤 Selecione o destino:', components: [new ActionRowBuilder().addComponents(seletor)], flags: [flagEphemeral] });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'selecionar_canal_envio') {
        const canal = await interaction.guild.channels.fetch(interaction.values[0]);
        const rascunho = rascunhos.get(interaction.user.id);
        
        let payload = { content: rascunho.texto };
        
        if (rascunho.btnNome && rascunho.btnUrl) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel(rascunho.btnNome).setStyle(ButtonStyle.Link).setURL(rascunho.btnUrl)
            );
            
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
    const totalUptime = Math.floor((Date.now() - botStartTime) / 3600000);
    const container = new ContainerBuilder().setAccentColor(0x2b2d31);
    
    // Header visual
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**PAINEL ADMINISTRATIVO**\nStatus: Online | Uptime: ${totalUptime}h\nApagadas: ${mensagensApagadasTotal}`));
    
    const btnLimpeza = new ButtonBuilder().setCustomId('btn_limpeza').setLabel('Config. Limpeza').setStyle(ButtonStyle.Secondary);
    const btnEnviar = new ButtonBuilder().setCustomId('btn_enviar').setLabel('Enviar Anúncio').setStyle(ButtonStyle.Primary);
    
    return container.addActionRowComponents(new ActionRowBuilder().addComponents(btnLimpeza, btnEnviar));
}

client.login(TOKEN);
