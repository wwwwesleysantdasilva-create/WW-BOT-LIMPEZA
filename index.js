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
    ChannelSelectMenuBuilder, // Adicionado para seleção nativa de canais
    ComponentType,
    // Importações exclusivas do ecossistema Discord Components V2 (IS_COMPONENTS_V2)
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder 
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

// Armazenamento temporário de sessões para guardar qual canal o admin selecionou antes de abrir o formulário
const sessoesAdmin = new Map();

// =========================================================================
// FUNÇÃO AUXILIAR: GERADOR DO PAINEL USANDO EXCLUSIVAMENTE COMPONENTS V2
// =========================================================================
function gerarPainelLayoutV2(guild) {
    const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    const horas = Math.floor(totalUptimeSeconds / 3600);
    const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

    // Substituído o EmbedBuilder por um ContainerBuilder moderno da V2
    const containerPainel = new ContainerBuilder()
        .setTitle('SISTEMA DE GERENCIAMENTO E CONTROLE')
        .setColor('#2b2d31'); // Cor escura nativa da interface do Discord

    // Adicionando os elementos de texto e separadores internos do container
    containerPainel.addComponents(
        new TextDisplayBuilder().setText('Gerencie as funções de envio do bot e acompanhe as estatísticas do sistema em tempo real através das opções abaixo.'),
        new SeparatorBuilder(),
        new TextDisplayBuilder().setText(`🧹 Canal de Limpeza Ativo: ${canalLimpezaId ? `<#${canalLimpezaId}>` : '*Nenhum configurado*'}`),
        new TextDisplayBuilder().setText(`📊 Total de Mensagens Apagadas: \`${mensagensApagadasTotal}\` mensagens`),
        new TextDisplayBuilder().setText(`👥 Total de Membros: \`${guild.memberCount}\` usuários`),
        new TextDisplayBuilder().setText(`⚡ Latência (Ping): \`${client.ws.ping || 0}ms\``),
        new TextDisplayBuilder().setText(`⏱️ Tempo Online: \`${horas}h ${minutos}m\``)
    );

    return containerPainel;
}

client.once('ready', async () => {
    console.log(`✅ Bot de limpeza e Components V2 ativo como ${client.user.tag}`);

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
        console.error('Erro ao registrar comando de barra:', error);
    }
});

// =========================================================================
// 1. MONITORAMENTO DE LIMPEZA
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
// 2. PROCESSAMENTO DE INTERAÇÕES MODERNAS (V2)
// =========================================================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Apenas administradores podem utilizar este painel.', ephemeral: true });
    }

    // --- DISPARO DO COMANDO /PAINEL ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
        const painelComponente = gerarPainelLayoutV2(interaction.guild);

        // Menu de seleção de ações principais
        const menuSelecao = new StringSelectMenuBuilder()
            .setCustomId('menu_painel_opcoes')
            .setPlaceholder('Selecione uma ação administrativa...')
            .addOptions([
                { label: 'Enviar Mensagem', description: 'Enviar anúncio estruturado com botão de link.', value: 'op_enviar_mensagem' },
                { label: 'Alterar Canal de Limpeza', description: 'Mudar o canal monitorado pelo sistema de limpeza.', value: 'op_config_limpeza' }
            ]);

        // Botão conforme suas regras: Cor cinza (Secondary) e sem emojis
        const botaoAtualizar = new ButtonBuilder()
            .setCustomId('btn_atualizar_painel')
            .setLabel('Atualizar Estatísticas')
            .setStyle(ButtonStyle.Secondary);

        const rowMenu = new ActionRowBuilder().addComponents(menuSelecao);
        const rowBotao = new ActionRowBuilder().addComponents(botaoAtualizar);

        await interaction.reply({ components: [painelComponente, rowMenu, rowBotao] });
    }

    // --- CAPTURA DO MENU DE SELEÇÃO PRINCIPAL ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_painel_opcoes') {
        const acao = interaction.values[0];

        // Se escolheu enviar mensagem, exibe o menu de seleção de CANAL ao invés de pedir ID digitado
        if (acao === 'op_enviar_mensagem') {
            const selectCanal = new ChannelSelectMenuBuilder()
                .setCustomId('select_canal_destino')
                .setPlaceholder('Selecione o canal que vai receber o anúncio...')
                .setChannelTypes([ComponentType.GuildText]); // Filtra apenas para canais de texto

            const row = new ActionRowBuilder().addComponents(selectCanal);
            await interaction.reply({ content: 'Selecione abaixo o canal de destino:', components: [row], ephemeral: true });
        }

        // Se escolheu alterar a limpeza, também exibe o menu de seleção de canais nativo
        if (acao === 'op_config_limpeza') {
            const selectCanalLimpeza = new ChannelSelectMenuBuilder()
                .setCustomId('select_canal_limpeza')
                .setPlaceholder('Selecione o novo canal a ser limpo...')
                .setChannelTypes([ComponentType.GuildText]);

            const row = new ActionRowBuilder().addComponents(selectCanalLimpeza);
            await interaction.reply({ content: 'Selecione o novo canal para o monitoramento de limpeza:', components: [row], ephemeral: true });
        }
    }

    // --- CAPTURA DA SELEÇÃO DOS MENUS DE CANAL ---
    if (interaction.isChannelSelectMenu()) {
        const canalSelecionadoId = interaction.values[0];

        // Resposta da seleção do canal de destino da mensagem
        if (interaction.customId === 'select_canal_destino') {
            // Salva o canal escolhido na sessão do usuário atual
            sessoesAdmin.set(interaction.user.id, { canalDestinoId: canalSelecionadoId });

            // Abre o formulário para coletar os textos do anúncio
            const modal = new ModalBuilder().setCustomId('modal_dados_mensagem').setTitle('Conteúdo do Anúncio');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_titulo').setLabel('Título da Mensagem').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Atendimento Complexo').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_texto').setLabel('Conteúdo interno').setStyle(TextInputStyle.Paragraph).setPlaceholder('Dica: Use <#ID> para marcar canais em azul').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_btn_texto').setLabel('Texto do Botão').setStyle(TextInputStyle.Short).setPlaceholder('Ex: FAQ').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_btn_url').setLabel('Link (URL) do Botão').setStyle(TextInputStyle.Short).setPlaceholder('https://...').setRequired(true))
            );
            await interaction.showModal(modal);
        }

        // Resposta da seleção do canal de limpeza
        if (interaction.customId === 'select_canal_limpeza') {
            canalLimpezaId = canalSelecionadoId;
            
            const containerSucesso = new ContainerBuilder()
                .setTitle('Configuração Atualizada')
                .setColor('#2b2d31')
                .addComponents(new TextDisplayBuilder().setText(`O canal de monitoramento foi reconfigurado com sucesso para: <#${canalLimpezaId}>`));

            await interaction.reply({ components: [containerSucesso], ephemeral: true });
        }
    }

    // --- CAPTURA DO CLIQUE NO BOTÃO CINZA (ATUALIZAR) ---
    if (interaction.isButton() && interaction.customId === 'btn_atualizar_painel') {
        const painelAtualizado = gerarPainelLayoutV2(interaction.guild);
        await interaction.update({ components: [painelAtualizado, interaction.message.components[1], interaction.message.components[2]] });
    }

    // --- PROCESSAMENTO DO FORMULÁRIO ENVIADO ---
    if (interaction.isModalSubmit() && interaction.customId === 'modal_dados_mensagem') {
        const titulo = interaction.fields.getTextInputValue('m_titulo');
        const texto = interaction.fields.getTextInputValue('m_texto');
        const btnTexto = interaction.fields.getTextInputValue('m_btn_texto');
        const btnUrl = interaction.fields.getTextInputValue('m_btn_url');

        // Puxa o ID do canal que guardamos na sessão anteriormente
        const dadosSessao = sessoesAdmin.get(interaction.user.id);
        if (!dadosSessao || !dadosSessao.canalDestinoId) {
            return interaction.reply({ content: '❌ Sessão expirada. Por favor, tente selecionar o canal novamente.', ephemeral: true });
        }

        try {
            const canalAlvo = await client.channels.fetch(dadosSessao.canalDestinoId);
            
            // CONSTRUÇÃO EXCLUSIVA VIA COMPONENTS V2 (Sem Embeds Clássicos)
            // Os botões agora fazem parte integrante e direta da árvore do container
            const containerMensagem = new ContainerBuilder()
                .setTitle(titulo)
                .setColor('#2b2d31');

            containerMensagem.addComponents(
                new TextDisplayBuilder().setText(texto),
                new SeparatorBuilder(),
                // O botão de link é inserido DIRETAMENTE no layout do container moderno
                new ButtonBuilder()
                    .setLabel(btnTexto)
                    .setStyle(ButtonStyle.Link)
                    .setURL(btnUrl)
            );

            // Envia o container V2 diretamente para o canal alvo
            await canalAlvo.send({ components: [containerMensagem] });
            
            // Limpa a sessão da memória
            sessoesAdmin.delete(interaction.user.id);

            await interaction.reply({ content: `✅ Mensagem enviada com sucesso utilizando a interface moderna em <#${dadosSessao.canalDestinoId}>!`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '❌ Falha ao enviar. Verifique se o link possui http:// ou https:// e tente novamente.', ephemeral: true });
        }
    }
});

client.login(TOKEN);
