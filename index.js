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
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

const botStartTime = Date.now();

// ⚙️ CONFIGURAÇÕES PRINCIPAIS
const ID_CANAL_LIMPEZA = process.env.CANAL_ID || 'COLOQUE_O_ID_DO_CANAL_AQUI'; 
const TOKEN = process.env.TOKEN;

// Memória temporária para guardar o rascunho de quem está montando a mensagem
const rascunhos = new Map();

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
        console.log('✅ [SLASH COMMANDS] Comando /painel foi sincronizado!');
    } catch (error) {
        console.error('❌ [ERRO] Falha crítica ao registrar o comando:', error);
    }
});

// =========================================================================
// 1. SISTEMA DE LIMPEZA AUTOMÁTICA COM AVISO EPHEMERAL
// =========================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; 

    if (message.channel.id === ID_CANAL_LIMPEZA) {
        try {
            await message.delete();
            
            // Envia o aviso secreto que só a pessoa que digitou consegue ver e some após alguns segundos
            const flagEphemeral = MessageFlags?.Ephemeral ?? 64;
            await message.channel.send({
                content: `💬 **Olá! Aqui é apenas um canal de guia, você não pode conversar aqui.**`,
                flags: [flagEphemeral]
            });
            
            console.log(`🧹 [LIMPEZA] Mensagem de ${message.author.tag} apagada instantaneamente.`);
        } catch (error) {
            console.error('❌ [ERRO] Não foi possível apagar a mensagem:', error.message);
        }
    }
});

// =========================================================================
// 2. INTERAÇÕES (PAINEL, MENUS, BOTÕES E MODAIS)
// =========================================================================
client.on('interactionCreate', async (interaction) => {
    const flagEphemeral = MessageFlags?.Ephemeral ?? 64;
    const flagComponentsV2 = MessageFlags?.IsComponentsV2 ?? 32768;

    // --- COMANDO /PAINEL ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Permissão negada.', flags: [flagEphemeral] });
        }

        const painelCompleto = gerarPainelLayoutV2(interaction.guild);
        return interaction.reply({ 
            components: [painelCompleto], 
            flags: [flagEphemeral, flagComponentsV2]
        });
    }

    // --- MENUS DE SELEÇÃO (DROPDOWN) ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'painel_selecao') {
            const formatoEscolhido = interaction.values[0];
            
            // Inicia o rascunho do usuário na memória
            rascunhos.set(interaction.user.id, { formato: formatoEscolhido });

            // Abre o formulário completo baseado na escolha
            const modal = new ModalBuilder()
                .setCustomId('modal_dados_mensagem')
                .setTitle('Configurar Mensagem');

            const campoCanal = new TextInputBuilder().setCustomId('m_canal').setLabel('ID do Canal de Destino').setStyle(TextInputStyle.Short).setRequired(true);
            const campoTexto = new TextInputBuilder().setCustomId('m_texto').setLabel('Texto / Conteúdo Principal').setStyle(TextInputStyle.Paragraph).setRequired(true);
            const campoBtnNome = new TextInputBuilder().setCustomId('m_btn_nome').setLabel('Texto do Botão').setStyle(TextInputStyle.Short).setRequired(true);
            const campoBtnUrl = new TextInputBuilder().setCustomId('m_btn_url').setLabel('Link (URL) do Botão').setStyle(TextInputStyle.Short).setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(campoCanal),
                new ActionRowBuilder().addComponents(campoTexto),
                new ActionRowBuilder().addComponents(campoBtnNome),
                new ActionRowBuilder().addComponents(campoBtnUrl)
            );

            // Se escolheu Mensagem Comum + Foto, ou Embed, pede o link da imagem/título
            if (formatoEscolhido === 'msg_foto' || formatoEscolhido === 'embed') {
                const campoExtra = new TextInputBuilder()
                    .setCustomId('m_extra')
                    .setLabel(formatoEscolhido === 'msg_foto' ? 'Link da Foto (URL)' : 'Título do Embed')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(campoExtra));
            }

            return interaction.showModal(modal);
        }
    }

    // --- RECEBIMENTO DOS DADOS DO FORMULÁRIO (MODAL) ---
    if (interaction.isModalSubmit() && interaction.customId === 'modal_dados_mensagem') {
        const rascunho = rascunhos.get(interaction.user.id);
        if (!rascunho) return interaction.reply({ content: '❌ Sessão expirada. Abra o /painel novamente.', flags: [flagEphemeral] });

        // Coleta as respostas do formulário
        rascunho.canalId = interaction.fields.getTextInputValue('m_canal');
        rascunho.texto = interaction.fields.getTextInputValue('m_texto');
        rascunho.btnNome = interaction.fields.getTextInputValue('m_btn_nome');
        rascunho.btnUrl = interaction.fields.getTextInputValue('m_btn_url');
        
        try {
            rascunho.extra = interaction.fields.getTextInputValue('m_extra');
        } catch {
            rascunho.extra = null;
        }

        // Gera o menu de revisão com o botão de PRÉVIA e ENVIAR
        const containerRevisao = new ContainerBuilder().setAccentColor(0x2b2d31);
        const txtInfo = new TextDisplayBuilder().setContent(`# 🗒️ RASCUNHO CONCLUÍDO\nSeu layout está pronto. Escolha uma das ações abaixo para testar ou enviar.`);
        containerRevisao.addTextDisplayComponents(txtInfo);

        const btnPrevia = new ButtonBuilder().setCustomId('btn_ver_previa').setLabel('Ver Prévia (Só você)').setStyle(ButtonStyle.Secondary).setEmoji('🖲️');
        const btnEnviar = new ButtonBuilder().setCustomId('btn_enviar_definitivo').setLabel('Enviar Mensagem').setStyle(ButtonStyle.Success).setEmoji('📥');
        
        const rowAcoes = new ActionRowBuilder().addComponents(btnPrevia, btnEnviar);
        containerRevisao.addActionRowComponents(rowAcoes);

        return interaction.reply({
            content: '✅ Informações salvas com sucesso!',
            components: [containerRevisao],
            flags: [flagEphemeral, flagComponentsV2]
        });
    }

    // --- CAPTURA DOS BOTÕES DE AÇÃO (PRÉVIA E ENVIAR) ---
    if (interaction.isButton()) {
        const rascunho = rascunhos.get(interaction.user.id);

        if (interaction.customId === 'btn_atualizar_painel') {
            const painelEditado = gerarPainelLayoutV2(interaction.guild);
            return interaction.update({ components: [painelEditado], flags: [flagEphemeral, flagComponentsV2] });
        }

        if (!rascunho) {
            if (interaction.customId === 'btn_ver_previa' || interaction.customId === 'btn_enviar_definitivo') {
                return interaction.reply({ content: '❌ Rascunho não encontrado. Monte a mensagem novamente pelo menu.', flags: [flagEphemeral] });
            }
            return;
        }

        // Construção do objeto final baseado nas escolhas dele
        const payloadFinal = construirPayloadMensagem(rascunho);

        // 👁️ AÇÃO 1: MOSTRAR PRÉVIA FUNCIONAL (Apenas para o Administrador ver)
        if (interaction.customId === 'btn_ver_previa') {
            // Clona o payload e força a flag ephemeral para garantir que só ele veja
            const payloadPrevia = { ...payloadFinal, flags: [flagEphemeral] };
            
            // Adiciona a flag de componentes novos caso seja um Container V2
            if (rascunho.formato === 'container_v2') {
                payloadPrevia.flags = [flagEphemeral, flagComponentsV2];
            }

            await interaction.reply(payloadPrevia);
            return;
        }

        // 🚀 AÇÃO 2: ENVIAR DEFINITIVO PARA O CANAL SELECIONADO
        if (interaction.customId === 'btn_enviar_definitivo') {
            try {
                const canalDestino = await client.channels.fetch(rascunho.canalId);
                if (!canalDestino) throw new Error('Canal não encontrado.');

                const payloadEnvio = { ...payloadFinal };
                if (rascunho.formato === 'container_v2') {
                    payloadEnvio.flags = [flagComponentsV2];
                }

                await canalDestino.send(payloadEnvio);
                
                // Limpa a memória para evitar sobrecarga
                rascunhos.delete(interaction.user.id);

                return interaction.reply({ content: `✅ Mensagem enviada com sucesso no canal <#${rascunhos.canalId || rascunho.canalId}>!`, flags: [flagEphemeral] });
            } catch (err) {
                return interaction.reply({ content: `❌ Falha ao enviar para o canal. Verifique se o ID está correto e se o bot tem permissão de escrita lá. Detalhes: \`${err.message}\``, flags: [flagEphemeral] });
            }
        }
    }
});

// =========================================================================
// 3. FUNÇÕES AUXILIARES DE MONTAGEM VISUAL
// =========================================================================

function gerarPainelLayoutV2(guild) {
    const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    const horas = Math.floor(totalUptimeSeconds / 3600);
    const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

    const containerPainel = new ContainerBuilder().setAccentColor(0x2b2d31); 
    const txtTitulo = new TextDisplayBuilder().setContent('# ⚙️ SISTEMA DE GERENCIAMENTO\n**Painel de Administração V2**');
    const divisor = new SeparatorBuilder();
    const txtStatus = new TextDisplayBuilder().setContent(`⚙️ **Status Geral**\n• Servidor: \`${guild?.name || 'Desconhecido'}\`\n• Tempo Online: \`${horas}h ${minutos}m\``);

    containerPainel.addTextDisplayComponents(txtTitulo).addSeparatorComponents(divisor).addTextDisplayComponents(txtStatus);

    const menuSelecao = new StringSelectMenuBuilder()
        .setCustomId('painel_selecao')
        .setPlaceholder('Escolha o formato da mensagem que deseja enviar...')
        .addOptions([
            { label: 'Mensagem Comum + Foto', value: 'msg_foto', description: 'Texto limpo no chat acompanhado de uma foto e botão.' },
            { label: 'Mensagem em Embed', value: 'embed', description: 'Formato clássico em caixa estilizada com bordinha e botão.' },
            { label: 'Mensagem em Contêiner V2', value: 'container_v2', description: 'Visual moderno completo em bloco de Contêiner.' }
        ]);

    const btnRecarregar = new ButtonBuilder().setCustomId('btn_atualizar_painel').setLabel('Atualizar Painel').setStyle(ButtonStyle.Secondary).setEmoji('🖲️');
    
    const rowMenu = new ActionRowBuilder().addComponents(menuSelecao);
    const rowBotoes = new ActionRowBuilder().addComponents(btnRecarregar);

    containerPainel.addActionRowComponents(rowMenu, rowBotoes);
    return containerPainel;
}

// Fábrica estrutural para organizar onde o botão vai anexado
function construirPayloadMensagem(rascunho) {
    const botaoLink = new ButtonBuilder()
        .setLabel(rascunho.btnNome)
        .setStyle(ButtonStyle.Link)
        .setURL(rascunho.btnUrl);

    // Construtor condicional de formatos
    switch (rascunho.formato) {
        case 'msg_foto':
            const rowComum = new ActionRowBuilder().addComponents(botaoLink);
            return {
                content: `${rascunho.texto}\n\n${rascunho.extra}`, // Texto + URL da foto para o Discord anexar nativamente
                components: [rowComum]
            };

        case 'embed':
            const embed = new EmbedBuilder()
                .setTitle(rascunho.extra) // O título coletado no campo extra
                .setDescription(rascunho.texto)
                .setColor('#2b2d31');
            const rowEmbed = new ActionRowBuilder().addComponents(botaoLink);
            return {
                embeds: [embed],
                components: [rowEmbed]
            };

        case 'container_v2':
            // O botão precisa obrigatoriamente estar estruturado dentro do rodapé do Contêiner
            const containerV2 = new ContainerBuilder().setAccentColor(0x2b2d31);
            const displayTexto = new TextDisplayBuilder().setContent(rascunho.texto);
            containerV2.addTextDisplayComponents(displayTexto);

            const rowContainer = new ActionRowBuilder().addComponents(botaoLink);
            containerV2.addActionRowComponents(rowContainer);
            return {
                components: [containerV2]
            };

        default:
            return { content: rascunho.texto };
    }
}

client.login(TOKEN);
