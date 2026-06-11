const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Force Node to use Google and Cloudflare DNS

require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');

// --- DATABASE SETUP (MongoDB via Mongoose) ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB!'))
    .catch(err => console.error('❌ Failed connection to MongoDB:', err));

// Create a blueprint (Schema) for how the data should look
const codeSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // unique: true ensures O(1) lookups
    code: { type: String, required: true, unique: true },
    purchases: { type: Number, default: 0 }
});

// Create the model
const CreatorCode = mongoose.model('CreatorCode', codeSchema);

// --- EXPRESS WEB SERVER SETUP (Updated for new DB structure) ---
const app = express();
app.use(express.json());

app.get('/api/validate/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const foundCode = await CreatorCode.findOne({ code: code });
    if (foundCode) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

app.post('/api/purchase', async (req, res) => {
    const { player, name, price, code } = req.body;
    const upperCode = code.toUpperCase();

    // Find the code and increment purchases by 1 in a single action
    const updatedData = await CreatorCode.findOneAndUpdate(
        { code: upperCode }, 
        { $inc: { purchases: 1 } },
        { new: true } // Returns the updated document
    );

    if (updatedData) {
        const channel = await client.channels.fetch(process.env.CHANNEL_ID);
        channel.send(`🎉 **Purchase Alert!** Player \`${player}\` bought \`${name}\` using code **${upperCode}**!`);
        res.json({ success: true });
    } else {
        channel.send(`📛 **Purchase Alert!** Player \`${player}\` bought \`${name}\`, but did not register for code **${upperCode}**!`)
        res.status(400).json({ success: false, message: "Invalid code" });
    }
});

app.listen(3000, () => console.log('🌐 Web Server running on port 3000'));


// --- DISCORD BOT SETUP (Updated with your 5 specific commands) ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- PERMISSION GUARD ---
const ALLOWED_USER_IDS = ['865837236870971413', '982798552151502888', '594184472656609281'];
const ALLOWED_ROLE_IDS = ['1457495907896660101', '1513753571840229376', '1457496644944793642', '1457496681099558982', '1462650352884125831'];

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const isUserAllowed = ALLOWED_USER_IDS.includes(interaction.user.id);
    const hasAllowedRole = interaction.member.roles.cache.some(role => ALLOWED_ROLE_IDS.includes(role.id));

    if (!isUserAllowed && !hasAllowedRole) {
        return interaction.reply({content: "🚫 You do not have permission to use this bot.", ephemeral: true});
    }

    const { commandName, options } = interaction;
    const targetUser = options.getUser('user');

    if (commandName === 'create') {
        const code = options.getString('code').toUpperCase();
        
        const userExists = await CreatorCode.findOne({ userId: targetUser.id });
        if (userExists) return interaction.reply({ content: `❌ ${targetUser.username} already has a code!`, ephemeral: true });
        
        const codeExists = await CreatorCode.findOne({ code: code });
        if (codeExists) return interaction.reply({ content: `❌ The code **${code}** is already taken by user's ID ${codesDB[code]}!`, ephemeral: true });

        // Insert the data
        await CreatorCode.create({ userId: targetUser.id, code: code });
        interaction.reply(`✅ Created code **${code}** for ${targetUser.username}.`);
    }

    if (commandName === 'refresh') {

        const updatedData = await CreatorCode.findOneAndUpdate(
            { userId: targetUser.id },
            { purchases: 0 }
        );

        if (updatedData) {
            interaction.reply({content: `✅ Data Refreshed for ${targetUser.username}\n• **Code:** \`${updatedData.code}\`\n• **Purchases before reset:** \`${localPreviousCount}\`\n• **Current Purchases:** \`0\``});
        } else {
            interaction.reply({content: `❌ ${targetUser.username} does not have a creator code profile to refresh.`, ephemeral: true });
        }
    }

    if (commandName === 'info') {
        const userData = await CreatorCode.findOne({ userId: targetUser.id });
        if (userData) {
            interaction.reply(`✅ Data found!\n• **User:** ${targetUser.username}\n• **Code:** ${userData.code}\n• **Total Purchases:** ${userData.purchases}`);
        } else {
            interaction.reply({ content: `❌ No data found for ${targetUser.username}.`, ephemeral: true });
        }
    }

    if (commandName === 'alter') {
        const newCode = options.getString('new_code').toUpperCase();

        const codeExists = await CreatorCode.findOne({ code: newCode });
        if (codeExists) return interaction.reply({ content: `❌ The code **${newCode}** is already taken!`, ephemeral: true });
        
        const updatedData = await CreatorCode.findOneAndUpdate(
            { userId: targetUser.id },
            { code: newCode }
        ); // Doesn't return the new data by default, which is fine because we need the old code anyway

        if (updatedData) {
            interaction.reply(`✅ Altered code for ${targetUser.username}. \n• **Old Code:** ${updatedData.code}\n• **New Code:** ${newCode}\n• *(Purchases are still at ${userData.purchases})*`);
        } else {
            interaction.reply({ content: `❌ ${targetUser.username} does not have any data to alter. Use /create first.`, ephemeral: true });
        }
    }

    if (commandName === 'fetch') {
        const userData = await CreatorCode.findOne({ userId: targetUser.id });
        if (userData) {
            interaction.reply(`✅ ${targetUser.username}'s creator code is **${userData.code}**.`);
        } else {
            interaction.reply({ content: `❌ ${targetUser.username} does not have a creator code.`, ephemeral: true });
        }
    }

    if (commandName === 'destroy') {
        const deletedData = await CreatorCode.findOneAndDelete({ userId: targetUser.id });
        if (deletedData) {
            interaction.reply(`✅ Destroyed data for ${targetUser.username}. Extracted code: **${deletedData.code}**.`);
        } else {
            interaction.reply({ content: `❌ ${targetUser.username} does not have any data to destroy.`, ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);