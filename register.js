require('dotenv').config();

const { REST, Routes } = require('discord.js');

const commands = [
  { 
      name: 'create', 
      description: 'Creates a creator code for a specific user', 
      options: [
          { name: 'user', type: 6, description: 'The user to assign the code to', required: true },
          { name: 'code', type: 3, description: 'The creator code', required: true }
      ] 
  },
  {
      name: 'withdraw',
      description: 'Resets a user\'s weight to 0 and adds it to the total',
      options: [{ name: 'user', type: 6, description: 'The user to reset', required: true }]
  },
  { 
      name: 'info', 
      description: 'Provides information about the user\'s creator code data', 
      options: [{ name: 'user', type: 6, description: 'The user to check', required: true }] 
  },
  { 
      name: 'alter', 
      description: 'Changes a user\'s code while keeping their purchase data untouched', 
      options: [
          { name: 'user', type: 6, description: 'The user to modify', required: true },
          { name: 'new_code', type: 3, description: 'The new creator code', required: true }
      ] 
  },
  { 
      name: 'destroy', 
      description: 'Destroys the creator code data for a specific user',
      options: [{ name: 'user', type: 6, description: 'The user to modify', required: true }]
  }
];

// Paste your Token here too
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands to Discord...');
    // Replace YOUR_CLIENT_ID_HERE with your Bot's Application ID from the Developer Portal
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Successfully registered commands! You only need to run this once.');
  } catch (error) {
    console.error(error);
  }
})();