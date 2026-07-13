const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionFlagsBits,
    StringSelectMenuBuilder
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Mantido para o monitoramento de limpeza
        GatewayIntentBits.GuildMembers
    ],
});

const TOKEN = process.env.DISCORD_TOKEN;
let canalLimpezaId = process.env.CANAL_ID;

let mensagensApagadasTotal = 0;
const botStartTime = Date.now();

// Função auxiliar para gerar o design do painel
function gerarEmbedPainel(guild) {
    const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    const horas = Math.floor(totalUptimeSeconds / 3600);
    const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

    return new EmbedBuilder()
        .setTitle('⚙️ SISTEMA DE GERENCIAMENTO E CONTROLE')
        .setDescription('Gerencie as funções de envio do bot e acompanhe as estatísticas do sistema em tempo real através das opções abaixo.')
        .setColor('#2b2d31')
        .addFields(
            { name: '🧹 Canal de Limpeza Ativo:', value: canalLimpezaId ? `<#${canalLimpezaId}>` : '*Nenhum configurado*', inline: false },
            { name: '📊 Total de Mensagens Apagadas:', value: `\`${mensagensApagadasTotal}\` mensagens`, inline: true },
            { name: '👥 Total de Membros:', value: `\`${guild.memberCount}\` usuários`, inline: true },
            { name: '⚡ Latência (Ping):', value: `\`${client.ws.ping || 0}ms\``, inline: true },
            { name: '⏱️ Tempo Online:', value: `\`${horas}h ${minutos}m\``, inline: true }
        )
        .setFooter({ text: 'Painel Restrito • Desenvolvido para Administração', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
}

client.once('ready', async () => {
    console.log(`✅ Bot de limpeza automática ativo como ${client.user.tag}`);

    // REGISTRO DO COMANDO /PAINEL
    try {
        await client.application.commands.set([
            {
                name: 'painel',
                description: 'Abre o painel de gerenciamento administrativo.',
                defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
            }
        ]);
        console.log('✅ Comando /painel registrado globalmente com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comando de barra:', error);
    }
});

// =========================================================================
// 1. MONITORAMENTO DE LIMPEZA
// =========================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (canalLimpezaId && message.channel.id === canalLimpezaId) {
        if (message.pinned) return;

        setTimeout(async () => {
            try {
                await message.delete();
                mensagensApagadasTotal++;
                console.log(`Mensagem de ${message.author.tag} removida automaticamente.`);
            } catch (err) {
                console.error("Erro ao apagar mensagem individual:", err);
            }
        }, 1000);
    }
});

// =========================================================================
// 2. TRATAMENTO GERAL DE INTERAÇÕES
// =========================================================================
client.on('interactionCreate', async (interaction) => {
    // Segurança: Bloqueia interações de quem não for Administrador
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Apenas administradores podem interagir com este sistema.', ephemeral: true });
    }

    // --- EXECUÇÃO DO COMANDO /PAINEL ---
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'painel') {
            const embedPainel = gerarEmbedPainel(interaction.guild);

            // Criando o Menu de Seleção simplificado apenas com as funções necessárias
            const menuSelecao = new StringSelectMenuBuilder()
                .setCustomId('menu_painel_opcoes')
                .setPlaceholder('Selecione uma ação administrativa...')
                .addOptions([
                    {
                        label: 'Enviar Mensagem',
                        description: 'Envia uma mensagem contendo embed e botão de link externo.',
                        value: 'op_enviar_mensagem',
                    },
                    {
                        label: 'Alterar Canal de Limpeza',
                        description: 'Altera dinamicamente o ID do canal que o bot limpa.',
                        value: 'op_config_limpeza',
                    }
                ]);

            // Botão cinza e sem emojis para atualizar as estatísticas do painel
            const botaoAtualizar = new ButtonBuilder()
                .setCustomId('btn_atualizar_painel')
                .setLabel('Atualizar Estatísticas')
                .setStyle(ButtonStyle.Secondary);

            const rowMenu = new ActionRowBuilder().addComponents(menuSelecao);
            const rowBotao = new ActionRowBuilder().addComponents(botaoAtualizar);

            await interaction.reply({ embeds: [embedPainel], components: [rowMenu, rowBotao] });
        }
    }

    // --- CAPTURA DE CLIQUES NO MENU DE SELEÇÃO ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'menu_painel_opcoes') {
            const opcaoSelecionada = interaction.values[0];

            // Abre o formulário focado exclusivamente na estrutura de Embed + Botão Componente
            if (opcaoSelecionada === 'op_enviar_mensagem') {
                const modal = new ModalBuilder().setCustomId('modal_msg_botao').setTitle('Enviar Mensagem com Botão');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_canal').setLabel('ID do Canal de Destino').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_titulo').setLabel('Título do Embed').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Atendimento Complexo').setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_texto').setLabel('Conteúdo do Embed').setStyle(TextInputStyle.Paragraph).setPlaceholder('Dica: Use <#ID> para marcar canais em azul').setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_btn_texto').setLabel('Texto do Botão').setStyle(TextInputStyle.Short).setPlaceholder('Ex: FAQ').setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_btn_url').setLabel('Link (URL) do Botão').setStyle(TextInputStyle.Short).setPlaceholder('https://...').setRequired(true))
                );
                await interaction.showModal(modal);
            }

            if (opcaoSelecionada === 'op_config_limpeza') {
                const modal = new ModalBuilder().setCustomId('modal_config_limpeza').setTitle('Configurar Canal de Limpeza');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('novo_canal_id').setLabel('Novo ID do Canal de Limpeza').setStyle(TextInputStyle.Short).setValue(canalLimpezaId || '').setRequired(true))
                );
                await interaction.showModal(modal);
            }
        }
    }

    // --- CAPTURA DE CLIQUES NO BOTAO CINZA ---
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_atualizar_painel') {
            const embedEditado = gerarEmbedPainel(interaction.guild);
            await interaction.update({ embeds: [embedEditado] });
        }
    }

    // --- PROCESSAMENTO DOS FORMULÁRIOS ENVIADOS ---
    if (interaction.isModalSubmit()) {
        
        // Processa e envia a mensagem utilizando estritamente componentes de botão
        if (interaction.customId === 'modal_msg_botao') {
            const canalId = interaction.fields.getTextInputValue('b_canal');
            const titulo = interaction.fields.getTextInputValue('b_titulo');
            const texto = interaction.fields.getTextInputValue('b_texto');
            const btnTexto = interaction.fields.getTextInputValue('b_btn_texto');
            const btnUrl = interaction.fields.getTextInputValue('b_btn_url');

            try {
                const canal = await client.channels.fetch(canalId);
                
                const embed = new EmbedBuilder()
                    .setTitle(titulo)
                    .setDescription(texto)
                    .setColor('#2b2d31');

                // Cria o botão de redirecionamento (o Discord formata nativamente na cor cinza)
                const rowBotao = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(btnTexto)
                        .setStyle(ButtonStyle.Link)
                        .setURL(btnUrl)
                );

                await canal.send({ embeds: [embed], components: [rowBotao] });
                await interaction.reply({ content: `✅ Mensagem enviada com sucesso em <#${canalId}>!`, ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ Erro ao enviar. Certifique-se de usar http:// ou https:// no link e que o ID do canal esteja correto.', ephemeral: true });
            }
        }

        if (interaction.customId === 'modal_config_limpeza') {
            canalLimpezaId = interaction.fields.getTextInputValue('novo_canal_id');
            await interaction.reply({ content: `✅ O canal de limpeza foi alterado com sucesso para: <#${canalLimpezaId}>`, ephemeral: true });
        }
    }
});

client.login(TOKEN);
