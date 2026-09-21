using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using SecurePrint.Agent.Models;
using SecurePrint.Agent.Services;

namespace SecurePrint.Agent
{
    public partial class MainWindow : Window
    {
        private readonly AgentConfig _config;
        private readonly SpoolerService _spoolerService;
        private readonly AgentClient _client;
        private readonly DispatcherTimer _heartbeatTimer;
        private readonly DispatcherTimer _jobPollingTimer;
        private bool _isProcessingJob = false;
        private bool _isExplicitExit = false;

        public MainWindow()
        {
            InitializeComponent();

            _config = AgentConfig.Load();
            _spoolerService = new SpoolerService();
            _client = new AgentClient(_config);

            TxtMachineInfo.Text = $"Host: {_config.MachineName} | Installation ID: {_config.InstallationId}";

            var token = _config.GetDecryptedToken();
            if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(_config.ShopId))
            {
                TxtPairingTitle.Text = "Computer Connected";
                TxtPairingHelp.Text = $"Shop Name: {_config.ShopName ?? _config.ShopId} | Status: Connected & Online | Host: {_config.MachineName}";
                TxtPairResult.Text = $"Connected to {_config.ShopName ?? _config.ShopId}";
                TxtStatus.Text = "ONLINE";
                TxtStatus.Foreground = System.Windows.Media.Brushes.LightGreen;
                StatusBadge.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(20, 83, 45));

                // Register Windows auto-start on boot
                AgentConfig.RegisterAutoStartup(true);
            }
            else
            {
                TxtPairingTitle.Text = "Connect this computer to a Print Shop";
                TxtPairingHelp.Text = "Open your Shop Console (Desktop Agents → Click 'Connect Computer') to generate a 6-digit code.";
                TxtPairResult.Text = "Ready to connect to your print shop.";
                TxtStatus.Text = "NOT PAIRED";
                TxtStatus.Foreground = System.Windows.Media.Brushes.Orange;
                StatusBadge.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(120, 53, 15));
            }

            Log("SecurePrint Desktop Agent initialized.");
            RefreshPrinters();

            _heartbeatTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(15)
            };
            _heartbeatTimer.Tick += async (s, e) => await DoHeartbeatAsync();
            _heartbeatTimer.Start();

            _jobPollingTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(2)
            };
            _jobPollingTimer.Tick += async (s, e) => await PollPendingJobsAsync();
            _jobPollingTimer.Start();

            if (!string.IsNullOrEmpty(token))
            {
                Loaded += async (s, e) =>
                {
                    // Check if started with --background
                    if (Environment.GetCommandLineArgs().Any(a => string.Equals(a, "--background", StringComparison.OrdinalIgnoreCase)))
                    {
                        Hide();
                    }

                    await DoHeartbeatAsync();
                    await PollPendingJobsAsync();
                };
            }
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            if (!_isExplicitExit)
            {
                e.Cancel = true;
                Hide();
                Log("SecurePrint Agent minimized to background. Windows will continue processing print jobs automatically.");
                return;
            }

            base.OnClosing(e);
        }

        private void Log(string message)
        {
            Dispatcher.Invoke(() =>
            {
                var entry = $"[{DateTime.Now:HH:mm:ss}] {message}\n";
                TxtLogs.AppendText(entry);
                TxtLogs.ScrollToEnd();
            });
        }

        private void RefreshPrinters()
        {
            try
            {
                Log("Discovering physical Windows printers (virtual printers filtered)...");
                var printers = _spoolerService.DiscoverPrinters();

                // If shop has exactly one physical printer, ensure it is set as default
                if (printers.Count == 1)
                {
                    printers[0].IsDefault = true;
                }
                else if (printers.Count > 1 && !printers.Any(p => p.IsDefault))
                {
                    printers[0].IsDefault = true;
                }

                ListPrinters.ItemsSource = printers;
                Log($"Discovered {printers.Count} usable physical Windows printers.");

                var token = _config.GetDecryptedToken();
                if (!string.IsNullOrEmpty(token) && printers.Count > 0)
                {
                    Task.Run(async () =>
                    {
                        var ok = await _client.RegisterPrintersAsync(printers);
                        Dispatcher.Invoke(() => Log(ok ? "Printers synchronized with SecurePrint Cloud." : "Failed to sync printers."));
                    });
                }
            }
            catch (Exception ex)
            {
                Log($"Printer discovery error: {ex.Message}");
            }
        }

        private async void BtnPair_Click(object sender, RoutedEventArgs e)
        {
            var code = TxtPairingCode.Text.Trim();
            if (code.Length != 6)
            {
                MessageBox.Show("Please enter a valid 6-digit pairing code.", "Invalid Code", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            BtnPair.IsEnabled = false;
            TxtPairResult.Text = "Verifying code with cloud...";
            Log($"Attempting pairing with code: {code}");

            var (success, error, shopId, shopName) = await _client.PairAsync(code);

            BtnPair.IsEnabled = true;

            if (success)
            {
                TxtPairingTitle.Text = "Computer Connected";
                TxtPairingHelp.Text = $"Shop Name: {shopName ?? shopId} | Status: Connected & Online | Host: {_config.MachineName}";
                TxtPairResult.Text = $"Connected to {shopName ?? shopId}!";
                TxtPairResult.Foreground = System.Windows.Media.Brushes.LightGreen;
                TxtStatus.Text = "ONLINE";
                StatusBadge.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(20, 83, 45));
                Log($"Pairing successful. Shop Name: {shopName} (Shop ID: {shopId})");

                // Enable Windows auto-startup on boot
                AgentConfig.RegisterAutoStartup(true);

                RefreshPrinters();
                await DoHeartbeatAsync();
                await PollPendingJobsAsync();
            }
            else
            {
                TxtPairResult.Text = error ?? "Pairing failed.";
                TxtPairResult.Foreground = System.Windows.Media.Brushes.Red;
                Log($"Pairing error: {error}");
            }
        }

        private void BtnRefreshPrinters_Click(object sender, RoutedEventArgs e)
        {
            RefreshPrinters();
        }

        private void BtnTestPrint_Click(object sender, RoutedEventArgs e)
        {
            var selectedPrinter = ListPrinters.SelectedItem as PrinterInfoDto;
            if (selectedPrinter == null)
            {
                selectedPrinter = (ListPrinters.ItemsSource as System.Collections.Generic.List<PrinterInfoDto>)?.FirstOrDefault(p => p.IsDefault);
            }

            if (selectedPrinter == null)
            {
                MessageBox.Show("Please select a physical printer or ensure a default printer exists.", "No Printer Selected", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                Log($"Initiating REAL Windows Spooler test print on '{selectedPrinter.WindowsPrinterName}'...");

                // Create a clean test print document file
                var tempFile = Path.Combine(Path.GetTempPath(), $"SecurePrint_Test_{DateTime.Now:yyyyMMddHHmmss}.txt");
                File.WriteAllText(tempFile, $"========================================\n" +
                                            $"        SECUREPRINT TEST PRINT          \n" +
                                            $"========================================\n" +
                                            $"Printer: {selectedPrinter.WindowsPrinterName}\n" +
                                            $"Driver: {selectedPrinter.DriverName}\n" +
                                            $"Host Machine: {_config.MachineName}\n" +
                                            $"Timestamp: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n" +
                                            $"Installation ID: {_config.InstallationId}\n" +
                                            $"Status: Verified Real Physical Spooling\n" +
                                            $"========================================\n");

                var (success, status, err) = _spoolerService.SubmitAndTrackJob(
                    selectedPrinter.WindowsPrinterName,
                    tempFile,
                    copies: 1,
                    duplex: false,
                    color: false,
                    "SP-TEST",
                    Log
                );

                if (success)
                {
                    Log($"[SUCCESS] Real test document spooled successfully to '{selectedPrinter.WindowsPrinterName}'!");
                    MessageBox.Show($"Test document sent to '{selectedPrinter.WindowsPrinterName}'. Check your physical printer paper tray.", "Print Submitted", MessageBoxButton.OK, MessageBoxImage.Information);
                }
                else
                {
                    Log($"[ERROR] Test print failed on '{selectedPrinter.WindowsPrinterName}': {err}");
                    MessageBox.Show($"Test print error on '{selectedPrinter.WindowsPrinterName}': {err}", "Print Failed", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                Log($"Test print failed: {ex.Message}");
                MessageBox.Show($"Test print error: {ex.Message}", "Print Failed", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async Task DoHeartbeatAsync()
        {
            var token = _config.GetDecryptedToken();
            if (string.IsNullOrEmpty(token)) return;

            var ok = await _client.SendHeartbeatAsync();
            if (ok)
            {
                TxtStatus.Text = "ONLINE";
                TxtFooter.Text = $"Last heartbeat: {DateTime.Now:HH:mm:ss} - Cloud Connected";
            }
            else
            {
                TxtStatus.Text = "RECONNECTING";
                TxtFooter.Text = $"Heartbeat missed at {DateTime.Now:HH:mm:ss} - Retrying connection...";
            }
        }

        private async Task PollPendingJobsAsync()
        {
            var token = _config.GetDecryptedToken();
            if (string.IsNullOrEmpty(token) || _isProcessingJob) return;

            _isProcessingJob = true;
            try
            {
                var jobs = await _client.GetPendingJobsAsync();
                if (jobs == null || jobs.Count == 0) return;

                foreach (var job in jobs)
                {
                    Log($"[PRINT QUEUE] Received print job {job.JobCode} (Attempt {job.AttemptId})");
                    Log($"[PRINT QUEUE] Target printer: '{job.PrinterName}' | Copies: {job.Copies} | Duplex: {job.Duplex} | Color: {job.ColorMode}");

                    await _client.UpdateAttemptStatusAsync(job.AttemptId, "PRINTING", "Desktop Agent processing print job");

                    if (string.IsNullOrEmpty(job.FileDownloadUrl))
                    {
                        Log($"[ERROR] Job {job.JobCode} has no downloadable file URL.");
                        await _client.UpdateAttemptStatusAsync(job.AttemptId, "FAILED", "No downloadable file URL provided");
                        continue;
                    }

                    var ext = Path.GetExtension(job.FileName);
                    if (string.IsNullOrEmpty(ext)) ext = ".pdf";
                    var tempFilePath = Path.Combine(Path.GetTempPath(), $"SecurePrint_{job.JobCode}_{Guid.NewGuid():N}{ext}");

                    try
                    {
                        Log($"[DOWNLOAD] Downloading file '{job.FileName}' from cloud...");
                        await _client.DownloadDocumentAsync(job.FileDownloadUrl, tempFilePath);
                        Log($"[DOWNLOAD] Download complete. Ready for spooling.");

                        Log($"[SPOOLER] Submitting document to Windows Spooler on '{job.PrinterName}'...");
                        var isColor = string.Equals(job.ColorMode, "COLOR", StringComparison.OrdinalIgnoreCase);
                        var isDuplex = !string.Equals(job.Duplex, "NONE", StringComparison.OrdinalIgnoreCase);

                        var (success, status, err) = _spoolerService.SubmitAndTrackJob(
                            job.PrinterName,
                            tempFilePath,
                            job.Copies,
                            isDuplex,
                            isColor,
                            job.JobCode,
                            Log
                        );

                        if (success)
                        {
                            Log($"[SPOOLER] Job {job.JobCode} successfully completed Windows spooling to '{job.PrinterName}'!");
                            await _client.UpdateAttemptStatusAsync(job.AttemptId, "COMPLETED", "Spooler completed print job");
                            Log($"[SUCCESS] Job {job.JobCode} marked COMPLETED in SecurePrint Cloud.");
                        }
                        else if (status == "FAILED")
                        {
                            Log($"[ERROR] Job {job.JobCode} failed: {err}");
                            await _client.UpdateAttemptStatusAsync(job.AttemptId, "FAILED", err);
                        }
                        else
                        {
                            Log($"[WARN] Job {job.JobCode} status unknown: {err}");
                            await _client.UpdateAttemptStatusAsync(job.AttemptId, "SUBMISSION_UNKNOWN", err);
                        }
                    }
                    catch (Exception ex)
                    {
                        Log($"[ERROR] Failed to spool job {job.JobCode}: {ex.Message}");
                        await _client.UpdateAttemptStatusAsync(job.AttemptId, "FAILED", ex.Message);
                    }
                    finally
                    {
                        try
                        {
                            if (File.Exists(tempFilePath))
                            {
                                File.Delete(tempFilePath);
                            }
                        }
                        catch { }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"PollPendingJobs error: {ex.Message}");
            }
            finally
            {
                _isProcessingJob = false;
            }
        }
    }
}
