const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelSelectMenuBuilder,
    ChannelType
} = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;

        // Validação de segurança para Administradores (Adicionado o Select Menu na checagem)
        if (
            interaction.isChatInputCommand() || 
            interaction.isButton() || 
            interaction.isModalSubmit() || 
            interaction.isChannelSelectMenu()
        ) {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '❌ Apenas administradores com a permissão "Administrador" podem usar estas funções.', ephemeral: true });
            }
        }

        // =========================================================================
        // 1. CAPTURA DO COMANDO SLASH (/painel)
        // =========================================================================
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'painel') {
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_enviar_msg')
                        .setLabel('Mensagem Personalizada')
                        .setEmoji('<:emoji_35:1526555628242472991>')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('btn_config_limpeza')
                        .setLabel('Configurar Chat')
                        .setEmoji('<a:emoji_36:1526557977710956615>')
                        .setStyle(ButtonStyle.Secondary)
                );

                await interaction.reply({ 
                    content: 'https://i.postimg.cc/NMQktv5h/3E253502-A13F-4441-8D2E-E10F8B291422.jpg', 
                    components: [row],
                    ephemeral: true 
                });
                return;
            }
        }

        // =========================================================================
        // 2. INTERAÇÕES DOS BOTÕES
        // =========================================================================
        if (interaction.isButton()) {
            
            // Clicou em Mensagem Personalizada -> Abre o Dropdown de Seleção de Canal
            if (interaction.customId === 'btn_enviar_msg') {
                const selectCanal = new ChannelSelectMenuBuilder()
                    .setCustomId('select_canal_msg')
                    .setPlaceholder('Selecione o canal de destino...')
                    .addChannelTypes([ChannelType.GuildText]); // Filtra apenas canais de texto normais

                const rowSelect = new ActionRowBuilder().addComponents(selectCanal);

                await interaction.reply({
                    content: '👉 **Selecione abaixo o canal que vai receber a mensagem:**',
                    components: [rowSelect],
                    ephemeral: true
                });
                return;
            }

            if (interaction.customId === 'btn_config_limpeza') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_config_limpeza')
                    .setTitle('Configurar Canal de Limpeza');

                const canalInput = new TextInputBuilder()
                    .setCustomId('novo_canal_id')
                    .setLabel('Novo ID do Canal de Limpeza')
                    .setStyle(TextInputStyle.Short)
                    .setValue(client.canalLimpezaId || '')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(canalInput));
                await interaction.showModal(modal);
                return;
            }
        }

        // =========================================================================
        // 3. CAPTURA DO MENU SELEÇÃO DE CANAL (DROPDOWN)
        // =========================================================================
        if (interaction.isChannelSelectMenu()) {
            if (interaction.customId === 'select_canal_msg') {
                const canalId = interaction.values[0]; // Pega o ID do canal selecionado pelo Admin

                // Passamos o canalId direto no customId do Modal (Truque para não perder o ID no container)
                const modal = new ModalBuilder()
                    .setCustomId(`modal_enviar_msg_${canalId}`)
                    .setTitle('Conteúdo da Mensagem');

                // Como a mensagem é limpa, removemos o campo de "Título" e deixamos apenas o texto corrido
                const textoInput = new TextInputBuilder()
                    .setCustomId('msg_texto')
                    .setLabel('Texto da Mensagem (Suporta Emojis)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Digite aqui o texto que será enviado sem bordas ou caixas...')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(textoInput));
                
                // Abre o formulário imediatamente após escolher o canal
                await interaction.showModal(modal);
                return;
            }
        }

        // =========================================================================
        // 4. PROCESSAMENTO DOS FORMULÁRIOS (MODALS)
        // =========================================================================
        if (interaction.isModalSubmit()) {
            
            // Captura o formulário usando o prefixo dinâmico do ID
            if (interaction.customId.startsWith('modal_enviar_msg_')) {
                const canalId = interaction.customId.split('_')[3]; // Extrai o ID do canal salvo no customId
                const texto = interaction.fields.getTextInputValue('msg_texto');

                try {
                    const canalTarget = await client.channels.fetch(canalId);
                    if (!canalTarget || !canalTarget.isTextBased()) {
                        return interaction.reply({ content: '❌ Canal destino inválido.', ephemeral: true });
                    }

                    // MODO LIMPO / CONTAINER V2: Enviado sem Embed. Apenas o texto e emojis puro no chat!
                    await canalTarget.send({ content: texto });
                    
                    await interaction.reply({ content: `✅ Mensagem enviada com sucesso para o canal <#${canalId}>!`, ephemeral: true });
                
                } catch (error) {
                    console.error(error);
                    await interaction.reply({ content: '❌ Falha ao enviar. Verifique se o bot possui a permissão de "Enviar Mensagens" no canal selecionado.', ephemeral: true });
                }
                return;
            }

            if (interaction.customId === 'modal_config_limpeza') {
                const novoId = interaction.fields.getTextInputValue('novo_canal_id');
                client.canalLimpezaId = novoId; 
                
                await interaction.reply({ content: `✅ Configuração atualizada! Monitorando <#${novoId}>. \n⚠️ *Nota: Se o container reiniciar, voltará ao ID padrão do .env.*`, ephemeral: true });
                return;
            }
        }
    },
};
