using System;
using System.Collections.Generic;
using System.IO;
using System.Printing;
using SecurePrint.Agent.Models;

namespace SecurePrint.Agent.Services
{
    public class SpoolerService
    {
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

        public bool SubmitDocumentToQueue(string printerName, string filePath, int copies, bool duplex, bool color)
        {
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"Document file not found: {filePath}");
            }

            try
            {
                using var printServer = new LocalPrintServer();
                using var queue = printServer.GetPrintQueue(printerName);

                if (queue == null)
                {
                    throw new InvalidOperationException($"Printer '{printerName}' was not found on this system.");
                }

                var printTicket = queue.DefaultPrintTicket.Clone();
                printTicket.CopyCount = Math.Max(1, copies);
                printTicket.OutputColor = color ? OutputColor.Color : OutputColor.Monochrome;
                if (duplex)
                {
                    printTicket.Duplexing = Duplexing.TwoSidedLongEdge;
                }

                try
                {
                    using (var stream = File.OpenRead(filePath))
                    using (var printJob = queue.AddJob(Path.GetFileName(filePath), printTicket))
                    using (var jobStream = printJob.JobStream)
                    {
                        stream.CopyTo(jobStream);
                        jobStream.Flush();
                        jobStream.Close();
                    }
                    return true;
                }
                catch (Exception spoolEx)
                {
                    System.Diagnostics.Debug.WriteLine($"Raw spooler stream failed ({spoolEx.Message}), trying shell fallback...");
                    return FallbackShellPrint(printerName, filePath);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Print submission error: {ex.Message}");
                return FallbackShellPrint(printerName, filePath);
            }
        }

        private bool FallbackShellPrint(string printerName, string filePath)
        {
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = filePath,
                    Verb = "printto",
                    Arguments = $"\"{printerName}\"",
                    CreateNoWindow = true,
                    WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden,
                    UseShellExecute = true
                };

                using var proc = System.Diagnostics.Process.Start(psi);
                proc?.WaitForExit(15000);
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Shell print fallback failed: {ex.Message}");
                throw new InvalidOperationException($"Failed to submit document to Windows printer '{printerName}': {ex.Message}", ex);
            }
        }
    }
}
