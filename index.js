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
    SeparatorBuilder,
    MessageFlags // Importado para garantir compatibilidade segura de flags
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const botStartTime = Date.now();

// 1. Monitoramento de Inicialização
client.once('ready', async () => {
    console.log(`\n🤖 [STATUS] Bot online com sucesso como: ${client.user.tag}`);
    try {
        await client.application.commands.set([
            {
                name: 'painel',
                description: 'Abre o painel de gerenciamento administrativo v2.',
                defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
                dmPermission: false,
            }
        ]);
        console.log('✅ [SLASH COMMANDS] Comando /painel foi sincronizado com o Discord!');
    } catch (error) {
        console.error('❌ [ERRO] Falha crítica ao registrar o comando:', error);
    }
});

// 2. Ouvinte de Interações com Try/Catch Duplo (Anti-Travamento)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'painel') {
        console.log(`📥 [INTERAÇÃO] Comando /painel acionado por ${interaction.user.tag} no servidor ${interaction.guild?.name}`);
        
        try {
            // VERIFICAÇÃO DE VERSÃO: Impede o crash silencioso caso o discord.js esteja desatualizado
            if (typeof ContainerBuilder === 'undefined') {
                throw new Error("Sua biblioteca 'discord.js' está desatualizada e não conhece o 'ContainerBuilder' (Components V2). Atualize executando: npm i discord.js@latest");
            }

            const painelCompleto = gerarPainelLayoutV2(interaction.guild);

            // Resolução de flags por Bitfield numérico (Evita quebras em versões antigas do NodeJS/Discord.js)
            const flagEphemeral = MessageFlags?.Ephemeral ?? 64;
            const flagComponentsV2 = MessageFlags?.IsComponentsV2 ?? 32768;

            await interaction.reply({ 
                components: [painelCompleto], 
                flags: [flagEphemeral, flagComponentsV2]
            });
            
            console.log('✅ [SUCESSO] Painel de Administração V2 enviado para o Discord.');

        } catch (error) {
            console.error('\n❌ [ERRO CAPTURADO NO COMANDO /PAINEL]:');
            console.error(error.stack || error); // Exibe detalhadamente a linha onde o erro ocorreu
            
            // CATCH INTERNO: Força o envio de uma mensagem para o Discord para EVITAR o "Aplicativo não respondeu"
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: `⚠️ **Ocorreu um erro interno ao executar o comando!**\n\n**Detalhes técnicos:**\n\`\`\`x86asm\n${error.message}\n\`\`\`\n*Verifique o console do terminal do seu bot para corrigir.*`, 
                        ephemeral: true
                    });
                    console.log('⚠️ [AVISO] O bot enviou uma mensagem de erro segura para o usuário no Discord.');
                }
            } catch (replyError) {
                console.error('❌ [ERRO EM CASCATA] Nem mesmo a mensagem de erro pôde ser enviada:', replyError);
            }
        }
    }
});

function gerarPainelLayoutV2(guild) {
    const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    const horas = Math.floor(totalUptimeSeconds / 3600);
    const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

    const containerPainel = new ContainerBuilder()
        .setAccentColor(0x2b2d31); 

    const txtTitulo = new TextDisplayBuilder()
        .setContent('# SISTEMA DE GERENCIAMENTO E CONTROLE\n**Painel de Administração V2**');

    const divisor = new SeparatorBuilder();

    const txtStatus = new TextDisplayBuilder()
        .setContent(`⚙️ **Status do Sistema**\n• Servidor: \`${guild?.name || 'Desconhecido'}\`\n• Uptime: \`${horas}h ${minutos}m\`\n• Latência: \`${client.ws.ping ?? 0}ms\``);

    containerPainel.addTextDisplayComponents(txtTitulo)
                   .addSeparatorComponents(divisor)
                   .addTextDisplayComponents(txtStatus);

    const menuSelecao = new StringSelectMenuBuilder()
        .setCustomId('painel_selecao')
        .setPlaceholder('Selecione uma opção de gerenciamento...')
        .addOptions([
            { label: 'Gerenciar Usuários', description: 'Ativar, banir ou mutar membros.', value: 'gerenciar_usuarios', emoji: '👥' },
            { label: 'Configurações de Canais', description: 'Trancar ou liberar canais.', value: 'config_canais', emoji: '🔒' },
            { label: 'Sistemas Globais', description: 'Alterar status de módulos automáticos.', value: 'sistemas_globais', emoji: '🌐' }
        ]);

    const btnRecarregar = new ButtonBuilder().setCustomId('btn_recarregar').setLabel('Recarregar').setStyle(ButtonStyle.Primary).setEmoji('🔄');
    const btnLogs = new ButtonBuilder().setCustomId('btn_logs').setLabel('Ver Logs').setStyle(ButtonStyle.Secondary).setEmoji('📋');
    const btnSuporte = new ButtonBuilder().setCustomId('btn_suporte').setLabel('Suporte').setStyle(ButtonStyle.Danger).setEmoji('🛠️');

    const rowMenu = new ActionRowBuilder().addComponents(menuSelecao);
    const rowBotoes = new ActionRowBuilder().addComponents(btnRecarregar, btnLogs, btnSuporte);

    containerPainel.addActionRowComponents(rowMenu, rowBotoes);

    return containerPainel;
}

// ⚠️ ATENÇÃO: COLOQUE SEU TOKEN ABAIXO DE VERDADE ⚠️
client.login('SEU_TOKEN_AQUI'); 
