using System;
using System.IO;
using System.Text.Json;

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
                    if (config != null) return config;
                }
            }
            catch { }

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
                var json = JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(ConfigPath, json);
            }
            catch { }
        }
    }
}
