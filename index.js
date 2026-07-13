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
    ],
});

const TOKEN = process.env.DISCORD_TOKEN;

// Mudamos para 'let' para que o ID possa ser alterado em tempo real pelo painel administrativo
let canalLimpezaId = process.env.CANAL_ID;

client.once('ready', () => {
    console.log(`✅ Bot de limpeza e gerenciamento ativo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // Ignora mensagens de outros bots para evitar loops
    if (message.author.bot) return;

    // =========================================================================
    // 1. COMANDO DO PAINEL ADMINISTRATIVO
    // =========================================================================
    if (message.content === '!painel') {
        // Segurança: Só permite que Administradores vejam/criem o painel
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Você não tem permissão para usar este comando.')
                .then(msg => setTimeout(() => msg.delete(), 5000));
        }

        // Criando um Embed elegante para o Painel
        const embedPainel = new EmbedBuilder()
            .setTitle('⚙️ Painel de Controle Administrativo')
            .setDescription('Seja bem-vindo ao centro de controle. Use os botões abaixo para gerenciar as funções do bot em tempo real.')
            .setColor('#2b2d31')
            .addFields(
                { name: '🧹 Canal de Limpeza Ativo:', value: canalLimpezaId ? `<#${canalLimpezaId}>` : '*Nenhum configurado*' }
            )
            .setFooter({ text: 'Painel restrito para Administradores.' })
            .setTimestamp();

        // Criando os botões interativos
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_enviar_msg')
                .setLabel('📩 Enviar Mensagem')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('btn_config_limpeza')
                .setLabel('🔧 Alterar Canal de Limpeza')
                .setStyle(ButtonStyle.Secondary)
        );

        // Envia o painel no chat
        await message.channel.send({ embeds: [embedPainel], components: [row] });
        
        // Apaga o comando "!painel" digitado pelo admin para manter o chat limpo
        try { await message.delete(); } catch (err) {}
        return;
    }

    // =========================================================================
    // 2. MONITORAMENTO E LIMPEZA DE CHAT
    // =========================================================================
    if (canalLimpezaId && message.channel.id === canalLimpezaId) {
        if (message.pinned) return;

        setTimeout(async () => {
            try {
                await message.delete();
                console.log(`Mensagem de ${message.author.tag} removida.`);
            } catch (err) {
                console.error("Erro ao apagar mensagem individual:", err);
            }
        }, 1000); // Mantido o delay de 1 segundo que você configurou
    }
});

// =========================================================================
// 3. TRATAMENTO DE INTERAÇÕES (BOTÕES E FORMULÁRIOS)
// =========================================================================
client.on('interactionCreate', async (interaction) => {
    // Dupla validação de segurança para impedir cliques maliciosos
    if (interaction.isButton() || interaction.isModalSubmit()) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ Apenas administradores podem interagir com este painel.', ephemeral: true });
        }
    }

    // --- INTERAÇÕES DOS BOTÕES ---
    if (interaction.isButton()) {
        
        // Clicou em "Enviar Mensagem" -> Abre um formulário (Modal)
        if (interaction.customId === 'btn_enviar_msg') {
            const modal = new ModalBuilder()
                .setCustomId('modal_enviar_msg')
                .setTitle('Enviar Mensagem Personalizada');

            const canalInput = new TextInputBuilder()
                .setCustomId('msg_canal_id')
                .setLabel('ID do Canal de Destino')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Cole aqui o ID do canal que vai receber a mensagem')
                .setRequired(true);

            const tituloInput = new TextInputBuilder()
                .setCustomId('msg_titulo')
                .setLabel('Título do Embed')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: Novidades na Loja!')
                .setRequired(true);

            const textoInput = new TextInputBuilder()
                .setCustomId('msg_texto')
                .setLabel('Conteúdo da Mensagem')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite aqui o corpo do texto...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(canalInput),
                new ActionRowBuilder().addComponents(tituloInput),
                new ActionRowBuilder().addComponents(textoInput)
            );

            await interaction.showModal(modal);
        }

        // Clicou em "Alterar Canal de Limpeza" -> Abre formulário para mudar ID
        if (interaction.customId === 'btn_config_limpeza') {
            const modal = new ModalBuilder()
                .setCustomId('modal_config_limpeza')
                .setTitle('Configurar Canal de Limpeza');

            const canalInput = new TextInputBuilder()
                .setCustomId('novo_canal_id')
                .setLabel('Novo ID do Canal de Limpeza')
                .setStyle(TextInputStyle.Short)
                .setValue(canalLimpezaId || '')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(canalInput));
            await interaction.showModal(modal);
        }
    }

    // --- PROCESSAMENTO DOS FORMULÁRIOS ENVIADOS (MODALS) ---
    if (interaction.isModalSubmit()) {
        
        // Resposta do formulário de envio de mensagens
        if (interaction.customId === 'modal_enviar_msg') {
            const canalId = interaction.fields.getTextInputValue('msg_canal_id');
            const titulo = interaction.fields.getTextInputValue('msg_titulo');
            const texto = interaction.fields.getTextInputValue('msg_texto');

            try {
                const canalTarget = await client.channels.fetch(canalId);
                if (!canalTarget || !canalTarget.isTextBased()) {
                    return interaction.reply({ content: '❌ O ID fornecido não pertence a um canal de texto válido.', ephemeral: true });
                }

                // Cria o Embed que será enviado ao chat selecionado
                const embedEnvio = new EmbedBuilder()
                    .setTitle(titulo)
                    .setDescription(texto)
                    .setColor('#00ff7f') // Tom de verde profissional
                    .setTimestamp();

                await canalTarget.send({ embeds: [embedEnvio] });
                await interaction.reply({ content: `✅ Mensagem enviada com sucesso para o canal <#${canalId}>!`, ephemeral: true });
            
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Falha ao enviar. Verifique se o ID está correto e se eu tenho a permissão "Enviar Mensagens" no canal destino.', ephemeral: true });
            }
        }

        // Resposta do formulário de alteração de canal
        if (interaction.customId === 'modal_config_limpeza') {
            const novoId = interaction.fields.getTextInputValue('novo_canal_id');
            canalLimpezaId = novoId; // Atualiza a variável global temporariamente em memória
            
            await interaction.reply({ content: `✅ Configuração atualizada! Agora estou monitorando e limpando o canal <#${novoId}>.`, ephemeral: true });
        }
    }
});

client.login(TOKEN);
