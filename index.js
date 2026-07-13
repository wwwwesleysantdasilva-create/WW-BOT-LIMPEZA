const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ComponentType,
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder,
    MessageFlags // Importado para ativar a interface moderna v2
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
});

const TOKEN = process.env.DISCORD_TOKEN;
let canalLimpezaId = process.env.CANAL_ID;

let mensagensApagadasTotal = 0;
const botStartTime = Date.now();
const sessoesAdmin = new Map();

// =========================================================================
// CONFIGURAÇÃO DE EMOJIS CUSTOMIZADOS BRANCOS (VIA ID)
// IMPORTANTE: Faça o upload de emojis brancos no seu servidor do Discord,
// pegue o ID deles (digitando \:nome_do_emoji: no chat) e mude os números abaixo!
// =========================================================================
const EMOJIS = {
    broom: '<:white_broom:123456789012345601>',
    chart: '<:white_chart:123456789012345602>',
    users: '<:white_users:123456789012345603>',
    ping: '<:white_ping:123456789012345604>',
    clock: '<:white_clock:123456789012345605>',
    gear: '<:white_gear:123456789012345606>',
    restart: '<:white_restart:123456789012345607>',
    check: '<:white_check:123456789012345608>',
    cross: '<:white_cross:123456789012345609>'
};

// =========================================================================
// GERADOR DO PAINEL COMPLETO (ESTRUTURA COMPONENTES V2 CORRIGIDA)
// =========================================================================
function gerarPainelLayoutV2(guild) {
    const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    const horas = Math.floor(totalUptimeSeconds / 3600);
    const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

    const containerPainel = new ContainerBuilder()
        .setTitle('SISTEMA DE GERENCIAMENTO E CONTROLE')
        .setAccentColor(0x2b2d31); // Corrigido: setAccentColor aceita valor numérico/hex

    // Corrigido: .addTextDisplayComponents e .setContent()
    containerPainel.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Gerencie as funções de envio do bot e acompanhe as estatísticas do sistema em tempo real através das opções abaixo.')
    );
    
    // Corrigido: Método próprio para separadores
    containerPainel.addSeparatorComponents(new SeparatorBuilder());
    
    containerPainel.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${EMOJIS.broom} Canal de Limpeza Ativo: ${canalLimpezaId ? `<#${canalLimpezaId}>` : '*Nenhum configurado*'}`),
        new TextDisplayBuilder().setContent(`${EMOJIS.chart} Total de Mensagens Apagadas: \`${mensagensApagadasTotal}\` mensagens`),
        new TextDisplayBuilder().setContent(`${EMOJIS.users} Total de Membros: \`${guild.memberCount}\` usuários`),
        new TextDisplayBuilder().setContent(`${EMOJIS.ping} Latência (Ping): \`${client.ws.ping || 0}ms\``),
        new TextDisplayBuilder().setContent(`${EMOJIS.clock} Tempo Online: \`${horas}h ${minutos}m\``)
    );

    // Menus e botões construídos normalmente
    const menuSelecao = new StringSelectMenuBuilder()
        .setCustomId('menu_painel_opcoes')
        .setPlaceholder('Selecione uma ação administrativa...')
        .addOptions([
            { label: 'Enviar Mensagem', description: 'Enviar anúncio estruturado com botão de link.', value: 'op_enviar_mensagem' },
            { label: 'Alterar Canal de Limpeza', description: 'Mudar o canal monitorado pelo sistema de limpeza.', value: 'op_config_limpeza' }
        ]);

    const botaoAtualizar = new ButtonBuilder()
        .setCustomId('btn_atualizar_painel')
        .setLabel('Atualizar Estatísticas')
        .setStyle(ButtonStyle.Secondary);

    // NOVO: Botão de Reinicialização de segurança contra travamentos
    const botaoReiniciar = new ButtonBuilder()
        .setCustomId('btn_reiniciar_bot')
        .setLabel('Reiniciar Aplicação')
        .setStyle(ButtonStyle.Danger);

    const rowMenu = new ActionRowBuilder().addComponents(menuSelecao);
    const rowBotoes = new ActionRowBuilder().addComponents(botaoAtualizar, botaoReiniciar);

    // Corrigido: Anexa os menus e botões DENTRO do bloco do container principal
    containerPainel.addActionRowComponents(rowMenu, rowBotoes);

    return containerPainel;
}

client.once('ready', async () => {
    console.log(`✅ Bot ativo como ${client.user.tag}`);
    try {
        await client.application.commands.set([
            {
                name: 'painel',
                description: 'Abre o painel de gerenciamento administrativo v2.',
                defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
            }
        ]);
        console.log('✅ Comando /painel registrado com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comando:', error);
    }
});

// =========================================================================
// MONITORAMENTO DE LIMPEZA
// =========================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (canalLimpezaId && message.channel.id === canalLimpezaId) {
        if (message.pinned) return;

        setTimeout(async () => {
            try {
                await message.delete();
                mensagensApagadasTotal++;
            } catch (err) {
                console.error("Erro ao apagar mensagem:", err);
            }
        }, 1000);
    }
});

// =========================================================================
// PROCESSAMENTO DE INTERAÇÕES MODERNAS (V2)
// =========================================================================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand() || interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isModalSubmit()) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: `${EMOJIS.cross} Apenas administradores podem utilizar este painel.`, flags: [MessageFlags.Ephemeral] });
        }
    }

    // --- DISPARO DO COMANDO /PAINEL ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
        const painelCompleto = gerarPainelLayoutV2(interaction.guild);

        // CORREÇÃO CHAVE: Incluindo MessageFlags.IsComponentsV2 e MessageFlags.Ephemeral juntas no array de flags
        await interaction.reply({ 
            components: [painelCompleto], 
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] 
        });
    }

    // --- CLIQUE NO BOTÃO DE ATUALIZAR ---
    if (interaction.isButton() && interaction.customId === 'btn_atualizar_painel') {
        const painelAtualizado = gerarPainelLayoutV2(interaction.guild);
        await interaction.update({ 
            components: [painelAtualizado],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    }

    // --- INTERAÇÃO DO BOTÃO REINICIAR ---
    if (interaction.isButton() && interaction.customId === 'btn_reiniciar_bot') {
        const containerRestart = new ContainerBuilder()
            .setTitle('Reiniciando Aplicação')
            .setAccentColor(0xff0000)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${EMOJIS.restart} A aplicação está sendo reiniciada de forma limpa para prevenir instabilidades e limpar cache de memória...`)
            );

        await interaction.update({ 
            components: [containerRestart], 
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] 
        });

        console.log('🔄 Reinicialização forçada do bot iniciada via Painel Administrativo.');
        
        // Pequeno delay para garantir que o Discord processe a mensagem visual antes de derrubar o Node
        setTimeout(() => {
            process.exit(0);
        }, 1500);
    }

    // --- CAPTURA DO MENU DE SELEÇÃO PRINCIPAL ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_painel_opcoes') {
        const acao = interaction.values[0];

        if (acao === 'op_enviar_mensagem') {
            const selectCanal = new ChannelSelectMenuBuilder()
                .setCustomId('select_canal_destino')
                .setPlaceholder('Selecione o canal que vai receber o anúncio...')
                .setChannelTypes([ComponentType.GuildText]);

            const containerSelect = new ContainerBuilder()
                .setTitle('Selecionar Destino')
                .setAccentColor(0x2b2d31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJIS.gear} Selecione abaixo o canal de destino para o anúncio:`));
            
            containerSelect.addActionRowComponents(new ActionRowBuilder().addComponents(selectCanal));

            await interaction.reply({ components: [containerSelect], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        if (acao === 'op_config_limpeza') {
            const selectCanalLimpeza = new ChannelSelectMenuBuilder()
                .setCustomId('select_canal_limpeza')
                .setPlaceholder('Selecione o novo canal a ser limpo...')
                .setChannelTypes([ComponentType.GuildText]);

            const containerLimpeza = new ContainerBuilder()
                .setTitle('Configurar Limpeza')
                .setAccentColor(0x2b2d31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJIS.broom} Selecione o novo canal para o monitoramento de limpeza automática:`));

            containerLimpeza.addActionRowComponents(new ActionRowBuilder().addComponents(selectCanalLimpeza));

            await interaction.reply({ components: [containerLimpeza], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }
    }

    // --- CAPTURA DA SELEÇÃO DOS MENUS DE CANAL ---
    if (interaction.isChannelSelectMenu()) {
        const canalSelecionadoId = interaction.values[0];

        if (interaction.customId === 'select_canal_destino') {
            sessoesAdmin.set(interaction.user.id, { canalDestinoId: canalSelecionadoId });

            const modal = new ModalBuilder().setCustomId('modal_dados_mensagem').setTitle('Conteúdo do Anúncio');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_titulo').setLabel('Título da Mensagem').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Atendimento Complexo').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_texto').setLabel('Conteúdo interno').setStyle(TextInputStyle.Paragraph).setPlaceholder('Dica: Use <#ID> para marcar canais em azul').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_btn_texto').setLabel('Texto do Botão').setStyle(TextInputStyle.Short).setPlaceholder('Ex: FAQ').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_btn_url').setLabel('Link (URL) do Botão').setStyle(TextInputStyle.Short).setPlaceholder('https://...').setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'select_canal_limpeza') {
            canalLimpezaId = canalSelecionadoId;
            
            const containerSucesso = new ContainerBuilder()
                .setTitle('Configuração Atualizada')
                .setAccentColor(0x2b2d31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJIS.check} O canal de monitoramento foi reconfigurado com sucesso para: <#${canalLimpezaId}>`));

            await interaction.update({ components: [containerSucesso], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }
    }

    // --- PROCESSAMENTO DO FORMULÁRIO ENVIADO ---
    if (interaction.isModalSubmit() && interaction.customId === 'modal_dados_mensagem') {
        const titulo = interaction.fields.getTextInputValue('m_titulo');
        const texto = interaction.fields.getTextInputValue('m_texto');
        const btnTexto = interaction.fields.getTextInputValue('m_btn_texto');
        const btnUrl = interaction.fields.getTextInputValue('m_btn_url');

        const dadosSessao = sessoesAdmin.get(interaction.user.id);
        if (!dadosSessao || !dadosSessao.canalDestinoId) {
            return interaction.reply({ content: `${EMOJIS.cross} Sessão expirada. Por favor, tente selecionar o canal novamente.`, flags: [MessageFlags.Ephemeral] });
        }

        try {
            const canalAlvo = await client.channels.fetch(dadosSessao.canalDestinoId);
            
            const containerMensagem = new ContainerBuilder()
                .setTitle(titulo)
                .setAccentColor(0x2b2d31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));

            containerMensagem.addSeparatorComponents(new SeparatorBuilder());
            
            const linkButton = new ButtonBuilder()
                .setLabel(btnTexto)
                .setStyle(ButtonStyle.Link)
                .setURL(btnUrl);

            containerMensagem.addActionRowComponents(new ActionRowBuilder().addComponents(linkButton));

            // Envia a mensagem pública final utilizando corretamente a interface moderna V2
            await canalAlvo.send({ components: [containerMensagem], flags: [MessageFlags.IsComponentsV2] });
            
            sessoesAdmin.delete(interaction.user.id);

            await interaction.reply({ content: `${EMOJIS.check} Mensagem enviada com sucesso utilizando a interface moderna em <#${dadosSessao.canalDestinoId}>!`, flags: [MessageFlags.Ephemeral] });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: `${EMOJIS.cross} Falha ao enviar. Verifique se o link possui http:// ou https:// e tente novamente.`, flags: [MessageFlags.Ephemeral] });
        }
    }
});

client.login(TOKEN);
