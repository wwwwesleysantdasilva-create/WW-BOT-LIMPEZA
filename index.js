require('dotenv').config(); 

const { 
    Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, 
    ButtonBuilder, ButtonStyle, PermissionFlagsBits, ContainerBuilder, 
    TextDisplayBuilder, SeparatorBuilder, MessageFlags, ModalBuilder, 
    TextInputBuilder, TextInputStyle, EmbedBuilder, ChannelSelectMenuBuilder, ChannelType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

const botStartTime = Date.now();
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
        await message.channel.send({ content: `💬 **Canal de uso restrito.** Mensagem removida.`, flags: [MessageFlags.Ephemeral] });
    } catch (e) { console.error('Erro na limpeza:', e.message); }
});

// 2. INTERAÇÕES
client.on('interactionCreate', async (interaction) => {
    const flagEphemeral = MessageFlags.Ephemeral;
    const flagComponentsV2 = MessageFlags.IsComponentsV2 || 32768;

    if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
        return interaction.reply({ components: [gerarPainelLayoutV2()], flags: [flagEphemeral, flagComponentsV2] });
    }

    // --- MENU PRINCIPAL ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'painel_selecao') {
        const escolha = interaction.values[0];

        if (escolha === 'config_limpeza') {
            const seletor = new ChannelSelectMenuBuilder().setCustomId('selecionar_canal_limpeza').setPlaceholder('Selecione o canal...').addChannelTypes([ChannelType.GuildText]);
            return interaction.reply({ content: '📍 Selecione abaixo o canal para limpeza:', components: [new ActionRowBuilder().addComponents(seletor)], flags: [flagEphemeral] });
        }

        rascunhos.set(interaction.user.id, { formato: escolha });
        const modal = new ModalBuilder().setCustomId('modal_dados_mensagem').setTitle('Configurar Mensagem');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_texto').setLabel('Conteúdo').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_btn_nome').setLabel('Texto Botão').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_btn_url').setLabel('Link Botão').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return interaction.showModal(modal);
    }

    // --- CONFIGURAÇÃO DE CANAL ---
    if (interaction.isChannelSelectMenu() && interaction.customId === 'selecionar_canal_limpeza') {
        ID_CANAL_LIMPEZA = interaction.values[0];
        return interaction.update({ content: `✅ Canal de limpeza definido como <#${ID_CANAL_LIMPEZA}>!`, components: [], flags: [flagEphemeral] });
    }

    // --- SUBMISSÃO DO MODAL (Redireciona para o seletor de canal de envio) ---
    if (interaction.isModalSubmit() && interaction.customId === 'modal_dados_mensagem') {
        const rascunho = rascunhos.get(interaction.user.id);
        rascunho.texto = interaction.fields.getTextInputValue('m_texto');
        rascunho.btnNome = interaction.fields.getTextInputValue('m_btn_nome');
        rascunho.btnUrl = interaction.fields.getTextInputValue('m_btn_url');
        
        const seletor = new ChannelSelectMenuBuilder().setCustomId('selecionar_canal_envio').setPlaceholder('Onde enviar a mensagem?').addChannelTypes([ChannelType.GuildText]);
        return interaction.reply({ content: '📤 Agora selecione o canal para postar esta mensagem:', components: [new ActionRowBuilder().addComponents(seletor)], flags: [flagEphemeral] });
    }

    // --- ENVIO FINAL ---
    if (interaction.isChannelSelectMenu() && interaction.customId === 'selecionar_canal_envio') {
        const canal = await client.channels.fetch(interaction.values[0]);
        const rascunho = rascunhos.get(interaction.user.id);
        
        const btn = new ButtonBuilder().setLabel(rascunho.btnNome).setStyle(ButtonStyle.Link).setURL(rascunho.btnUrl);
        const payload = rascunho.formato === 'container_v2' 
            ? { components: [new ContainerBuilder().setAccentColor(0x2b2d31).addTextDisplayComponents(new TextDisplayBuilder().setContent(rascunho.texto)).addActionRowComponents(new ActionRowBuilder().addComponents(btn))] }
            : { content: rascunho.texto, components: [new ActionRowBuilder().addComponents(btn)] };

        await canal.send(payload);
        return interaction.update({ content: '✅ Mensagem enviada com sucesso!', components: [], flags: [flagEphemeral] });
    }
});

function gerarPainelLayoutV2() {
    const container = new ContainerBuilder().setAccentColor(0x2b2d31);
    const status = ID_CANAL_LIMPEZA ? `<#${ID_CANAL_LIMPEZA}>` : 'Nenhum definido';
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⚙️ PAINEL ADMINISTRATIVO\n**Status:** Limpeza ativa em: ${status}`));
    container.addSeparatorComponents(new SeparatorBuilder());
    
    const menu = new StringSelectMenuBuilder().setCustomId('painel_selecao').setPlaceholder('Escolha uma ação...').addOptions([
        { label: 'Definir Canal de Limpeza', value: 'config_limpeza', description: 'Ativar limpeza em um canal.', emoji: '🧹' },
        { label: 'Enviar Mensagem (Contêiner V2)', value: 'container_v2', description: 'Enviar formato moderno.', emoji: '🖥️' }
    ]);
    return container.addActionRowComponents(new ActionRowBuilder().addComponents(menu));
}

client.login(TOKEN);
