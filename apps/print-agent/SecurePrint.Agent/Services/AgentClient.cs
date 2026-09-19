using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using SecurePrint.Agent.Models;

namespace SecurePrint.Agent.Services
{
    public class AgentClient
    {
        private readonly HttpClient _http;
        private readonly AgentConfig _config;

        private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        private static readonly JsonSerializerOptions _jsonReadOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        public AgentClient(AgentConfig config)
        {
            _config = config;
            _http = new HttpClient
            {
                BaseAddress = new Uri(config.ApiBaseUrl)
            };
            if (!string.IsNullOrEmpty(config.PairingToken))
            {
                _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", config.PairingToken);
            }
        }

        public void SetToken(string token)
        {
            _config.PairingToken = token;
            _config.Save();
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        public async Task<(bool Success, string? Error, string? ShopId, string? ShopName)> PairAsync(string pairingCode)
        {
            try
            {
                var payload = new
                {
                    pairingCode,
                    installationId = _config.InstallationId.ToString(),
                    machineName = _config.MachineName,
                    osVersion = Environment.OSVersion.VersionString,
                    agentVersion = _config.AgentVersion
                };

                var content = new StringContent(JsonSerializer.Serialize(payload, _jsonOptions), Encoding.UTF8, "application/json");
                var response = await _http.PostAsync("/api/v1/agent/pair", content);
                var resBody = await response.Content.ReadAsStringAsync();

                using var doc = JsonDocument.Parse(resBody);
                var root = doc.RootElement;

                if (root.GetProperty("success").GetBoolean())
                {
                    var data = root.GetProperty("data");
                    var token = data.GetProperty("pairingToken").GetString()!;
                    var shopId = data.GetProperty("shopId").GetString();
                    var shopName = data.GetProperty("shopName").GetString();

                    _config.ShopId = shopId;
                    _config.ShopName = shopName;
                    SetToken(token);

                    return (true, null, shopId, shopName);
                }
                else
                {
                    var errMsg = root.GetProperty("error").GetProperty("message").GetString();
                    return (false, errMsg ?? "Pairing failed", null, null);
                }
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null, null);
            }
        }

        public async Task<bool> SendHeartbeatAsync()
        {
            try
            {
                var payload = new
                {
                    installationId = _config.InstallationId.ToString(),
                    agentVersion = _config.AgentVersion
                };

                var content = new StringContent(JsonSerializer.Serialize(payload, _jsonOptions), Encoding.UTF8, "application/json");
                var response = await _http.PostAsync("/api/v1/agent/heartbeat", content);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> RegisterPrintersAsync(List<PrinterInfoDto> printers)
        {
            try
            {
                var payload = new { printers };
                var content = new StringContent(JsonSerializer.Serialize(payload, _jsonOptions), Encoding.UTF8, "application/json");
                var response = await _http.PostAsync("/api/v1/agent/printers", content);
                var body = await response.Content.ReadAsStringAsync();
                System.Diagnostics.Debug.WriteLine($"[RegisterPrinters] Status={response.StatusCode} Body={body}");
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[RegisterPrinters] Exception: {ex.Message}");
                return false;
            }
        }

        public async Task<List<PendingJobDto>> GetPendingJobsAsync()
        {
            var jobs = new List<PendingJobDto>();
            if (string.IsNullOrEmpty(_config.PairingToken)) return jobs;

            try
            {
                var response = await _http.GetAsync("/api/v1/agent/jobs");
                if (!response.IsSuccessStatusCode) return jobs;

                var resBody = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(resBody);
                var root = doc.RootElement;

                if (root.TryGetProperty("data", out var dataElem) && dataElem.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in dataElem.EnumerateArray())
                    {
                        var dto = new PendingJobDto
                        {
                            AttemptId = item.GetProperty("attemptId").GetString() ?? string.Empty,
                            JobId = item.GetProperty("jobId").GetString() ?? string.Empty,
                            JobCode = item.GetProperty("jobCode").GetString() ?? string.Empty,
                            PrinterName = item.GetProperty("printerName").GetString() ?? string.Empty,
                            ColorMode = item.TryGetProperty("colorMode", out var cm) ? cm.GetString() ?? "BW" : "BW",
                            Copies = item.TryGetProperty("copies", out var cp) && cp.TryGetInt32(out var cVal) ? cVal : 1,
                            PaperSize = item.TryGetProperty("paperSize", out var ps) ? ps.GetString() ?? "A4" : "A4",
                            Duplex = item.TryGetProperty("duplex", out var dp) ? dp.GetString() ?? "NONE" : "NONE",
                            FileId = item.TryGetProperty("fileId", out var fi) ? fi.GetString() : null,
                            FileName = item.TryGetProperty("fileName", out var fn) ? fn.GetString() ?? "document.pdf" : "document.pdf",
                            FileMimeType = item.TryGetProperty("fileMimeType", out var fmt) ? fmt.GetString() ?? "application/pdf" : "application/pdf",
                            FileDownloadUrl = item.TryGetProperty("fileDownloadUrl", out var fdu) ? fdu.GetString() : null
                        };
                        jobs.Add(dto);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error polling agent jobs: {ex.Message}");
            }

            return jobs;
        }

        public async Task<string> DownloadDocumentAsync(string downloadUrl, string destinationPath)
        {
            var response = await _http.GetAsync(downloadUrl);
            response.EnsureSuccessStatusCode();
            var dir = Path.GetDirectoryName(destinationPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            using var fs = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None);
            await response.Content.CopyToAsync(fs);
            return destinationPath;
        }

        public async Task<bool> UpdateAttemptStatusAsync(string attemptId, string status, string? errorMessage = null)
        {
            try
            {
                var payload = new
                {
                    attemptId,
                    status,
                    errorMessage
                };

                var content = new StringContent(JsonSerializer.Serialize(payload, _jsonOptions), Encoding.UTF8, "application/json");
                var response = await _http.PostAsync("/api/v1/agent/status", content);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        public Task<bool> UpdateAttemptStatusAsync(Guid attemptId, string status, string? errorMessage = null)
        {
            return UpdateAttemptStatusAsync(attemptId.ToString(), status, errorMessage);
        }
    }
}
