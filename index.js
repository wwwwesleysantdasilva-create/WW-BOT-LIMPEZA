require('dotenv').config(); 

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

// ⚠️ ADICIONADO: Intents necessários para o bot conseguir ler e apagar mensagens do chat
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

const botStartTime = Date.now();

// CONFIGURAÇÃO: Coloque entre as aspas o ID do canal que você quer que limpe na hora
const ID_CANAL_LIMPEZA = 'COLOQUE_O_ID_DO_CANAL_AQUI'; 

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

// 2. SISTEMA DE LIMPEZA AUTOMÁTICA (Apaga qualquer mensagem enviada no exato momento)
client.on('messageCreate', async (message) => {
    // Ignora mensagens do próprio bot para não dar loop
    if (message.author.bot) return; 

    // Verifica se a mensagem foi enviada no canal de limpeza programado
    if (message.channel.id === ID_CANAL_LIMPEZA) {
        try {
            await message.delete();
            console.log(`🧹 [LIMPEZA] Mensagem de ${message.author.tag} apagada instantaneamente.`);
        } catch (error) {
            console.error('❌ [ERRO] Não foi possível apagar a mensagem. Verifique as permissões do bot:', error.message);
        }
    }
});

// 3. Ouvinte do Comando /painel
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'painel') {
        console.log(`📥 [INTERAÇÃO] Comando /painel acionado por ${interaction.user.tag}`);
        
        try {
            if (typeof ContainerBuilder === 'undefined') {
                throw new Error("Sua biblioteca 'discord.js' está desatualizada.");
            }

            const painelCompleto = gerarPainelLayoutV2(interaction.guild);
            const flagEphemeral = MessageFlags?.Ephemeral ?? 64;
            const flagComponentsV2 = MessageFlags?.IsComponentsV2 ?? 32768;

            await interaction.reply({ 
                components: [painelCompleto], 
                flags: [flagEphemeral, flagComponentsV2]
            });
            
            console.log('✅ [SUCESSO] Painel enviado.');

        } catch (error) {
            console.error('\n❌ [ERRO NO COMANDO /PAINEL]:', error.message);
        }
    }
});

function gerarPainelLayoutV2(guild) {
    const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    const horas = Math.floor(totalUptimeSeconds / 3600);
    const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

    const containerPainel = new ContainerBuilder().setAccentColor(0x2b2d31); 
    const txtTitulo = new TextDisplayBuilder().setContent('# SISTEMA DE GERENCIAMENTO\n**Painel de Administração V2**');
    const divisor = new SeparatorBuilder();
    const txtStatus = new TextDisplayBuilder().setContent(`⚙️ **Status**\n• Servidor: \`${guild?.name || 'Desconhecido'}\`\n• Uptime: \`${horas}h ${minutos}m\``);

    containerPainel.addTextDisplayComponents(txtTitulo).addSeparatorComponents(divisor).addTextDisplayComponents(txtStatus);

    const menuSelecao = new StringSelectMenuBuilder()
        .setCustomId('painel_selecao')
        .setPlaceholder('Selecione uma opção...')
        .addOptions([
            { label: 'Gerenciar Usuários', value: 'gerenciar_usuarios', emoji: '👥' },
            { label: 'Configurações de Canais', value: 'config_canais', emoji: '🔒' }
        ]);

    const btnRecarregar = new ButtonBuilder().setCustomId('btn_recarregar').setLabel('Recarregar').setStyle(ButtonStyle.Primary).setEmoji('🔄');
    const rowMenu = new ActionRowBuilder().addComponents(menuSelecao);
    const rowBotoes = new ActionRowBuilder().addComponents(btnRecarregar);

    containerPainel.addActionRowComponents(rowMenu, rowBotoes);
    return containerPainel;
}

client.login(process.env.TOKEN);
