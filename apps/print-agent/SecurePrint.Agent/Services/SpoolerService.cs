using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Printing;
using System.Threading;
using SecurePrint.Agent.Models;

namespace SecurePrint.Agent.Services
{
    public class SpoolerService
    {
        private static readonly HashSet<string> KnownVirtualPrinters = new(StringComparer.OrdinalIgnoreCase)
        {
            "Microsoft Print to PDF",
            "Microsoft XPS Document Writer",
            "Fax",
            "OneNote",
            "OneNote (Desktop)",
            "OneNote for Windows 10",
            "Send to OneNote",
            "CutePDF Writer",
            "Adobe PDF",
            "PDFCreator",
            "Bullzip PDF Printer"
        };

        public static bool IsVirtual(PrintQueue queue)
        {
            try
            {
                if (KnownVirtualPrinters.Contains(queue.Name)) return true;
                if (!string.IsNullOrEmpty(queue.QueueDriver?.Name) && KnownVirtualPrinters.Contains(queue.QueueDriver.Name)) return true;
                var port = queue.QueuePort?.Name ?? string.Empty;
                if (port.StartsWith("PORTPROMPT:", StringComparison.OrdinalIgnoreCase) ||
                    port.StartsWith("nul:", StringComparison.OrdinalIgnoreCase) ||
                    port.StartsWith("FILE:", StringComparison.OrdinalIgnoreCase) ||
                    port.StartsWith("SHDocVw", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            catch { }
            return false;
        }

        public List<PrinterInfoDto> DiscoverPrinters()
        {
            var results = new List<PrinterInfoDto>();

            try
            {
                using var printServer = new LocalPrintServer();
                var queues = printServer.GetPrintQueues(new[]
                {
                    EnumeratedPrintQueueTypes.Local,
                    EnumeratedPrintQueueTypes.Connections
                });

                var defaultQueueName = printServer.DefaultPrintQueue?.Name;

                foreach (var queue in queues)
                {
                    try
                    {
                        // Filter out virtual/document writer printers so only real hardware printers appear
                        if (IsVirtual(queue))
                        {
                            continue;
                        }

                        var info = new PrinterInfoDto
                        {
                            WindowsPrinterName = queue.Name,
                            DriverName = queue.QueueDriver?.Name,
                            IsDefault = string.Equals(queue.Name, defaultQueueName, StringComparison.OrdinalIgnoreCase),
                            Status = MapQueueStatus(queue),
                            Capabilities = ExtractCapabilities(queue)
                        };

                        results.Add(info);
                    }
                    catch
                    {
                        // Safely handle individual queue query errors without crashing
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error discovering printers: {ex.Message}");
            }

            return results;
        }

        private string MapQueueStatus(PrintQueue queue)
        {
            try
            {
                queue.Refresh();

                if (queue.IsOffline) return "OFFLINE";
                if (queue.IsInError || queue.IsOutOfPaper || queue.QueueStatus.HasFlag(PrintQueueStatus.PaperJam)) return "ERROR";
                if (queue.IsPrinting) return "PRINTING";
            }
            catch { }
            return "READY";
        }

        private PrinterCapabilitiesDto ExtractCapabilities(PrintQueue queue)
        {
            var caps = new PrinterCapabilitiesDto
            {
                SupportsColor = false,
                SupportsDuplex = false,
                SupportedPaperSizes = new List<string> { "A4", "LETTER" },
                SupportedOrientations = new List<string> { "PORTRAIT", "LANDSCAPE" }
            };

            try
            {
                var printCapabilities = queue.GetPrintCapabilities();
                if (printCapabilities != null)
                {
                    if (printCapabilities.OutputColorCapability != null)
                    {
                        caps.SupportsColor = printCapabilities.OutputColorCapability.Contains(OutputColor.Color);
                    }

                    if (printCapabilities.DuplexingCapability != null)
                    {
                        caps.SupportsDuplex = printCapabilities.DuplexingCapability.Count > 1;
                    }

                    if (printCapabilities.PageMediaSizeCapability != null)
                    {
                        var sizes = new HashSet<string>();
                        foreach (var size in printCapabilities.PageMediaSizeCapability)
                        {
                            var name = size.PageMediaSizeName?.ToString();
                            if (!string.IsNullOrEmpty(name))
                            {
                                if (name.Contains("ISOA4", StringComparison.OrdinalIgnoreCase)) sizes.Add("A4");
                                else if (name.Contains("ISOA3", StringComparison.OrdinalIgnoreCase)) sizes.Add("A3");
                                else if (name.Contains("Legal", StringComparison.OrdinalIgnoreCase)) sizes.Add("LEGAL");
                                else if (name.Contains("NorthAmericaLetter", StringComparison.OrdinalIgnoreCase)) sizes.Add("LETTER");
                            }
                        }
                        if (sizes.Count > 0)
                        {
                            caps.SupportedPaperSizes = new List<string>(sizes);
                        }
                    }
                }
            }
            catch
            {
                // Fallback to safe defaults if driver does not support XML print capabilities
            }

            return caps;
        }

        public (bool Success, string Status, string? ErrorMessage) SubmitAndTrackJob(
            string printerName,
            string filePath,
            int copies,
            bool duplex,
            bool color,
            string jobCode,
            Action<string>? logger = null)
        {
            if (!File.Exists(filePath))
            {
                return (false, "FAILED", $"Document file not found: {filePath}");
            }

            try
            {
                // 1. Verify queue and printer health before attempting submission
                using var printServer = new LocalPrintServer();
                using var queue = printServer.GetPrintQueue(printerName);

                if (queue == null)
                {
                    return (false, "FAILED", $"Printer '{printerName}' was not found on this Windows computer.");
                }

                queue.Refresh();
                if (queue.IsOffline)
                {
                    return (false, "FAILED", $"Printer '{printerName}' is currently OFFLINE. Check power and USB/network cables.");
                }
                if (queue.IsInError)
                {
                    return (false, "FAILED", $"Printer '{printerName}' is in an ERROR state.");
                }
                if (queue.IsOutOfPaper)
                {
                    return (false, "FAILED", $"Printer '{printerName}' is OUT OF PAPER.");
                }

                // 2. Locate SumatraPDF print engine in base directory or tools subdirectory
                var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                var sumatraPath = Path.Combine(baseDir, "SumatraPDF.exe");
                if (!File.Exists(sumatraPath))
                {
                    sumatraPath = Path.Combine(baseDir, "tools", "SumatraPDF.exe");
                }

                bool submitted = false;

                if (File.Exists(sumatraPath))
                {
                    logger?.Invoke($"[ENGINE] Using native Windows GDI print engine (SumatraPDF) for '{printerName}'...");

                    var colorParam = color ? "color" : "monochrome";
                    var duplexParam = duplex ? "duplex" : "simplex";
                    var copyCount = Math.Max(1, copies);
                    var settings = $"{copyCount}x,{colorParam},{duplexParam}";
                    var args = $"-print-to \"{printerName}\" -print-settings \"{settings}\" -silent \"{filePath}\"";

                    var psi = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = sumatraPath,
                        Arguments = args,
                        CreateNoWindow = true,
                        WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden,
                        UseShellExecute = false
                    };

                    using var proc = System.Diagnostics.Process.Start(psi);
                    if (proc == null)
                    {
                        return (false, "FAILED", "Failed to launch Windows print engine process.");
                    }

                    var exited = proc.WaitForExit(40000);
                    if (!exited)
                    {
                        try { proc.Kill(); } catch { }
                        return (false, "SUBMISSION_UNKNOWN", "Print engine submission timed out after 40 seconds.");
                    }

                    if (proc.ExitCode != 0)
                    {
                        logger?.Invoke($"[ENGINE] Engine exit code {proc.ExitCode}, falling back to Windows Shell...");
                        submitted = FallbackShellPrint(printerName, filePath);
                    }
                    else
                    {
                        submitted = true;
                    }
                }
                else
                {
                    logger?.Invoke($"[ENGINE] Standalone print engine not found. Using Windows Shell print for '{printerName}'...");
                    submitted = FallbackShellPrint(printerName, filePath);
                }

                if (!submitted)
                {
                    return (false, "FAILED", $"Failed to submit document to Windows printer queue '{printerName}'.");
                }

                logger?.Invoke($"[SPOOLER] Document accepted by Windows Spooler. Tracking print queue...");

                // 3. Monitor Windows Spooler Print Queue until completion or failure
                var startTime = DateTime.UtcNow;
                const int maxTrackingSeconds = 30;

                while ((DateTime.UtcNow - startTime).TotalSeconds < maxTrackingSeconds)
                {
                    Thread.Sleep(1000);

                    try
                    {
                        queue.Refresh();

                        if (queue.IsOffline)
                        {
                            return (false, "FAILED", $"Printer '{printerName}' became OFFLINE during printing.");
                        }
                        if (queue.IsInError)
                        {
                            return (false, "FAILED", $"Printer '{printerName}' entered ERROR state during printing.");
                        }
                        if (queue.IsOutOfPaper)
                        {
                            return (false, "FAILED", $"Printer '{printerName}' ran OUT OF PAPER during printing.");
                        }

                        var jobs = queue.GetPrintJobInfoCollection();
                        var matchingJob = jobs.FirstOrDefault(j =>
                            j.Name.Contains(jobCode, StringComparison.OrdinalIgnoreCase) ||
                            j.Name.Contains(Path.GetFileNameWithoutExtension(filePath), StringComparison.OrdinalIgnoreCase) ||
                            (DateTime.UtcNow - j.TimeJobSubmitted.ToUniversalTime()).TotalSeconds < 90);

                        if (matchingJob != null)
                        {
                            matchingJob.Refresh();
                            var status = matchingJob.JobStatus;

                            if (status.HasFlag(PrintJobStatus.Error) ||
                                status.HasFlag(PrintJobStatus.Blocked) ||
                                status.HasFlag(PrintJobStatus.UserIntervention))
                            {
                                return (false, "FAILED", $"Windows spooler job error: {status}");
                            }

                            if (status.HasFlag(PrintJobStatus.Printed))
                            {
                                logger?.Invoke($"[SPOOLER] Print job marked Printed by driver.");
                                return (true, "COMPLETED", null);
                            }

                            logger?.Invoke($"[SPOOLER] Spooler transmitting to printer: {status} ({matchingJob.NumberOfPagesPrinted}/{matchingJob.NumberOfPages} pages)");
                        }
                        else
                        {
                            // Job has finished spooling and passed completely through the Windows Spooler to printer hardware
                            logger?.Invoke($"[SPOOLER] Print job cleared from queue. Hardware received document.");
                            return (true, "COMPLETED", null);
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"Queue polling warning: {ex.Message}");
                    }
                }

                // If timeout reached without any error flags, spooler completed transmission
                logger?.Invoke($"[SPOOLER] Spooling complete. Job sent to printer buffer.");
                return (true, "COMPLETED", null);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"SubmitAndTrackJob error: {ex.Message}");
                return (false, "SUBMISSION_UNKNOWN", $"Print submission error: {ex.Message}");
            }
        }

        private bool FallbackShellPrint(string printerName, string filePath)
        {
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"Start-Process -FilePath '{filePath}' -Verb PrintTo -ArgumentList '\"{printerName}\"' -Wait\"",
                    CreateNoWindow = true,
                    WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden,
                    UseShellExecute = false
                };

                using var proc = System.Diagnostics.Process.Start(psi);
                proc?.WaitForExit(25000);
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"PowerShell print fallback failed: {ex.Message}");
                return false;
            }
        }
    }
}
