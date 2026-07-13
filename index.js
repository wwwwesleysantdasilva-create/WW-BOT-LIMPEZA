    if (interaction.isChannelSelectMenu() && interaction.customId === 'selecionar_canal_envio') {
        const canal = await interaction.guild.channels.fetch(interaction.values[0]);
        const rascunho = rascunhos.get(interaction.user.id);
        
        let payload = { content: rascunho.texto };
        
        // Verifica se os campos existem antes de criar o botão
        if (rascunho.btnNome && rascunho.btnUrl) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel(rascunho.btnNome).setStyle(ButtonStyle.Link).setURL(rascunho.btnUrl)
            );
            
            if (rascunho.formato === 'container_v2') {
                payload = { components: [new ContainerBuilder().setAccentColor(0x2b2d31).addTextDisplayComponents(new TextDisplayBuilder().setContent(rascunho.texto)).addActionRowComponents(row)] };
            } else if (rascunho.formato === 'embed') {
                payload = { embeds: [new EmbedBuilder().setDescription(rascunho.texto).setColor('#2b2d31')], components: [row] };
            } else {
                payload.components = [row];
            }
        }
        
        await canal.send(payload);
        // CORREÇÃO: Use editReply em vez de update se a interação foi um reply anterior
        return interaction.editReply({ content: '✅ Mensagem enviada com sucesso!', components: [] });
    }
