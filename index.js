const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Necessário para contar os membros do servidor
    ],
});

const TOKEN = process.env.DISCORD_TOKEN;
let canalLimpezaId = process.env.CANAL_ID;

// Contadores em memória para preencher o painel e não deixá-lo vazio
let mensagensApagadasTotal = 0;
const botStartTime = Date.now();

client.once('ready', () => {
    console.log(`✅ Bot de limpeza automática ativo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // =========================================================================
    // 1. COMANDO DO PAINEL ADMINISTRATIVO PROFISSIONAL
    // =========================================================================
    if (message.content === '!painel') {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Você não tem permissão para usar este comando.')
                .then(msg => setTimeout(() => msg.delete(), 5000));
        }

        // Cálculo de Uptime (Tempo online)
        const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
        const horas = Math.floor(totalUptimeSeconds / 3600);
        const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

        // Criando um Embed bem preenchido para o Painel não ficar vazio
        const embedPainel = new EmbedBuilder()
            .setTitle('⚙️ SISTEMA DE GERENCIAMENTO E CONTROLE')
            .setDescription('Gerencie as funções de envio do bot e acompanhe as estatísticas do sistema em tempo real através dos botões abaixo.')
            .setColor('#2b2d31') // Cor escura padrão e elegante
            .addFields(
                { name: '🧹 Canal de Limpeza Ativo:', value: canalLimpezaId ? `<#${canalLimpezaId}>` : '*Nenhum configurado*', inline: false },
                { name: '📊 Total de Mensagens Apagadas:', value: `\`${mensagensApagadasTotal}\` mensagens`, inline: true },
                { name: '👥 Total de Membros:', value: `\`${message.guild.memberCount}\` usuários`, inline: true },
                { name: '⚡ Latência (Ping):', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '⏱️ Tempo Online:', value: `\`${horas}h ${minutos}m\``, inline: true }
            )
            .setFooter({ text: 'Painel Restrito • Desenvolvido para Administração', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        // Organizando os botões em duas fileiras (Rows) para preencher o visual
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_msg_simples')
                .setLabel('📩 Enviar Embed Simples')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('btn_msg_botao')
                .setLabel('🎛️ Enviar Embed + Botão Link')
                .setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_config_limpeza')
                .setLabel('🔧 Alterar Canal Limpeza')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('btn_atualizar_painel')
                .setLabel('🔄 Atualizar Estatísticas')
                .setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embedPainel], components: [row1, row2] });
        
        try { await message.delete(); } catch (err) {}
        return;
    }

    // =========================================================================
    // 2. MONITORAMENTO DE LIMPEZA (MANTIDO EXATAMENTE COMO VOCÊ QUER)
    // =========================================================================
    if (canalLimpezaId && message.channel.id === canalLimpezaId) {
        if (message.pinned) return;

        setTimeout(async () => {
            try {
                await message.delete();
                mensagensApagadasTotal++; // Aumenta o contador para expor no painel
                console.log(`Mensagem de ${message.author.tag} removida automaticamente.`);
            } catch (err) {
                console.error("Erro ao apagar mensagem individual:", err);
            }
        }, 1000); // Mantido o seu delay de 1 segundo
    }
});

// =========================================================================
// 3. TRATAMENTO DE BOTÕES E FORMULÁRIOS (INTERACTIONS)
// =========================================================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // Verificação de segurança
    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ Apenas administradores podem usar estes botões.', ephemeral: true });
    }

    // --- AÇÃO DOS BOTÕES ---
    if (interaction.isButton()) {

        // Botão: Atualizar Painel (Edita a mensagem do painel com os dados novos)
        if (interaction.customId === 'btn_atualizar_painel') {
            const totalUptimeSeconds = Math.floor((Date.now() - botStartTime) / 1000);
            const horas = Math.floor(totalUptimeSeconds / 3600);
            const minutos = Math.floor((totalUptimeSeconds % 3600) / 60);

            const embedEditado = new EmbedBuilder()
                .setTitle('⚙️ SISTEMA DE GERENCIAMENTO E CONTROLE')
                .setDescription('Gerencie as funções de envio do bot e acompanhe as estatísticas do sistema em tempo real através dos botões abaixo.')
                .setColor('#2b2d31')
                .addFields(
                    { name: '🧹 Canal de Limpeza Ativo:', value: canalLimpezaId ? `<#${canalLimpezaId}>` : '*Nenhum configurado*', inline: false },
                    { name: '📊 Total de Mensagens Apagadas:', value: `\`${mensagensApagadasTotal}\` mensagens`, inline: true },
                    { name: '👥 Total de Membros:', value: `\`${interaction.guild.memberCount}\` usuários`, inline: true },
                    { name: '⚡ Latência (Ping):', value: `\`${client.ws.ping}ms\``, inline: true },
                    { name: '⏱️ Tempo Online:', value: `\`${horas}h ${minutos}m\``, inline: true }
                )
                .setFooter({ text: 'Painel Restrito • Estatísticas Atualizadas', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.update({ embeds: [embedEditado] });
        }

        // Botão: Enviar Embed Simples
        if (interaction.customId === 'btn_msg_simples') {
            const modal = new ModalBuilder().setCustomId('modal_msg_simples').setTitle('Enviar Embed Simples');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_canal').setLabel('ID do Canal').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_titulo').setLabel('Título do Embed').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_texto').setLabel('Conteúdo/Texto').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_cor').setLabel('Cor em Hex (Ex: #00ff00)').setStyle(TextInputStyle.Short).setValue('#2b2d31').setRequired(false))
            );
            await interaction.showModal(modal);
        }

        // Botão: Enviar Embed com Botão de Link (Ideal para Bio, Lojas, etc)
        if (interaction.customId === 'btn_msg_botao') {
            const modal = new ModalBuilder().setCustomId('modal_msg_botao').setTitle('Embed com Botão Interativo');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_canal').setLabel('ID do Canal de Destino').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_titulo').setLabel('Título do Embed').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_texto').setLabel('Conteúdo do Embed').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_btn_texto').setLabel('Texto do Botão').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Clique Aqui para Comprar').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_btn_url').setLabel('Link (URL) do Botão').setStyle(TextInputStyle.Short).setPlaceholder('https://...').setRequired(true))
            );
            await interaction.showModal(modal);
        }

        // Botão: Alterar Canal de Limpeza
        if (interaction.customId === 'btn_config_limpeza') {
            const modal = new ModalBuilder().setCustomId('modal_config_limpeza').setTitle('Configurar Canal de Limpeza');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('novo_canal_id').setLabel('Novo ID do Canal de Limpeza').setStyle(TextInputStyle.Short).setValue(canalLimpezaId || '').setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }

    // --- PROCESSAMENTO DOS FORMULÁRIOS (MODALS) ---
    if (interaction.isModalSubmit()) {

        // Resposta: Embed Simples
        if (interaction.customId === 'modal_msg_simples') {
            const canalId = interaction.fields.getTextInputValue('s_canal');
            const titulo = interaction.fields.getTextInputValue('s_titulo');
            const texto = interaction.fields.getTextInputValue('s_texto');
            let cor = interaction.fields.getTextInputValue('s_cor') || '#2b2d31';

            try {
                const canal = await client.channels.fetch(canalId);
                const embed = new EmbedBuilder().setTitle(titulo).setDescription(texto).setColor(cor.startsWith('#') ? cor : `#${cor}`).setTimestamp();
                
                await canal.send({ embeds: [embed] });
                await interaction.reply({ content: `✅ Embed simples enviado com sucesso em <#${canalId}>!`, ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ Erro ao enviar. Verifique se o ID do canal ou a cor em Hex estão corretos.', ephemeral: true });
            }
        }

        // Resposta: Embed com Botão Integrado (V2 Components)
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
                    .setColor('#2b2d31')
                    .setTimestamp();

                // Componente V2: Criando o botão interativo de Link externo
                const rowBotao = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(btnTexto)
                        .setStyle(ButtonStyle.Link)
                        .setURL(btnUrl)
                );

                await canal.send({ embeds: [embed], components: [rowBotao] });
                await interaction.reply({ content: `✅ Embed com botão enviado com sucesso em <#${canalId}>!`, ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ Erro ao enviar. Certifique-se de que o Link inserido começa com `https://` ou `http://` e que o ID do canal esteja correto.', ephemeral: true });
            }
        }

        // Resposta: Alterar canal de limpeza
        if (interaction.customId === 'modal_config_limpeza') {
            canalLimpezaId = interaction.fields.getTextInputValue('novo_canal_id');
            await interaction.reply({ content: `✅ O canal de limpeza foi reconfigurado para: <#${canalLimpezaId}>`, ephemeral: true });
        }
    }
});

client.login(TOKEN);
