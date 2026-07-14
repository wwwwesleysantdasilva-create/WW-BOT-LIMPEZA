const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder
} = require('discord.js');

// Função auxiliar para renderizar o Painel de Configurações do Anúncio (Baseado no seu layout)
function gerarPainelAnuncio(config) {
    const embedWizard = new EmbedBuilder()
        .setTitle('⚠️ Configuração de Anúncio')
        .setDescription(`Você está criando um anúncio para o canal <#${config.canalId}>.\n\nUse os menus abaixo para configurar seu anúncio:\n• Selecione o tipo de anúncio\n• Edite o conteúdo do anúncio\n• Configure detalhes visuais\n• Adicione botões (opcional)\n• Visualize antes de enviar\n\n⚠️ **Observação:** Este anúncio expirará se o container for reiniciado.`)
        .setColor(config.cor || '#2b2d31')
        .addFields(
            { name: '📋 Tipo selecionado:', value: `\`${config.tipo === 'embed' ? 'Embed (Com Caixa)' : 'Texto Puro (Container V2)'}\``, inline: true },
            { name: '🎨 Cor do Embed:', value: `\`${config.cor}\``, inline: true },
            { name: '🔗 Botão Adicional:', value: config.botaoLabel ? `🟢 \`${config.botaoLabel}\`` : '❌ `Nenhum`', inline: true }
        )
        .setFooter({ text: 'WW SENSI IOS #4K' })
        .setTimestamp();

    // Menu Dropdown para Escolha do Tipo (Embed ou Texto Puro)
    const rowDropdown = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('anuncio_tipo')
            .setPlaceholder('Selecione o tipo de anúncio...')
            .addOptions([
                { label: 'Texto Puro (Sem bordas/cores)', value: 'texto', default: config.tipo === 'texto' },
                { label: 'Embed (Com caixa/cor)', value: 'embed', default: config.tipo === 'embed' }
            ])
    );

    // Linha de Botões 1: Configurações do Conteúdo
    const rowBotoes1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_anuncio_conteudo')
            .setLabel('Editar Conteúdo')
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('btn_anuncio_visuais')
            .setLabel('Configurações Visuais')
            .setEmoji('🎨')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(config.tipo !== 'embed'), // Desativado se for texto puro
        new ButtonBuilder()
            .setCustomId('btn_anuncio_botao')
            .setLabel('Adicionar Botão')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Secondary)
    );

    // Linha de Botões 2: Ações de Envio e Visualização
    const rowBotoes2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_anuncio_visualizar')
            .setLabel('Visualizar')
            .setEmoji('👁️')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('btn_anuncio_enviar')
            .setLabel('Enviar Anúncio')
            .setEmoji('🚀')
            .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embedWizard], components: [rowDropdown, rowBotoes1, rowBotoes2], ephemeral: true };
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;

        // Validação de segurança para Administradores
        if (
            interaction.isChatInputCommand() || 
            interaction.isButton() || 
            interaction.isModalSubmit() || 
            interaction.isChannelSelectMenu() ||
            interaction.isStringSelectMenu()
        ) {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '❌ Apenas administradores com a permissão "Administrador" podem usar estas funções.', ephemeral: true });
            }
        }

        // =========================================================================
        // 1. CAPTURA DO COMANDO SLASH (/painel) - TOTALMENTE INTACTO
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
        // 2. INTERAÇÕES DOS BOTÕES PRINCIPAIS E DO ASSISTENTE
        // =========================================================================
        if (interaction.isButton()) {
            
            // Ativa o seletor de canais nativo
            if (interaction.customId === 'btn_enviar_msg') {
                const selectCanal = new ChannelSelectMenuBuilder()
                    .setCustomId('select_canal_msg')
                    .setPlaceholder('Selecione o canal de destino...')
                    .addChannelTypes([ChannelType.GuildText]);

                const rowSelect = new ActionRowBuilder().addComponents(selectCanal);

                await interaction.reply({
                    content: '👉 **Selecione abaixo o canal que vai receber a mensagem:**',
                    components: [rowSelect],
                    ephemeral: true
                });
                return;
            }

            // Abre o painel do assistente para editar título e descrição
            if (interaction.customId === 'btn_anuncio_conteudo') {
                const config = client.anuncios?.[interaction.user.id];
                if (!config) return interaction.reply({ content: '❌ Sessão expirada. Crie o painel novamente.', ephemeral: true });

                const modal = new ModalBuilder()
                    .setCustomId('modal_anuncio_conteudo')
                    .setTitle('Editar Conteúdo do Anúncio');

                const tituloInput = new TextInputBuilder()
                    .setCustomId('anuncio_titulo')
                    .setLabel('Título do Embed (Opcional para texto puro)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(config.titulo || '')
                    .setRequired(false);

                const textoInput = new TextInputBuilder()
                    .setCustomId('anuncio_texto')
                    .setLabel('Corpo da Mensagem / Conteúdo')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(config.conteudo || '')
                    .setPlaceholder('Digite aqui a mensagem...')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(tituloInput),
                    new ActionRowBuilder().addComponents(textoInput)
                );
                await interaction.showModal(modal);
                return;
            }

            // Abre o modal para definir a cor do Embed
            if (interaction.customId === 'btn_anuncio_visuais') {
                const config = client.anuncios?.[interaction.user.id];
                const modal = new ModalBuilder().setCustomId('modal_anuncio_visuais').setTitle('Configurações Visuais');
                
                const corInput = new TextInputBuilder()
                    .setCustomId('anuncio_cor')
                    .setLabel('Cor Hexadecimal (Ex: #5865f2)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(config?.cor || '#2b2d31')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(corInput));
                await interaction.showModal(modal);
                return;
            }

            // Abre o modal para acoplar um botão de link externo
            if (interaction.customId === 'btn_anuncio_botao') {
                const config = client.anuncios?.[interaction.user.id];
                const modal = new ModalBuilder().setCustomId('modal_anuncio_botao').setTitle('Adicionar Botão de Link');

                const labelInput = new TextInputBuilder()
                    .setCustomId('anuncio_btn_label')
                    .setLabel('Texto do Botão')
                    .setStyle(TextInputStyle.Short)
                    .setValue(config?.botaoLabel || '')
                    .setPlaceholder('Ex: Adquirir Sensi')
                    .setRequired(true);

                const urlInput = new TextInputBuilder()
                    .setCustomId('anuncio_btn_url')
                    .setLabel('Link de Destino (URL Completa)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(config?.botaoUrl || '')
                    .setPlaceholder('https://...')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(labelInput),
                    new ActionRowBuilder().addComponents(urlInput)
                );
                await interaction.showModal(modal);
                return;
            }

            // Envia uma pre-visualização privada idêntica a como o chat receberá
            if (interaction.customId === 'btn_anuncio_visualizar') {
                const config = client.anuncios?.[interaction.user.id];
                if (!config) return interaction.reply({ content: '❌ Sessão não localizada.', ephemeral: true });

                const payload = { content: '', embeds: [], components: [], ephemeral: true };

                if (config.tipo === 'embed') {
                    const embedPrv = new EmbedBuilder().setDescription(config.conteudo || '*Sem conteúdo preenchido*').setColor(config.cor);
                    if (config.titulo) embedPrv.setTitle(config.titulo);
                    payload.embeds.push(embedPrv);
                } else {
                    payload.content = config.conteudo || '*Sem conteúdo preenchido*';
                }

                if (config.botaoLabel && config.botaoUrl) {
                    const rowBtn = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setLabel(config.botaoLabel).setUrl(config.botaoUrl).setStyle(ButtonStyle.Link)
                    );
                    payload.components.push(rowBtn);
                }

                await interaction.reply(payload);
                return;
            }

            // Faz o disparo definitivo para o canal selecionado
            if (interaction.customId === 'btn_anuncio_enviar') {
                const config = client.anuncios?.[interaction.user.id];
                if (!config || !config.conteudo) {
                    return interaction.reply({ content: '❌ Você precisa preencher o conteúdo da mensagem antes de enviar!', ephemeral: true });
                }

                try {
                    const canalTarget = await client.channels.fetch(config.canalId);
                    const finalPayload = { content: '', embeds: [], components: [] };

                    if (config.tipo === 'embed') {
                        const embedEnvio = new EmbedBuilder().setDescription(config.conteudo).setColor(config.cor);
                        if (config.titulo) embedEnvio.setTitle(config.titulo);
                        finalPayload.embeds.push(embedEnvio);
                    } else {
                        finalPayload.content = config.conteudo;
                    }

                    if (config.botaoLabel && config.botaoUrl) {
                        const rowBtn = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setLabel(config.botaoLabel).setUrl(config.botaoUrl).setStyle(ButtonStyle.Link)
                        );
                        finalPayload.components.push(rowBtn);
                    }

                    await canalTarget.send(finalPayload);
                    delete client.anuncios[interaction.user.id]; // Limpa o rascunho da memória

                    await interaction.reply({ content: `🚀 Anúncio enviado com sucesso para <#${config.canalId}>!`, ephemeral: true });
                } catch (err) {
                    await interaction.reply({ content: '❌ Erro ao enviar. Verifique se o bot tem acesso de escrita no canal.', ephemeral: true });
                }
                return;
            }

            // Mantido funcionalidade original do botão de chat intacto
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
        // 3. CAPTURA DA ESCOLHA DO CANAL -> ATIVA O ASSISTENTE DO ANÚNCIO
        // =========================================================================
        if (interaction.isChannelSelectMenu()) {
            if (interaction.customId === 'select_canal_msg') {
                
                // Instancia o rascunho temporário do anúncio para o usuário
                client.anuncios = client.anuncios || {};
                client.anuncios[interaction.user.id] = {
                    canalId: interaction.values[0],
                    tipo: 'texto', // Padrão: Texto Puro (Conforme seu pedido de Container v2)
                    conteudo: '',
                    titulo: '',
                    cor: '#2b2d31',
                    botaoLabel: '',
                    botaoUrl: ''
                };

                // Transforma a mensagem atual no lindo painel de etapas
                await interaction.update(gerarPainelAnuncio(client.anuncios[interaction.user.id]));
                return;
            }
        }

        // =========================================================================
        // 4. CAPTURA DA MUDANÇA DE TIPO (DROPDOWN EMBED VS TEXTO PURO)
        // =========================================================================
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'anuncio_tipo') {
                const config = client.anuncios?.[interaction.user.id];
                if (!config) return interaction.reply({ content: '❌ Sessão não encontrada.', ephemeral: true });

                config.tipo = interaction.values[0];
                await interaction.update(gerarPainelAnuncio(config));
                return;
            }
        }

        // =========================================================================
        // 5. PROCESSAMENTO DE TODOS OS FORMULÁRIOS (MODALS)
        // =========================================================================
        if (interaction.isModalSubmit()) {
            
            // Salva o título e conteúdo e atualiza o painel
            if (interaction.customId === 'modal_anuncio_conteudo') {
                const config = client.anuncios?.[interaction.user.id];
                if (!config) return interaction.reply({ content: '❌ Erro de sessão.', ephemeral: true });

                config.titulo = interaction.fields.getTextInputValue('anuncio_titulo');
                config.conteudo = interaction.fields.getTextInputValue('anuncio_texto');

                await interaction.update(gerarPainelAnuncio(config));
                return;
            }

            // Salva a nova cor do Embed e atualiza o painel
            if (interaction.customId === 'modal_anuncio_visuais') {
                const config = client.anuncios?.[interaction.user.id];
                if (!config) return interaction.reply({ content: '❌ Erro de sessão.', ephemeral: true });

                let corInserida = interaction.fields.getTextInputValue('anuncio_cor');
                if (!corInserida.startsWith('#')) corInserida = '#' + corInserida;
                config.cor = corInserida;

                await interaction.update(gerarPainelAnuncio(config));
                return;
            }

            // Salva os dados do botão interativo e atualiza o painel
            if (interaction.customId === 'modal_anuncio_botao') {
                const config = client.anuncios?.[interaction.user.id];
                if (!config) return interaction.reply({ content: '❌ Erro de sessão.', ephemeral: true });

                config.botaoLabel = interaction.fields.getTextInputValue('anuncio_btn_label');
                config.botaoUrl = interaction.fields.getTextInputValue('anuncio_btn_url');

                await interaction.update(gerarPainelAnuncio(config));
                return;
            }

            // Mantido intacto a configuração original da limpeza automática
            if (interaction.customId === 'modal_config_limpeza') {
                const novoId = interaction.fields.getTextInputValue('novo_canal_id');
                client.canalLimpezaId = novoId; 
                
                await interaction.reply({ content: `✅ Configuração atualizada! Monitorando <#${novoId}>. \n⚠️ *Nota: Se o container reiniciar, voltará ao ID padrão do .env.*`, ephemeral: true });
                return;
            }
        }
    },
};
