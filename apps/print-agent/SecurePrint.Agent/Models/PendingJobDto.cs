using System;

namespace SecurePrint.Agent.Models
{
    public class PendingJobDto
    {
        public string AttemptId { get; set; } = string.Empty;
        public string JobId { get; set; } = string.Empty;
        public string JobCode { get; set; } = string.Empty;
        public string PrinterName { get; set; } = string.Empty;
        public string ColorMode { get; set; } = "BW";
        public int Copies { get; set; } = 1;
        public string PaperSize { get; set; } = "A4";
        public string Duplex { get; set; } = "NONE";
        public string? FileId { get; set; }
        public string FileName { get; set; } = "document.pdf";
        public string FileMimeType { get; set; } = "application/pdf";
        public string? FileDownloadUrl { get; set; }
    }
}
