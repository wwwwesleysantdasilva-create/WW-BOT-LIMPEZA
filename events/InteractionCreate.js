const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder
} = require('discord.js');

// Função de renderização do painel interno do STAFF (Estilo FAQ Dropdown)
function gerarPainelAnuncio(config) {
    const embedDesign = new EmbedBuilder()
        .setTitle('⚙️ Configuração de Anúncio')
        .setDescription(`Você está montando uma mensagem para o canal <#${config.canalId}>.\n\nSelecione uma das opções no menu dropdown abaixo para editar os campos da sua mensagem de forma direta e sem erros.`)
        .setColor('#2b2d31')
        .setImage(config.banner || null)
        .addFields(
            { name: '📝 Conteúdo atual:', value: config.texto ? `🔹 ${config.texto.slice(0, 60)}...` : '❌ *Nenhum texto digitado*' },
            { name: '🔗 Botão Embutido:', value: config.botaoLabel ? `🟢 \`${config.botaoLabel}\`` : '❌ *Nenhum botão adicionado*' }
        )
        .setFooter({ text: 'WW SENSI IOS #4K • Sistema de Disparos' })
        .setTimestamp();

    const rowDropdown = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('menu_config_anuncio')
            .setPlaceholder('Escolha uma opção para editar...')
            .addOptions([
                { label: 'Editar Texto da Mensagem', description: 'Escreva ou altere o corpo do texto.', value: 'opt_texto', emoji: '📝' },
                { label: 'Definir Imagem / Banner', description: 'Insira um link de imagem para o topo.', value: 'opt_banner', emoji: '🖼️' },
                { label: 'Adicionar Botão de Link', description: 'Insira um botão clicável na mensagem.', value: 'opt_botao', emoji: '🔗' }
            ])
    );

    const rowAcoes = new ActionRowBuilder().addComponents(
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

    return { embeds: [embedDesign], components: [rowDropdown, rowAcoes], ephemeral: true };
}

// FUNÇÃO DE RECUPERAÇÃO AUTOMÁTICA (Anti-quedas do Railway)
function obterOuRecuperarConfig(interaction, client) {
    client.anuncios = client.anuncios || {};
    let config = client.anuncios[interaction.user.id];
    
    if (!config && interaction.message?.embeds?.[0]) {
        const embed = interaction.message.embeds[0];
        const canalMatch = embed.description?.match(/<#(\d+)>/);
        
        if (canalMatch) {
            const campoTexto = embed.fields?.find(f => f.name && f.name.includes('📝 Conteúdo'));
            let textoResgatado = '';
            if (campoTexto && !campoTexto.value.includes('Nenhum texto')) {
                textoResgatado = campoTexto.value.replace('🔹 ', '');
                if (textoResgatado.endsWith('...')) textoResgatado = ''; 
            }

            const campoBotao = embed.fields?.find(f => f.name && f.name.includes('🔗 Botão'));
            let botaoLabelResgatado = '';
            if (campoBotao && !campoBotao.value.includes('Nenhum botão')) {
                botaoLabelResgatado = campoBotao.value.replace('🟢 `', '').replace('`', '');
            }

            config = {
                canalId: canalMatch[1],
                texto: textoResgatado,
                banner: embed.image?.url || 'https://i.postimg.cc/NMQktv5h/3E253502-A13F-4441-8D2E-E10F8B291422.jpg',
                botaoLabel: botaoLabelResgatado,
                botaoUrl: ''
            };
            client.anuncios[interaction.user.id] = config;
        }
    }
    return config;
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;

        try {
            // 🛡️ Trava de segurança universal (Lê qualquer propriedade de permissão disponível)
            if (interaction.inGuild()) {
                const temPermissao = interaction.memberPermissions?.has('Administrator') || interaction.member?.permissions?.has?.('Administrator');
                if (!temPermissao) {
                    return interaction.reply({ content: '❌ Apenas administradores com a permissão "Administrador" podem usar estas funções.', ephemeral: true });
                }
            }

            // =========================================================================
            // 1. COMANDO /PAINEL
            // =========================================================================
            if (interaction.isChatInputCommand?.() || (interaction.type === 2 && !interaction.isButton?.())) {
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
                            .setEmoji('<a:emoji_36:1526557977710956715>')
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
            if (interaction.isButton?.() || interaction.type === 3) {
                if (interaction.customId === 'btn_enviar_msg') {
                    const selectCanal = new ChannelSelectMenuBuilder()
                        .setCustomId('select_canal_msg')
                        .setPlaceholder('Selecione o canal de destino...');

                    const rowSelect = new ActionRowBuilder().addComponents(selectCanal);
                    await interaction.reply({ content: '👉 **Selecione o canal destino:**', components: [rowSelect], ephemeral: true });
                    return;
                }

                if (interaction.customId === 'btn_anuncio_visualizar') {
                    const config = obterOuRecuperarConfig(interaction, client);
                    if (!config) return interaction.reply({ content: '❌ Sessão expirada. Use `/painel` para recomeçar.', ephemeral: true });

                    const embedAnuncio = new EmbedBuilder()
                        .setColor('#2b2d31') 
                        .setDescription(config.texto || '👉 *Nenhum texto configurado ainda.*');

                    if (config.banner) {
                        embedAnuncio.setImage(config.banner);
                    }

                    const payload = { embeds: [embedAnuncio], components: [], ephemeral: true };
                    
                    if (config.botaoLabel && config.botaoUrl) {
                        const r = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setLabel(config.botaoLabel).setUrl(config.botaoUrl).setStyle(ButtonStyle.Link)
                        );
                        payload.components.push(r);
                    }
                    await interaction.reply(payload);
                    return;
                }

                if (interaction.customId === 'btn_anuncio_enviar') {
                    const config = obterOuRecuperarConfig(interaction, client);
                    if (!config || !config.texto) return interaction.reply({ content: '❌ Preencha pelo menos o texto da mensagem antes de realizar o envio.', ephemeral: true });

                    try {
                        const canalTarget = await client.channels.fetch(config.canalId);
                        
                        const embedAnuncio = new EmbedBuilder()
                            .setColor('#2b2d31')
                            .setDescription(config.texto);

                        if (config.banner) {
                            embedAnuncio.setImage(config.banner);
                        }

                        const finalPayload = { embeds: [embedAnuncio], components: [] };

                        if (config.botaoLabel && config.botaoUrl) {
                            const r = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setLabel(config.botaoLabel).setUrl(config.botaoUrl).setStyle(ButtonStyle.Link)
                            );
                            finalPayload.components.push(r);
                        }

                        await canalTarget.send(finalPayload);
                        if (client.anuncios) delete client.anuncios[interaction.user.id];

                        await interaction.reply({ content: '🚀 Mensagem enviada com sucesso ao canal de destino!', ephemeral: true });
                    } catch (err) {
                        await interaction.reply({ content: '❌ Falha ao enviar. Verifique se o bot possui as permissões necessárias no canal.', ephemeral: true });
                    }
                    return;
                }

                if (interaction.customId === 'btn_config_limpeza') {
                    const modal = new ModalBuilder().setCustomId('modal_config_limpeza').setTitle('Configurar Canal de Limpeza');
                    const canalInput = new TextInputBuilder().setCustomId('novo_canal_id').setLabel('Novo ID do Canal').setStyle(TextInputStyle.Short).setValue(client.canalLimpezaId || '').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(canalInput));
                    await interaction.showModal(modal);
                    return;
                }
            }

            // =========================================================================
            // 3. CAPTURA DO SELETOR DE CANAL (Identificação direta por ID)
            // =========================================================================
            if (interaction.customId === 'select_canal_msg') {
                client.anuncios = client.anuncios || {};
                client.anuncios[interaction.user.id] = {
                    canalId: interaction.values[0],
                    texto: '',
                    banner: 'https://i.postimg.cc/NMQktv5h/3E253502-A13F-4441-8D2E-E10F8B291422.jpg',
                    botaoLabel: '',
                    botaoUrl: ''
                };

                await interaction.update(gerarPainelAnuncio(client.anuncios[interaction.user.id]));
                return;
            }

            // =========================================================================
            // 4. CAPTURA DAS SELEÇÕES DO MENU DROPDOWN (Identificação direta por ID)
            // =========================================================================
            if (interaction.customId === 'menu_config_anuncio') {
                const config = obterOuRecuperarConfig(interaction, client);
                if (!config) return interaction.reply({ content: '❌ Sessão expirada. Recomece usando `/painel`.', ephemeral: true });

                const opcao = interaction.values[0];

                if (opcao === 'opt_texto') {
                    const modal = new ModalBuilder().setCustomId('modal_set_texto').setTitle('Texto do Anúncio');
                    const input = new TextInputBuilder().setCustomId('in_texto').setLabel('Mensagem (Suporta Emojis e Markdown)').setStyle(TextInputStyle.Paragraph).setValue(config.texto || '').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await interaction.showModal(modal);
                } 
                else if (opcao === 'opt_banner') {
                    const modal = new ModalBuilder().setCustomId('modal_set_banner').setTitle('Banner do Anúncio');
                    const input = new TextInputBuilder().setCustomId('in_banner').setLabel('URL da Imagem').setStyle(TextInputStyle.Short).setValue(config.banner || '').setRequired(false);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await interaction.showModal(modal);
                } 
                else if (opcao === 'opt_botao') {
                    const modal = new ModalBuilder().setCustomId('modal_set_botao').setTitle('Configurar Botão Clicável');
                    const label = new TextInputBuilder().setCustomId('in_btn_label').setLabel('Texto do Botão').setStyle(TextInputStyle.Short).setValue(config.botaoLabel || '').setRequired(true);
                    const url = new TextInputBuilder().setCustomId('in_btn_url').setLabel('Link de Destino (https://...)').setStyle(TextInputStyle.Short).setValue(config.botaoUrl || '').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(label), new ActionRowBuilder().addComponents(url));
                    await interaction.showModal(modal);
                }
                return;
            }

            // =========================================================================
            // 5. PROCESSAMENTO DOS FORMULÁRIOS (MODALS)
            // =========================================================================
            if (interaction.isModalSubmit?.() || interaction.type === 5) {
                const config = obterOuRecuperarConfig(interaction, client);

                if (interaction.customId === 'modal_set_texto' && config) {
                    config.texto = interaction.fields.getTextInputValue('in_texto');
                    await interaction.update(gerarPainelAnuncio(config));
                    return;
                }

                if (interaction.customId === 'modal_set_banner' && config) {
                    config.banner = interaction.fields.getTextInputValue('in_banner');
                    await interaction.update(gerarPainelAnuncio(config));
                    return;
                }

                if (interaction.customId === 'modal_set_botao' && config) {
                    config.botaoLabel = interaction.fields.getTextInputValue('in_btn_label');
                    config.botaoUrl = interaction.fields.getTextInputValue('in_btn_url');
                    await interaction.update(gerarPainelAnuncio(config));
                    return;
                }

                if (interaction.customId === 'modal_config_limpeza') {
                    const novoId = interaction.fields.getTextInputValue('novo_canal_id');
                    client.canalLimpezaId = novoId; 
                    await interaction.reply({ content: `✅ Configuração atualizada! Monitorando <#${novoId}>.`, ephemeral: true });
                    return;
                }
            }
        } catch (error) {
            // 🚨 SISTEMA DE CAPTURA INTERNA
            console.error('❌ [ERRO CRÍTICO NO INTERACTIONCREATE]:', error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: `⚠️ **Erro interno detectado:** \`${error.message}\`\nPor favor, verifique os logs do Railway para ver os detalhes da linha correspondente.`, 
                        ephemeral: true 
                    });
                }
            } catch (e) {
                console.error('Não foi possível responder a interação com o erro:', e);
            }
        }
    },
};
