const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;

        // Dupla validação de segurança
        if (interaction.isButton() || interaction.isModalSubmit()) {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '❌ Apenas administradores podem interagir com este painel.', ephemeral: true });
            }
        }

        // --- INTERAÇÕES DOS BOTÕES ---
        if (interaction.isButton()) {
            if (interaction.customId === 'btn_enviar_msg') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_enviar_msg')
                    .setTitle('Enviar Mensagem Personalizada');

                const canalInput = new TextInputBuilder()
                    .setCustomId('msg_canal_id')
                    .setLabel('ID do Canal de Destino')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Cole aqui o ID do canal')
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
            }
        }

        // --- PROCESSAMENTO DOS FORMULÁRIOS ENVIADOS (MODALS) ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_enviar_msg') {
                const canalId = interaction.fields.getTextInputValue('msg_canal_id');
                const titulo = interaction.fields.getTextInputValue('msg_titulo');
                const texto = interaction.fields.getTextInputValue('msg_texto');

                try {
                    const canalTarget = await client.channels.fetch(canalId);
                    if (!canalTarget || !canalTarget.isTextBased()) {
                        return interaction.reply({ content: '❌ Canal de texto inválido.', ephemeral: true });
                    }

                    const embedEnvio = new EmbedBuilder()
                        .setTitle(titulo)
                        .setDescription(texto)
                        .setColor('#00ff7f')
                        .setTimestamp();

                    await canalTarget.send({ embeds: [embedEnvio] });
                    await interaction.reply({ content: `✅ Mensagem enviada para <#${canalId}>!`, ephemeral: true });
                
                } catch (error) {
                    await interaction.reply({ content: '❌ Falha ao enviar. Verifique as permissões.', ephemeral: true });
                }
            }

            if (interaction.customId === 'modal_config_limpeza') {
                const novoId = interaction.fields.getTextInputValue('novo_canal_id');
                
                // Atualiza a variável global salva dentro do próprio client
                client.canalLimpezaId = novoId; 
                
                await interaction.reply({ content: `✅ Configuração atualizada! Monitorando <#${novoId}>. \n⚠️ *Nota: Se o container reiniciar, voltará ao ID padrão do .env.*`, ephemeral: true });
            }
        }
    },
};
