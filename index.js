require('dotenv').config(); // Garante o login seguro usando as variáveis do Railway

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
    MessageFlags 
} = require('discord.js');

// 🔐 INTENTS: Necessários para ler as mensagens e gerenciar o servidor
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

const botStartTime = Date.now();

// ⚙️ CONFIGURAÇÃO DO CANAL DE LIMPEZA
// Substitua os números abaixo pelo ID do canal que deve ser limpo instantaneamente
const ID_CANAL_LIMPEZA = '123456789012345678'; 

// 1. Monitoramento de Inicialização
client.once('ready', async () => {
    console.log(`\n🤖 [STATUS] Bot online com sucesso como: ${client.user.tag}`);
    try {
        await client.application.commands.set([
            {
                name: 'painel',
                description: 'Abre o painel administrativo moderno com contêiner e botões.',
                defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
                dmPermission: false,
            }
        ]);
        console.log('✅ [SLASH COMMANDS] Comando /painel sincronizado com sucesso!');
    } catch (error) {
        console.error('❌ [ERRO] Falha ao registrar o comando:', error);
    }
});

// 2. SISTEMA DE LIMPEZA AUTOMÁTICA INSTANTÂNEA
client.on('messageCreate', async (message) => {
    // IMPORTANTE: Ignora mensagens de outros bots e do próprio bot
    // Isso garante que o painel enviado pelo bot NUNCA seja apagado por ele mesmo
    if (message.author.bot) return; 

    // Se a mensagem for enviada no canal configurado, ela é deletada na hora
    if (message.channel.id === ID_CANAL_LIMPEZA) {
        try {
            await message.delete();
            console.log(`🧹 [LIMPEZA] Mensagem de ${message.author.tag} deletada no exato momento do envio.`);
        } catch (error) {
            console.error('❌ [ERRO DE PERMISSÃO] Não consegui apagar a mensagem:', error.message);
        }
    }
});

// 3. SISTEMA DO PAINEL MODERNO (LAYOUT V2)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'painel') {
        console.log(`📥 [INTERAÇÃO] Comando /painel acionado por ${interaction.user.tag}`);
        
        try {
            if (typeof ContainerBuilder === 'undefined') {
                throw new Error("O seu discord.js precisa estar na versão mais recente para usar ContainerBuilder.");
            }

            // Gerando o layout completo com contêiner, textos e botões
            const painelCompleto = gerarPainelLayoutV2(interaction.guild);

            // Flags para ativar o visual moderno V2 do Discord
            // Nota: Se quiser que TODOS vejam o painel no canal, mude para: const flagEphemeral = 0;
            const flagEphemeral = MessageFlags?.Ephemeral ?? 64; 
            const flagComponentsV2 = MessageFlags?.IsComponentsV2 ?? 32768;

            await interaction.reply({ 
                components: [painelCompleto], 
                flags: [flagEphemeral, flagComponentsV2]
            });
            
            console.log('✅ [SUCESSO] Painel V2 enviado com todos os componentes.');

        } catch (error) {
            console.error('\n❌ [ERRO NO COMANDO]:', error.stack || error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: `⚠️ Ocorreu um erro ao carregar o painel V2: \`${error.message}\``, 
                    ephemeral: true
                });
            }
        }
    }
});

// FUNÇÃO QUE MONTA O DESIGN DO CONTÊINER E DOS BOTÕES
function gerarPainelLayoutV2(guild) {
    const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    const horas = Math.floor(totalUptimeSeconds / 3600);
    const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

    // Criando o Bloco de Contêiner Principal
    const containerPainel = new ContainerBuilder()
        .setAccentColor(0x2b2d31); // Cor escura oficial do Discord

    // Título Grande (Header) usando a formatação Markdown nova
    const txtTitulo = new TextDisplayBuilder()
        .setContent('# SISTEMA DE GERENCIAMENTO E CONTROLE\n**Painel de Administração V2**');

    // Linha de Divisão Visual (Separator)
    const divisor = new SeparatorBuilder();

    // Informações de Status de dentro do bloco
    const txtStatus = new TextDisplayBuilder()
        .setContent(`⚙️ **Status do Sistema**\n• Servidor: \`${guild?.name || 'Desconhecido'}\`\n• Uptime: \`${horas}h ${minutos}m\`\n• Latência: \`${client.ws.ping ?? 0}ms\``);

    // Juntando os textos e o divisor dentro do contêiner
    containerPainel.addTextDisplayComponents(txtTitulo)
                   .addSeparatorComponents(divisor)
                   .addTextDisplayComponents(txtStatus);

    // Criando o Menu de Seleção (Dropdown)
    const menuSelecao = new StringSelectMenuBuilder()
        .setCustomId('painel_selecao')
        .setPlaceholder('Selecione uma opção de gerenciamento...')
        .addOptions([
            { label: 'Gerenciar Usuários', description: 'Ativar, banir ou mutar membros.', value: 'gerenciar_usuarios', emoji: '👥' },
            { label: 'Configurações de Canais', description: 'Trancar ou liberar canais.', value: 'config_canais', emoji: '🔒' },
            { label: 'Sistemas Globais', description: 'Alterar status de módulos automáticos.', value: 'sistemas_globais', emoji: '🌐' }
        ]);

    // Criando a fileira de botões modernos
    const btnRecarregar = new ButtonBuilder().setCustomId('btn_recarregar').setLabel('Recarregar').setStyle(ButtonStyle.Primary).setEmoji('🔄');
    const btnLogs = new ButtonBuilder().setCustomId('btn_logs').setLabel('Ver Logs').setStyle(ButtonStyle.Secondary).setEmoji('📋');
    const btnSuporte = new ButtonBuilder().setCustomId('btn_suporte').setLabel('Suporte').setStyle(ButtonStyle.Danger).setEmoji('🛠️');

    // Organizando os componentes em linhas de ação
    const rowMenu = new ActionRowBuilder().addComponents(menuSelecao);
    const rowBotoes = new ActionRowBuilder().addComponents(btnRecarregar, btnLogs, btnSuporte);

    // Inserindo o Menu e os Botões dentro do rodapé do Contêiner V2
    containerPainel.addActionRowComponents(rowMenu, rowBotoes);

    return containerPainel;
}

client.login(process.env.TOKEN);
