using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;

namespace SecurePrint.Agent.Models
{
    public class AgentConfig
    {
        public Guid InstallationId { get; set; } = Guid.NewGuid();
        public string MachineName { get; set; } = Environment.MachineName;
        public string ApiBaseUrl { get; set; } = "https://secure-print-api.onrender.com";
        public string? PairingToken { get; set; }
        public string? ShopId { get; set; }
        public string? ShopName { get; set; }
        public string AgentVersion { get; set; } = "1.0.0";
        public bool AutoStartWithWindows { get; set; } = true;

        private static readonly string ConfigPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "SecurePrint",
            "agent-config.json"
        );

        public static AgentConfig Load()
        {
            try
            {
                if (File.Exists(ConfigPath))
                {
                    var json = File.ReadAllText(ConfigPath);
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var config = JsonSerializer.Deserialize<AgentConfig>(json, options);
                    if (config != null)
                    {
                        if (config.InstallationId == Guid.Empty)
                        {
                            config.InstallationId = Guid.NewGuid();
                            config.Save();
                        }
                        return config;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load config: {ex.Message}");
            }

            var newConfig = new AgentConfig();
            newConfig.Save();
            return newConfig;
        }

        public void Save()
        {
            try
            {
                var dir = Path.GetDirectoryName(ConfigPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                // Encrypt token before persisting to disk if on Windows
                EncryptToken();

                var json = JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(ConfigPath, json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to save config: {ex.Message}");
            }
        }

        public void EncryptToken()
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows) &&
                !string.IsNullOrEmpty(PairingToken) &&
                !PairingToken.StartsWith("DPAPI:"))
            {
                try
                {
                    var bytes = Encoding.UTF8.GetBytes(PairingToken);
                    var encrypted = ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser);
                    PairingToken = "DPAPI:" + Convert.ToBase64String(encrypted);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"DPAPI encryption failed: {ex.Message}");
                }
            }
        }

        public string? GetDecryptedToken()
        {
            if (string.IsNullOrEmpty(PairingToken)) return null;

            if (PairingToken.StartsWith("DPAPI:") && RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                try
                {
                    var rawBase64 = PairingToken.Substring("DPAPI:".Length);
                    var cipher = Convert.FromBase64String(rawBase64);
                    var plain = ProtectedData.Unprotect(cipher, null, DataProtectionScope.CurrentUser);
                    return Encoding.UTF8.GetString(plain);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"DPAPI decryption failed: {ex.Message}");
                    return null;
                }
            }

            return PairingToken;
        }

        public static void RegisterAutoStartup(bool enable)
        {
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return;

            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
                if (key != null)
                {
                    var exePath = Environment.ProcessPath;
                    if (string.IsNullOrEmpty(exePath) || !File.Exists(exePath))
                    {
                        exePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "SecurePrint.Agent.exe");
                    }

                    if (enable && File.Exists(exePath))
                    {
                        key.SetValue("SecurePrintAgent", $"\"{exePath}\" --background");
                    }
                    else if (!enable)
                    {
                        key.DeleteValue("SecurePrintAgent", false);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to configure auto-startup registry: {ex.Message}");
            }
        }
    }
}
