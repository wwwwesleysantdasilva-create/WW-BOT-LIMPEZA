const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;

        // Validação de segurança para Administradores
        if (interaction.isChatInputCommand() || interaction.isButton() || interaction.isModalSubmit()) {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '❌ Apenas administradores com a permissão "Administrador" podem usar estas funções.', ephemeral: true });
            }
        }

        // =========================================================================
        // 1. CAPTURA E REDESIGN DO COMANDO SLASH (/painel)
        // =========================================================================
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'painel') {
                
                // Criando um visual muito mais limpo e profissional
                const embedPainel = new EmbedBuilder()
                    .setTitle('⚡ WW BOT MOD · Central Administrativa')
                    .setDescription('Seja bem-vindo ao painel de controle principal. Use os botões abaixo para gerenciar as funções do servidor em tempo real.')
                    .setColor('#5865f2') // Cor oficial do Discord (Blurple) para um ar premium
                    .addFields(
                        { name: '🛰️ Status do Bot', value: '🟢 `Operacional`', inline: true },
                        { name: '⚙️ Permissão', value: '🛡️ `Admin`', inline: true },
                        { name: '🧹 Canal de Limpeza Ativo', value: client.canalLimpezaId ? `🟢 <#${client.canalLimpezaId}>` : '❌ `Nenhum configurado`', inline: false }
                    )
                    .setFooter({ text: `WW BOT • Soluções Avançadas`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();

                // Customizando os botões com novas cores (Styles) e emojis melhores
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_enviar_msg')
                        .setLabel('Enviar Mensagem')
                        .setEmoji('📢')
                        .setStyle(ButtonStyle.Success), // Botão Verde (Sucesso)
                    new ButtonBuilder()
                        .setCustomId('btn_config_limpeza')
                        .setLabel('Configurar Chat')
                        .setEmoji('⚙️')
                        .setStyle(ButtonStyle.Primary) // Botão Azul (Principal)
                );

                await interaction.reply({ embeds: [embedPainel], components: [row] });
                return;
            }
        }

        // =========================================================================
        // 2. INTERAÇÕES DOS BOTÕES (Mantido IDs originais para não quebrar nada)
        // =========================================================================
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

        // =========================================================================
        // 3. PROCESSAMENTO DOS FORMULÁRIOS (MODALS)
        // =========================================================================
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
                client.canalLimpezaId = novoId; 
                
                await interaction.reply({ content: `✅ Configuração atualizada! Monitorando <#${novoId}>. \n⚠️ *Nota: Se o container reiniciar, voltará ao ID padrão do .env.*`, ephemeral: true });
            }
        }
    },
};
