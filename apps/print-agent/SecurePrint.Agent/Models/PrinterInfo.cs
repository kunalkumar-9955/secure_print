using System.Collections.Generic;

namespace SecurePrint.Agent.Models
{
    public class PrinterCapabilitiesDto
    {
        public bool SupportsColor { get; set; }
        public bool SupportsDuplex { get; set; }
        public List<string> SupportedPaperSizes { get; set; } = new();
        public List<string> SupportedOrientations { get; set; } = new();
        public List<int> ResolutionsDpi { get; set; } = new();
    }

    public class PrinterInfoDto
    {
        public string WindowsPrinterName { get; set; } = string.Empty;
        public string? DriverName { get; set; }
        public bool IsDefault { get; set; }
        public string Status { get; set; } = "READY";
        public PrinterCapabilitiesDto Capabilities { get; set; } = new();
    }
}
