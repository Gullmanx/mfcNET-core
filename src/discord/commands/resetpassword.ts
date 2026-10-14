import { FindUserByDiscordId, UpdateUserAccount } from '../../utils/EamuseIO';
import { invalidateUserCache } from '../../webui/shared/middleware';
import { Logger } from '../../utils/Logger';

/**
 * Generates a clean, readable temporary password
 */
function generateTemporaryPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function handleResetPasswordCommand(interaction: any) {
  // Always reply ephemerally so only the caller can see the response
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;
  const user = await FindUserByDiscordId(discordId);

  if (!user) {
    return interaction.editReply(
      '❌ No RyuNET account is linked to your Discord account.\n\n' +
      'To link your account, log in to the RyuNET WebUI, go to **Account** (`/account`), and click **Link Discord**.'
    );
  }

  const customPassword = interaction.options.getString('new_password');
  let newPassword = customPassword;

  if (newPassword) {
    if (newPassword.length < 4) {
      return interaction.editReply('❌ Password must be at least 4 characters long.');
    }
    if (newPassword.length > 64) {
      return interaction.editReply('❌ Password must be 64 characters or fewer.');
    }
  } else {
    newPassword = generateTemporaryPassword();
  }

  try {
    await UpdateUserAccount(user.username, { password: newPassword });
    invalidateUserCache(user.username);

    Logger.info(`[Discord] Password reset via /resetpassword for user: ${user.username} (Discord ID: ${discordId})`);

    if (customPassword) {
      return interaction.editReply(
        `✅ Password successfully updated for RyuNET account **${user.username}**!\n\n` +
        `You can now log in at the WebUI using your username and new password.`
      );
    } else {
      return interaction.editReply(
        `✅ Password successfully reset for RyuNET account **${user.username}**!\n\n` +
        `Your new temporary password is:\n\`\`\`\n${newPassword}\n\`\`\`\n` +
        `Please log in to the WebUI and change your password in **Account Settings** (\`/account\`).`
      );
    }
  } catch (err) {
    Logger.error(`[Discord] Error resetting password for ${user.username}: ${err}`);
    return interaction.editReply('❌ Failed to update your password. Please try again later or contact an administrator.');
  }
}
