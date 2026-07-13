const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder 
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Constante para rastrear o Uptime do Bot
const botStartTime = Date.now();

client.once('ready', async () => {
    console.log(`✅ Bot ativo como ${client.user.tag}`);
    try {
        // Registando o comando Slash globalmente
        await client.application.commands.set([
            {
                name: 'painel',
                description: 'Abre o painel de gerenciamento administrativo v2.',
                defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
                dmPermission: false, // Impede o uso em DMs para evitar erros de falta de guilda
            }
        ]);
        console.log('✅ Comando /painel registado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registar comando:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'painel') {
        try {
            // Cria a estrutura do painel V2
            const painelCompleto = gerarPainelLayoutV2(interaction.guild);

            // Resposta correta utilizando as flags textuais estáveis do discord.js
            await interaction.reply({ 
                components: [painelCompleto], 
                flags: ['Ephemeral', 'IsComponentsV2']
            });
        } catch (error) {
            // Qualquer erro agora será visível imediatamente no seu terminal
            console.error('❌ Erro detetado ao executar o comando /painel:', error);
            
            // Garante que o utilizador não fique à espera infinitamente no Discord
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'Ocorreu um erro interno ao carregar o painel administrativo. Verifique a consola do bot.', 
                    flags: ['Ephemeral'] 
                });
            }
        }
    }
});

function gerarPainelLayoutV2(guild) {
    const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    const horas = Math.floor(totalUptimeSeconds / 3600);
    const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

    // CORREÇÃO 1: ContainerBuilder não aceita .setTitle(). 
    // Configuramos apenas a cor da borda lateral (Accent Color).
    const containerPainel = new ContainerBuilder()
        .setAccentColor(0x2b2d31); 

    // CORREÇÃO 2: O título proeminente do painel deve ser inserido via Markdown (#) no TextDisplay
    const txtTitulo = new TextDisplayBuilder()
        .setContent('# SISTEMA DE GERENCIAMENTO E CONTROLE\n**Painel de Administração V2**');

    const divisor = new SeparatorBuilder();

    const txtStatus = new TextDisplayBuilder()
        .setContent(`⚙️ **Status do Sistema**\n• Servidor: \`${guild?.name || 'Desconhecido'}\`\n• Uptime: \`${horas}h ${minutos}m\`\n• Latência: \`${client.ws.ping ?? 0}ms\``);

    // Adicionando os elementos de texto e divisores organizadamente ao contêiner
    containerPainel.addTextDisplayComponents(txtTitulo)
                   .addSeparatorComponents(divisor)
                   .addTextDisplayComponents(txtStatus);

    // Menu de Seleção
    const menuSelecao = new StringSelectMenuBuilder()
        .setCustomId('painel_selecao')
        .setPlaceholder('Selecione uma opção de gerenciamento...')
        .addOptions([
            { label: 'Gerenciar Usuários', description: 'Ativar, banir ou mutar membros.', value: 'gerenciar_usuarios', emoji: '👥' },
            { label: 'Configurações de Canais', description: 'Trancar ou liberar canais.', value: 'config_canais', emoji: '🔒' },
            { label: 'Sistemas Globais', description: 'Alterar status de módulos automáticos.', value: 'sistemas_globais', emoji: '🌐' }
        ]);

    // Botões de Ação rápida
    const btnRecarregar = new ButtonBuilder().setCustomId('btn_recarregar').setLabel('Recarregar').setStyle(ButtonStyle.Primary).setEmoji('🔄');
    const btnLogs = new ButtonBuilder().setCustomId('btn_logs').setLabel('Ver Logs').setStyle(ButtonStyle.Secondary).setEmoji('📋');
    const btnSuporte = new ButtonBuilder().setCustomId('btn_suporte').setLabel('Suporte').setStyle(ButtonStyle.Danger).setEmoji('🛠️');

    // Agrupando componentes em linhas horizontais válidas
    const rowMenu = new ActionRowBuilder().addComponents(menuSelecao);
    const rowBotoes = new ActionRowBuilder().addComponents(btnRecarregar, btnLogs, btnSuporte);

    // Vinculando as linhas de componentes ao layout estruturado do contêiner
    containerPainel.addActionRowComponents(rowMenu, rowBotoes);

    return containerPainel;
}

client.login('SEU_TOKEN_AQUI');
